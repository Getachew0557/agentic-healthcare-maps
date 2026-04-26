# API Contract — Agentic Healthcare Maps

**Base URL (dev):** `http://localhost:8000`  
**API prefix:** `/api/v1`  
**Auth:** Bearer JWT — obtain from `POST /api/v1/auth/login`

---

## Health

### `GET /api/v1/health`

No auth required.

**Response `200`:**
```json
{
  "status": "ok",
  "database": "ok",
  "redis": "unavailable"
}
```

---

## Auth

### `POST /api/v1/auth/register`

**Request:**
```json
{
  "email": "staff@hospital.com",
  "password": "securepass123",
  "role": "hospital_staff",
  "hospital_id": 1
}
```

**Response `200`:**
```json
{ "id": 1, "email": "staff@hospital.com", "role": "hospital_staff", "hospital_id": 1 }
```

---

### `POST /api/v1/auth/login`

**Request:**
```json
{ "email": "staff@hospital.com", "password": "securepass123" }
```

**Response `200`:**
```json
{ "access_token": "eyJhbGci...", "token_type": "bearer" }
```

---

### `GET /api/v1/auth/me`

**Auth:** Bearer token required.

**Response `200`:**
```json
{ "id": 1, "email": "staff@hospital.com", "role": "hospital_staff", "hospital_id": 1 }
```

---

## Contact

### `POST /api/v1/contact`

No auth required.

**Request:**
```json
{
  "name": "Dr. Arjun Sharma",
  "email": "arjun@hospital.com",
  "subject": "Register our hospital",
  "message": "We would like to join the platform."
}
```

**Response `200`:**
```json
{
  "status": "received",
  "message": "Thank you for contacting us. We will respond within 24 hours."
}
```

---

## Patient

### `POST /api/v1/patient/triage`

No auth required. Supports English, Hindi, and all Gemini-supported languages.

**Request:**
```json
{ "symptoms_text": "My mother has sudden chest pain and difficulty breathing" }
```

**Response `200`:**
```json
{
  "specialty": "cardiology",
  "urgency": "emergency",
  "confidence": 0.78,
  "rationale": "⚠️ EMERGENCY WARNING: Call emergency services immediately. | Symptoms suggest possible cardiac/respiratory emergency.",
  "citations": [
    { "title": "AHA Guidelines on Chest Pain", "url": "https://www.heart.org/..." }
  ],
  "claims": [
    { "field": "specialty", "source": "gemini", "value": "cardiology" },
    { "field": "urgency", "source": "gemini", "value": "emergency" },
    { "field": "confidence", "source": "gemini", "value": "0.78" },
    { "field": "citations", "source": "tavily", "value": "1 sources" }
  ]
}
```

**Urgency values:** `normal` | `urgent` | `emergency`

---

### `POST /api/v1/patient/recommendations`

No auth required.

**Request:**
```json
{
  "specialty": "cardiology",
  "urgency": "emergency",
  "lat": 19.076,
  "lng": 72.8777,
  "radius_km": 50
}
```

**Response `200`:**
```json
{
  "results": [
    {
      "hospital": {
        "id": 1,
        "name": "Kokilaben Dhirubhai Ambani Hospital",
        "address": "Andheri West, Mumbai",
        "phone": "+91-22-30999999",
        "lat": 19.1197,
        "lng": 72.8397,
        "is_24x7": true,
        "status": "normal",
        "icu_total": 60,
        "icu_available": 18,
        "general_total": 450,
        "general_available": 120,
        "ventilators_available": 12,
        "specialties": ["cardiology", "neurology", "emergency"]
      },
      "distance_km": 4.2,
      "eta_minutes": 12.5,
      "score_breakdown": {
        "travel_score": 0.87,
        "specialty_score": 1.0,
        "bed_score": 0.9,
        "ventilator_score": 1.0,
        "total": 0.934
      },
      "doctors": [
        {
          "id": 1,
          "name": "Dr. Arjun Sharma",
          "specialty": "cardiology",
          "phone": null,
          "is_active": true,
          "room": {
            "id": 1,
            "room_code": "Cardio-101",
            "room_type": "consultation",
            "is_active": true,
            "valid_from": "2026-04-26T00:00:00Z",
            "valid_to": null
          }
        },
        {
          "id": 2,
          "name": "Dr. Sunita Patel",
          "specialty": "cardiology",
          "room": null
        }
      ],
      "claims": [
        { "field": "hospital_name", "source": "db", "value": "Kokilaben Dhirubhai Ambani Hospital" },
        { "field": "distance_km", "source": "tool", "value": "4.2" },
        { "field": "eta_minutes", "source": "ors", "value": "12.5" },
        { "field": "icu_available", "source": "db", "value": "18" },
        { "field": "doctor_1_room", "source": "db", "value": "Cardio-101" },
        { "field": "doctor_2_room", "source": "unavailable", "value": "Room not on file. Call +91-22-30999999 to confirm." }
      ]
    }
  ]
}
```

