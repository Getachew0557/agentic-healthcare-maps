# Architecture — Agentic Healthcare Maps

## Overview

Three role-based interfaces backed by a single FastAPI service:

| Interface | Users | Purpose |
|---|---|---|
| Patient | Public | Symptom input → hospital recommendations + map |
| Hospital Dashboard | hospital_staff | Update beds, manage doctors, assign rooms |
| Admin Panel | admin | Audit logs, agent traces, user/hospital management |

---

## System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     React + Vite + TypeScript                 │
│                                                              │
│  Patient Chat UI        Hospital Dashboard     Admin Panel   │
│  ─────────────          ───────────────────    ───────────   │
│  Symptom input          Bed +/- controls       Audit table   │
│  Hospital map           Doctor CRUD            Trace viewer  │
│  Recommendation cards   Room assignment        Metrics       │
│  WebSocket listener     WebSocket updates      User mgmt     │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTP + WebSocket
┌──────────────────────────────▼───────────────────────────────┐
│                    FastAPI (Python 3.11)                       │
│                                                              │
│  Routes (39 endpoints across 11 route files)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ /patient │ │/hospitals│ │ /doctors │ │ /admin/*       │  │
│  │ /auth    │ │ /contact │ │ /ingest  │ │ /ws/avail.     │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
│                                                              │
│  Services                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ gemini   │ │ tavily   │ │ ranking  │ │ vector/        │  │
│  │ triage   │ │ citations│ │ haversine│ │ embeddings     │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ ocr/     │ │ realtime/│ │ trace_   │                     │
│  │ parser   │ │ ws_mgr   │ │ logger   │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
  PostgreSQL       Chroma         Redis
  (7 tables)    (RAG index)    (pub/sub)
       │              │
  Gemini API    all-MiniLM-L6-v2
  Tavily API    (384-dim embeddings)
  ORS API
```

---

## Data Flow

### 1. Patient Triage + Recommendations

```
Patient types symptoms
        │
        ▼
POST /patient/triage
        │
        ├─► Gemini 1.5 Flash (REST)
        │     └─► specialty, urgency, confidence, rationale
        │
        ├─► Tavily Search API
        │     └─► citations (PubMed, WHO, Mayo Clinic)
        │
        ├─► Emergency keyword check
        │     └─► prepend warning if chest pain / difficulty breathing
        │
        └─► TriageResponse + claims array
                │
                ▼
POST /patient/recommendations
        │
        ├─► SQL: load all hospitals from PostgreSQL
        │
        ├─► Haversine filter: hospitals within radius_km
        │
        ├─► Weighted scoring:
        │     travel_score × W_travel
        │   + specialty_score × W_specialty
        │   + bed_score × W_bed
        │   + ventilator_score × W_ventilator
        │
        ├─► Chroma RAG re-rank (semantic similarity)
        │     └─► query_embeddings vs hospital documents
        │
        ├─► ORS ETA (optional, graceful fallback)
        │
        ├─► Doctor lookup (DB only, anti-hallucination)
        │     └─► room = null if no active assignment
        │
        └─► RecommendationResponse + claims array
```

### 2. Hospital Availability Update

```
Hospital staff clicks +/- on dashboard
        │
        ▼
PATCH /admin/hospitals/{id}/availability
        │
        ├─► Validate: available ≤ total, no negatives
        │
        ├─► Write to PostgreSQL (hospitals table)
        │
        ├─► Write AvailabilityLog (audit trail)
        │
        ├─► Chroma re-index (update hospital document)
        │
        ├─► broadcast_availability_update()
        │     ├─► Direct in-process WebSocket fan-out
        │     └─► Redis PUBLISH (multi-worker)
        │
        └─► Patient map markers update instantly
```

### 3. File Ingestion (OCR Pipeline)

```
Admin uploads file
        │
        ▼
POST /admin/ingest?confirm=false
        │
        ├─► parse_file(filename, content)
        │     ├─► .csv  → parse_csv()
        │     ├─► .json → parse_json()
        │     ├─► .xlsx → parse_excel() (pandas)
        │     ├─► .pdf  → pdf2image → Tesseract OCR → text_to_hospital()
        │     └─► .jpg/.png → Tesseract OCR → text_to_hospital()
        │
        └─► Preview response (no DB write)

POST /admin/ingest?confirm=true
        │
        ├─► Insert into PostgreSQL (idempotent)
        ├─► Create HospitalSpecialty rows
        └─► Chroma index_hospital() for each new record
```

---

## Database Schema

```
hospitals
  id, name, address, phone, lat, lng
  is_24x7, status (normal/busy/emergency_only)
  icu_total, icu_available
  general_total, general_available
  ventilators_available

hospital_specialties
  id, hospital_id → hospitals, name

users
  id, email, password_hash
  role (admin/hospital_staff)
  hospital_id → hospitals

doctors
  id, hospital_id → hospitals
  name, specialty, phone, is_active

doctor_room_assignments
  id, doctor_id → doctors, hospital_id → hospitals
  room_code, room_type, is_active
  valid_from, valid_to

availability_logs
  id, hospital_id → hospitals
  updated_by_user_id → users
  field_name, old_value, new_value, created_at

chat_sessions / chat_messages / agent_traces
  (AI governance — admin visibility)
```

---

## Anti-Hallucination Contract

Every patient-facing response includes a `claims` array:

```json
{
  "claims": [
    { "field": "hospital_name", "source": "db", "value": "City Hospital" },
    { "field": "doctor_1_room", "source": "db", "value": "Cardio-101" },
    { "field": "doctor_2_room", "source": "unavailable",
      "value": "Room not on file. Call hospital to confirm." }
  ]
}
```

**Rules:**
1. Doctor room numbers are only shown when `doctor_room_assignments.is_active = true`
2. If no active room: response uses template `"Room: not on file. Call {phone} to confirm."`
3. AI (Gemini) may only rephrase tool outputs — it cannot introduce new proper nouns or numbers
4. Every AI invocation is logged to `agent_traces` for admin audit

---

## Real-Time Architecture

```
Hospital Dashboard (browser)
        │
        │ PATCH /admin/hospitals/{id}/availability
        ▼
FastAPI route handler
        │
        ├─► PostgreSQL write
        ├─► AvailabilityLog write
        │
        └─► broadcast_availability_update()
              │
              ├─► ConnectionManager.broadcast()  ← direct in-process
              │     └─► all connected WebSocket clients
              │
              └─► Redis PUBLISH "availability"   ← multi-worker
                    └─► redis_subscriber task
                          └─► ConnectionManager.broadcast()

Patient Browser (WebSocket client)
        │
        ├─► receives event payload
        └─► TanStack Query invalidation → map markers refresh
```

Redis is optional — if unavailable, direct in-process broadcast handles single-worker deployments.

---

## Vector Search (RAG)

**Model:** `all-MiniLM-L6-v2` (384-dim, ~90MB, runs on CPU)

**Document format per hospital:**
```
"Kokilaben Dhirubhai Ambani Hospital is a hospital located at
Andheri West, Mumbai. Medical specialties: Cardiology, Neurology,
Emergency. Status: normal. Available beds: 138 (ICU: 18, General: 120).
Ventilators available: 12. Open 24 hours, 7 days a week."
```

**Hybrid retrieval:**
1. SQL haversine filter → candidate IDs within `radius_km`
2. Chroma `collection.query(ids=candidate_ids)` → cosine similarity re-rank
3. Final results ordered by combined weighted score + semantic similarity

**Index management:**
- Built on startup from PostgreSQL
- Updated on every availability PATCH
- Rebuilt via `POST /admin/vector/reindex` or `python scripts/build_vector_index.py`
