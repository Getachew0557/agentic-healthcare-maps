# 🏥 Agentic Healthcare Maps

**AI Hack Nation 2026 – Global AI Hackathon**  
Submitted by: **Team Getachew0557**  
Repository: https://github.com/Getachew0557/agentic-healthcare-maps  
License: **MIT**

> No family should travel hours only to find the help they need isn't there.

---

## What It Does

Agentic Healthcare Maps turns messy, fragmented hospital records into a living, real-time map of healthcare availability.

- **Patients** describe symptoms in plain language (English, Hindi, or any language) → AI identifies the required specialty → ranked hospital recommendations with doctor names and room numbers
- **Hospital staff** update bed availability, manage doctors, and assign rooms through a secure professional dashboard
- **Admins** view full audit trails, agent traces, and governance logs

**Total cost: $0** — Google Gemini free tier, Tavily hackathon credits, all open-source infrastructure.

---

## Quick Start

### Prerequisites

- Python 3.11+ with `agentic_env` conda environment
- PostgreSQL 14+ running locally
- Node.js 18+

### Backend

```bash
conda activate agentic_env
cd backend
cp .env.example .env          # add your API keys
alembic upgrade heads          # create DB tables
python scripts/seed.py         # seed 53 hospitals
python scripts/import_csv.py   # load 284 real hospitals from CSV
python scripts/seed_doctors.py # seed demo doctors
python scripts/build_vector_index.py  # build Chroma RAG index
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Postman: import `docs/postman_collection.json`

---

## Architecture

```
Patient Browser          Hospital Dashboard        Admin Panel
      │                        │                       │
      ▼                        ▼                       ▼
┌─────────────────────────────────────────────────────────┐
│                    React + Vite + TypeScript             │
│         Leaflet Map │ TanStack Query │ WebSocket hook    │
└─────────────────────────────┬───────────────────────────┘
                              │ HTTP / WebSocket
┌─────────────────────────────▼───────────────────────────┐
│                    FastAPI (Python 3.11)                  │
│  /patient/triage    /patient/recommendations             │
│  /hospitals/*       /admin/hospitals/*                   │
│  /admin/users/*     /admin/ingest    /contact            │
│  /admin/audit       /admin/traces    /ws/availability    │
└──────┬──────────────────┬──────────────────┬────────────┘
       │                  │                  │
  PostgreSQL           Chroma            Redis
  (7 tables)        (RAG index)       (pub/sub)
       │                  │
  Gemini API          all-MiniLM-L6-v2
  Tavily API          (sentence-transformers)
  ORS API
```

---

## Technology Stack

| Layer | Technology | Cost |
|---|---|---|
| AI Triage | Google Gemini 1.5 Flash | Free (60 req/min) |
| Medical Search | Tavily API | Free (hackathon credits) |
| Vector Search | Chroma + all-MiniLM-L6-v2 | Open source |
| OCR | Tesseract + pytesseract | Open source |
| Backend | FastAPI + Python 3.11 | Open source |
| Database | PostgreSQL 17 | Open source |
| Cache / Realtime | Redis | Open source |
| Frontend | React 18 + Vite + TypeScript | Open source |
| Maps | Leaflet + OpenStreetMap | Free |
| Routing | OpenRouteService | Free tier |
| Auth | JWT + bcrypt | Open source |

**Total hackathon cost: $0.00**

---

## API Summary (39 endpoints)

| Group | Endpoints |
|---|---|
| Health | `GET /health` |
| Auth | register, login, me |
| Contact | `POST /contact` (public) |
| Patient | triage, recommendations |
| Hospitals (public) | list, get, specialties CRUD |
| Doctors | list, create, update, delete, room assign/remove |
| Admin — Availability | PATCH availability, GET logs |
| Admin — Hospital CRUD | list, create, get, update, delete + staff self-service |
| Admin — Users | list, get, update, delete |
| Admin — Governance | audit, metrics, sessions, traces, vector reindex |
| Ingest | `POST /ingest` (CSV/JSON/Excel/PDF/Image + OCR) |
| Realtime | WebSocket `/ws/availability` |

---

## Key Features

### Anti-Hallucination Contract
Every AI response includes a `claims` array declaring the source of each field (`db`, `tool`, `fallback`, `unavailable`). Doctor room numbers are only shown when they exist in the database — the AI never invents them.

### RAG Hybrid Retrieval
Hospital recommendations use a two-stage pipeline:
1. SQL geo filter (haversine) → candidate hospitals within radius
2. Chroma vector re-rank → semantic similarity to symptom query

### Real-Time Updates
Hospital staff update bed counts → PostgreSQL write → Redis pub/sub → WebSocket broadcast → patient map updates instantly.

### OCR Ingestion
Upload PDFs, images of handwritten registers, CSVs, JSON, or Excel files. Tesseract OCR extracts hospital data. Preview before confirming DB insert.

---

## Project Structure

```
agentic-healthcare-maps/
├── backend/
│   ├── app/
│   │   ├── api/v1/routes/     # 11 route files
│   │   ├── core/              # config, auth, security
│   │   ├── db/                # base, session, models
│   │   ├── models/            # 7 SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # gemini, tavily, ranking, vector, ocr, realtime
│   │   └── tests/             # 67 tests
│   ├── alembic/               # 3 migrations
│   ├── data/                  # healthcare_living_map_FINAL.csv (284 hospitals)
│   └── scripts/               # seed, import, build_index
├── frontend/
│   └── src/
│       ├── api/               # axios clients
│       ├── pages/             # patient, admin
│       └── routes/            # React Router
├── docs/
│   ├── API_CONTRACT.md
│   ├── ARCHITECTURE.md
│   └── postman_collection.json
└── docker-compose.yml         # PostgreSQL + Redis
```

---

## Running Tests

```bash
conda activate agentic_env
cd backend
python -m pytest app/tests/ -v
# 67 passed
```

---

## API Keys (All Free)

| Key | Where to get |
|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com — free tier, 60 req/min |
| `TAVILY_API_KEY` | https://tavily.com — hackathon code `TVLY-HF9ETJRW` |
| `ORS_API_KEY` | https://openrouteservice.org/dev/#/signup — free tier |