> **Anti-hallucination:** `doctor.room` is `null` when no active room assignment exists. The `claims` array shows the source of every field.

---

## Hospitals (Public)

### `GET /api/v1/hospitals`

Query params: `specialty`, `status`, `lat`, `lng`, `radius_km`, `limit`

**Response `200`:** Array of `HospitalOut`

---

### `GET /api/v1/hospitals/{id}`

**Response `200`:** Single `HospitalOut`

---

### `GET /api/v1/hospitals/{id}/specialties`

**Response `200`:**
```json
[{ "id": 1, "name": "cardiology" }, { "id": 2, "name": "emergency" }]
```

---

### `POST /api/v1/hospitals/{id}/specialties`

**Auth:** JWT (admin or own hospital_staff)

**Request:** `{ "name": "neurology" }`

**Response `201`:** `{ "id": 5, "name": "neurology" }`

---

### `DELETE /api/v1/hospitals/{id}/specialties/{specialty_id}`

**Auth:** JWT (admin or own hospital_staff)

**Response `204`**

---

## Doctors

### `GET /api/v1/hospitals/{id}/doctors`

Query params: `specialty`, `active_only` (default `true`)

**Response `200`:** Array of `DoctorOut` with `room` field (null if unassigned)

---

### `POST /api/v1/hospitals/{id}/doctors`

**Auth:** JWT (admin or own hospital_staff)

**Request:**
```json
{ "name": "Dr. Arjun Sharma", "specialty": "cardiology", "phone": null }
```

**Response `201`:** `DoctorOut` with `room: null`

---

### `PATCH /api/v1/hospitals/{id}/doctors/{doctor_id}`

**Auth:** JWT

**Request:** `{ "name": "Dr. Arjun Sharma", "is_active": true }`

**Response `200`:** Updated `DoctorOut`

---

### `DELETE /api/v1/hospitals/{id}/doctors/{doctor_id}`

**Auth:** JWT. Soft delete — sets `is_active=false`.

**Response `204`**

---

### `POST /api/v1/hospitals/{id}/doctors/{doctor_id}/room`

**Auth:** JWT

**Request:**
```json
{ "room_code": "Cardio-101", "room_type": "consultation" }
```

**Response `201`:** `RoomAssignmentOut`

---

### `DELETE /api/v1/hospitals/{id}/doctors/{doctor_id}/room`

**Auth:** JWT. Deactivates current room assignment.

**Response `204`**

---

## Admin — Availability

### `PATCH /api/v1/admin/hospitals/{id}/availability`

**Auth:** JWT (admin = any hospital; hospital_staff = own only)

**Request:**
```json
{
  "icu_available": 3,
  "general_available": 45,
  "ventilators_available": 2,
  "status": "busy"
}
```

**Response `200`:** Updated `HospitalOut`

**Side effects:** AvailabilityLog written + WebSocket broadcast

---

### `GET /api/v1/admin/hospitals/{id}/availability-logs`

**Auth:** JWT

**Response `200`:**
```json
[{
  "id": 42,
  "hospital_id": 1,
  "updated_by_user_id": 1,
  "field_name": "icu_available",
  "old_value": "5",
  "new_value": "3",
  "created_at": "2026-04-26T10:30:00Z"
}]
```

---

## Admin — Hospital CRUD

### `GET /api/v1/admin/hospitals`

**Auth:** JWT (admin only). Query: `search`, `status`, `limit`, `offset`

---

### `POST /api/v1/admin/hospitals`

**Auth:** JWT (admin only)

**Request:** `HospitalCreate` (name, address, lat, lng, specialties[], bed counts)

**Response `201`:** `HospitalOut`

---

### `GET /api/v1/admin/hospitals/{id}`

**Auth:** JWT (admin only)

---

### `PATCH /api/v1/admin/hospitals/{id}`

