# API Contract (Draft)

This is a starter contract to keep frontend/backend aligned.

## Base

- Base URL (dev): `http://localhost:8000`
- API prefix: `/api/v1`

## Health

### `GET /api/v1/health`

Response:

```json
{ "status": "ok" }
```

## Patient

### `POST /api/v1/patient/triage`

Request:

```json
{ "symptoms_text": "मेरी माँ को सीने में दर्द..." }
```

Response:

```json
{
  "specialty": "cardiology",
  "urgency": "emergency",
  "citations": [
    { "title": "Example source", "url": "https://example.com" }
  ]
}
```

### `POST /api/v1/patient/recommendations`

Request:

```json
{
  "specialty": "cardiology",
  "urgency": "emergency",
  "lat": 19.076,
  "lng": 72.8777
}
```

Response:

```json
{
  "results": [
    {
      "hospital_id": "uuid",
      "name": "Example Hospital",
      "phone": "+91...",
      "distance_km": 4.2,
      "eta_minutes": 12,
      "availability": { "icu_available": 2, "general_available": 8 },
      "specialties": ["cardiology", "emergency"],
      "location": { "lat": 19.07, "lng": 72.88 }
    }
  ]
}
```

## Admin

### `POST /api/v1/auth/login`

Request:

```json
{ "email": "admin@hospital.org", "password": "..." }
```

Response:

```json
{ "access_token": "jwt", "token_type": "bearer" }
```

### `PATCH /api/v1/admin/hospitals/{hospital_id}/availability`

Request:

```json
{
  "icu_available": 1,
  "general_available": 7,
  "ventilators_available": 2,
  "status": "busy"
}
```