**Auth:** JWT (admin only). Request: `HospitalUpdate` (any fields optional)

---

### `DELETE /api/v1/admin/hospitals/{id}`

**Auth:** JWT (admin only). Cascades to doctors, specialties, logs.

**Response `204`**

---

### `GET /api/v1/admin/hospitals/me`

**Auth:** JWT (hospital_staff). Returns own hospital.

---

### `PATCH /api/v1/admin/hospitals/me`

**Auth:** JWT (hospital_staff). Update own hospital profile.

---

## Admin — User Management

### `GET /api/v1/admin/users`

**Auth:** JWT (admin only). Query: `role`, `hospital_id`, `limit`, `offset`

---

### `GET /api/v1/admin/users/{id}`

**Auth:** JWT (admin only)

---

### `PATCH /api/v1/admin/users/{id}`

**Auth:** JWT (admin only)

**Request:** `{ "role": "admin", "hospital_id": 1 }`

---

### `DELETE /api/v1/admin/users/{id}`

**Auth:** JWT (admin only). Cannot delete yourself.

**Response `204`**

---

## Admin — Governance

### `GET /api/v1/admin/audit`

**Auth:** JWT (admin only). Query: `hospital_id`, `field_name`, `limit`, `offset`

Returns all availability changes across all hospitals.

---

### `GET /api/v1/admin/metrics`

**Auth:** JWT (admin only)

**Response `200`:**
```json
{
  "hospitals": { "total": 284, "status_normal": 270, "status_busy": 10, "status_emergency_only": 4 },
  "users": { "total": 15 },
  "audit_logs": { "total": 342 },
  "vector_index": { "indexed_hospitals": 284, "collection": "hospitals", "model": "all-MiniLM-L6-v2" },
  "recent_changes": [...]
}
```

---

### `GET /api/v1/admin/sessions`

**Auth:** JWT (admin only). All patient chat sessions.

---

### `GET /api/v1/admin/sessions/{id}/messages`

**Auth:** JWT (admin only). Messages with tool calls and citations.

---

### `GET /api/v1/admin/traces`

**Auth:** JWT (admin only). AI agent traces with tools called, retrievals, claims, safety flags.

---

### `POST /api/v1/admin/vector/reindex`

**Auth:** JWT (admin only). Rebuilds Chroma index from PostgreSQL.

---

## Ingest

### `POST /api/v1/admin/ingest`

**Auth:** JWT (admin only)

**Form data:** `file` (multipart upload) + `confirm` query param (default `false`)

**Supported formats:** `.csv`, `.json`, `.xlsx`, `.xls`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.tiff`

**Response `200` (preview, confirm=false):**
```json
{
  "filename": "hospitals.csv",
  "total_parsed": 284,
  "total_inserted": 0,
  "total_skipped": 0,
  "preview": [...first 10 records...],
  "message": "Preview only — 284 records parsed. Call again with confirm=true to insert."
}
```

**Response `200` (confirmed, confirm=true):**
```json
{
  "filename": "hospitals.csv",
  "total_parsed": 284,
  "total_inserted": 231,
  "total_skipped": 53,
  "preview": [...],
  "message": "Successfully inserted 231 hospitals. 53 skipped (already exist). Vector index updated."
}
```

---

## WebSocket

### `WS /api/v1/ws/availability`

No auth required. Connect to receive live availability updates.

**Event payload:**
```json
{
  "event": "availability_update",
  "hospital_id": 1,
  "icu_available": 3,
  "general_available": 45,
  "ventilators_available": 2,
  "status": "busy"
}
```

**Test with wscat:**
```bash
npx wscat -c ws://localhost:8000/api/v1/ws/availability
```

---

## Error Responses

| Status | Meaning |
|---|---|
| `401` | Missing or invalid Bearer token |
| `403` | Insufficient role (e.g. hospital_staff accessing admin endpoint) |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate email or hospital name) |
| `422` | Validation error (negative value, exceeds total, invalid status) |

---

## Scoring Formula (Recommendations)

```
score = W_travel × travel_score
      + W_specialty × specialty_score
      + W_bed × bed_score
      + W_ventilator × ventilator_score
```

| Urgency | Travel | Specialty | Beds | Ventilators |
|---|---|---|---|---|
| `emergency` | 55% | 25% | 15% | 5% |
| `urgent` | 40% | 35% | 20% | 5% |
| `normal` | 30% | 40% | 25% | 5% |
