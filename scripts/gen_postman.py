"""Generate docs/postman_collection.json — run from repo root."""
import json
import os

collection = {
    "info": {
        "name": "Agentic Healthcare Maps API",
        "description": (
            "Complete API collection for Agentic Healthcare Maps.\n\n"
            "## Setup\n"
            "1. Import into Postman\n"
            "2. Set base_url variable to http://localhost:8000\n"
            "3. Call Login — token auto-saved to {{token}}\n\n"
            "Decision-support only. Not a medical diagnosis."
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        "_postman_id": "agentic-healthcare-maps-v1",
    },
    "variable": [
        {"key": "base_url", "value": "http://localhost:8000", "type": "string"},
        {"key": "token", "value": "", "type": "string"},
        {"key": "hospital_id", "value": "1", "type": "string"},
        {"key": "specialty_id", "value": "1", "type": "string"},
    ],
    "auth": {
        "type": "bearer",
        "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}],
    },
    "item": [
        # ------------------------------------------------------------------ Health
        {
            "name": "Health",
            "item": [
                {
                    "name": "Health Check (DB + Redis)",
                    "request": {
                        "method": "GET",
                        "url": "{{base_url}}/api/v1/health",
                        "description": (
                            "Returns health status of API, PostgreSQL, and Redis.\n\n"
                            "- status: ok | degraded\n"
                            "- database: ok | error\n"
                            "- redis: ok | unavailable (non-fatal)"
                        ),
                    },
                    "response": [
                        {
                            "name": "All OK",
                            "status": "OK",
                            "code": 200,
                            "body": '{"status": "ok", "database": "ok", "redis": "ok"}',
                        },
                        {
                            "name": "Redis unavailable",
                            "status": "OK",
                            "code": 200,
                            "body": '{"status": "degraded", "database": "ok", "redis": "unavailable"}',
                        },
                    ],
                }
            ],
        },
        # ------------------------------------------------------------------ Auth
        {
            "name": "Auth",
            "item": [
                {
                    "name": "Register",
                    "request": {
                        "method": "POST",
                        "url": "{{base_url}}/api/v1/auth/register",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": json.dumps({
                                "email": "staff@hospital.com",
                                "password": "securepass123",
                                "role": "hospital_staff",
                                "hospital_id": 1,
                            }, indent=2),
                        },
                        "description": "Create account. role: hospital_staff or admin. hospital_id required for hospital_staff.",
                    },
                    "response": [
                        {"name": "200 OK", "status": "OK", "code": 200,
                         "body": '{"id": 1, "email": "staff@hospital.com", "role": "hospital_staff", "hospital_id": 1}'},
                        {"name": "409 Email exists", "status": "Conflict", "code": 409,
                         "body": '{"detail": "Email already registered"}'},
                    ],
                },
                {
                    "name": "Login (auto-saves token)",
                    "event": [{
                        "listen": "test",
                        "script": {
                            "exec": [
                                "const j = pm.response.json();",
                                "if (j.access_token) {",
                                "  pm.collectionVariables.set('token', j.access_token);",
                                "  console.log('Token saved');",
                                "}",
                            ],
                            "type": "text/javascript",
                        },
                    }],
                    "request": {
                        "method": "POST",
                        "url": "{{base_url}}/api/v1/auth/login",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": json.dumps({"email": "staff@hospital.com", "password": "securepass123"}, indent=2),
                        },
                        "description": "JWT token auto-saved to {{token}} via test script.",
                    },
                    "response": [
                        {"name": "200 OK", "status": "OK", "code": 200,
                         "body": '{"access_token": "eyJhbGci...", "token_type": "bearer"}'},
                        {"name": "401 Invalid", "status": "Unauthorized", "code": 401,
                         "body": '{"detail": "Invalid credentials"}'},
                    ],
                },
                {
                    "name": "Get Current User (me)",
                    "request": {
                        "method": "GET",
                        "url": "{{base_url}}/api/v1/auth/me",
                        "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                        "description": "Returns profile of the authenticated user.",
                    },
                },
            ],
        },
        # ------------------------------------------------------------------ Patient
        {
            "name": "Patient",
            "item": [
                {
                    "name": "Triage — English",
                    "request": {
                        "method": "POST",
                        "url": "{{base_url}}/api/v1/patient/triage",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": json.dumps({"symptoms_text": "My mother has sudden chest pain and difficulty breathing"}, indent=2),
                        },
                        "description": "AI triage via Gemini + Tavily citations. No auth required.",
                    },
                    "response": [{
                        "name": "200 OK",
                        "status": "OK",
                        "code": 200,
                        "body": json.dumps({
                            "specialty": "cardiology",
                            "urgency": "emergency",
                            "confidence": 0.78,
                            "rationale": "Symptoms suggest possible cardiac/respiratory emergency.",
                            "citations": [{"title": "AHA Guidelines", "url": "https://www.heart.org"}],
                        }, indent=2),
                    }],
                },
                {
                    "name": "Triage — Hindi",
                    "request": {
                        "method": "POST",
                        "url": "{{base_url}}/api/v1/patient/triage",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": json.dumps({"symptoms_text": "मेरी माँ को सीने में दर्द और सांस लेने में तकलीफ हो रही है"}, indent=2, ensure_ascii=False),
                        },
                        "description": "Gemini handles Hindi natively.",
                    },
                },
                {
                    "name": "Triage — Fallback (no API keys)",
                    "request": {
                        "method": "POST",
                        "url": "{{base_url}}/api/v1/patient/triage",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {"mode": "raw", "raw": json.dumps({"symptoms_text": "high fever for 2 days"}, indent=2)},
                        "description": "Works without API keys — deterministic fallback.",
                    },
                },
                {
                    "name": "Hospital Recommendations",
                    "request": {
                        "method": "POST",
                        "url": "{{base_url}}/api/v1/patient/recommendations",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": json.dumps({
                                "specialty": "cardiology",
                                "urgency": "emergency",
                                "lat": 19.076,
                                "lng": 72.8777,
                                "radius_km": 50,
                            }, indent=2),
                        },
                        "description": "Top 3 hospitals ranked by weighted score. Call /triage first, pass specialty+urgency here.",
                    },
                },
            ],
        },
        # ------------------------------------------------------------------ Hospitals
        {
            "name": "Hospitals",
            "item": [
                {
                    "name": "List All Hospitals",
                    "request": {
                        "method": "GET",
                        "url": {
                            "raw": "{{base_url}}/api/v1/hospitals",
                            "host": ["{{base_url}}"],
                            "path": ["api", "v1", "hospitals"],
                            "query": [
                                {"key": "specialty", "value": "", "disabled": True, "description": "Partial match"},
                                {"key": "status", "value": "", "disabled": True, "description": "normal|busy|emergency_only"},
                                {"key": "lat", "value": "", "disabled": True, "description": "Patient latitude"},
                                {"key": "lng", "value": "", "disabled": True, "description": "Patient longitude"},
                                {"key": "radius_km", "value": "50", "disabled": True, "description": "Radius (requires lat+lng)"},
                                {"key": "limit", "value": "200", "disabled": True},
                            ],
                        },
                        "description": "All hospitals. Filters: specialty, status, geo (lat+lng+radius_km), limit.",
                    },
                },
                {
                    "name": "List Hospitals — Specialty Filter",
                    "request": {
                        "method": "GET",
                        "url": {
                            "raw": "{{base_url}}/api/v1/hospitals?specialty=cardiology",
                            "host": ["{{base_url}}"],
                            "path": ["api", "v1", "hospitals"],
                            "query": [{"key": "specialty", "value": "cardiology"}],
                        },
                    },
                },
                {
                    "name": "List Hospitals — Status Filter",
                    "request": {
                        "method": "GET",
                        "url": {
                            "raw": "{{base_url}}/api/v1/hospitals?status=normal",
                            "host": ["{{base_url}}"],
                            "path": ["api", "v1", "hospitals"],
                            "query": [{"key": "status", "value": "normal"}],
                        },
                    },
                },
                {
                    "name": "List Hospitals — Geo Filter (Mumbai 50km)",
                    "request": {
                        "method": "GET",
                        "url": {
                            "raw": "{{base_url}}/api/v1/hospitals?lat=19.076&lng=72.877&radius_km=50",
                            "host": ["{{base_url}}"],
                            "path": ["api", "v1", "hospitals"],
                            "query": [
                                {"key": "lat", "value": "19.076"},
                                {"key": "lng", "value": "72.877"},
                                {"key": "radius_km", "value": "50"},
                            ],
                        },
                        "description": "Returns only hospitals within 50 km of Mumbai using haversine distance.",
                    },
                },
                {
                    "name": "Get Hospital by ID",
                    "request": {
                        "method": "GET",
                        "url": "{{base_url}}/api/v1/hospitals/{{hospital_id}}",
                        "description": "Full details for one hospital.",
                    },
                    "response": [
                        {"name": "404", "status": "Not Found", "code": 404, "body": '{"detail": "Hospital not found"}'},
                    ],
                },
                {
                    "name": "List Specialties",
                    "request": {
                        "method": "GET",
                        "url": "{{base_url}}/api/v1/hospitals/{{hospital_id}}/specialties",
                        "description": "All specialties for a hospital.",
                    },
                    "response": [
                        {"name": "200 OK", "status": "OK", "code": 200,
                         "body": '[{"id": 1, "name": "cardiology"}, {"id": 2, "name": "emergency"}]'},
                    ],
                },
                {
                    "name": "Add Specialty",
                    "request": {
                        "method": "POST",
                        "url": "{{base_url}}/api/v1/hospitals/{{hospital_id}}/specialties",
                        "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {"mode": "raw", "raw": json.dumps({"name": "neurology"}, indent=2)},
                        "description": "Add specialty. Requires JWT (admin or own hospital_staff). Idempotent.",
                    },
                    "response": [
                        {"name": "201 Created", "status": "Created", "code": 201, "body": '{"id": 5, "name": "neurology"}'},
                        {"name": "401 Unauthorized", "status": "Unauthorized", "code": 401, "body": '{"detail": "Missing bearer token"}'},
                        {"name": "403 Forbidden", "status": "Forbidden", "code": 403, "body": '{"detail": "hospital_staff can only update their own hospital"}'},
                    ],
                },
                {
                    "name": "Delete Specialty",
                    "request": {
                        "method": "DELETE",
                        "url": "{{base_url}}/api/v1/hospitals/{{hospital_id}}/specialties/{{specialty_id}}",
                        "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                        "description": "Remove specialty. Requires JWT (admin or own hospital_staff).",
                    },
                    "response": [
                        {"name": "204 Deleted", "status": "No Content", "code": 204, "body": ""},
                        {"name": "404 Not Found", "status": "Not Found", "code": 404, "body": '{"detail": "Specialty not found"}'},
                    ],
                },
            ],
        },
        # ------------------------------------------------------------------ Admin
        {
            "name": "Admin",
            "item": [
                {
                    "name": "Update Availability — ICU + Status",
                    "request": {
                        "method": "PATCH",
                        "url": "{{base_url}}/api/v1/admin/hospitals/{{hospital_id}}/availability",
                        "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {"mode": "raw", "raw": json.dumps({"icu_available": 3, "status": "busy"}, indent=2)},
                        "description": (
                            "Update bed availability. Triggers WebSocket broadcast.\n\n"
                            "- hospital_staff: own hospital only\n"
                            "- admin: any hospital\n\n"
                            "Validation: values >= 0, available <= total."
                        ),
                    },
                    "response": [
                        {"name": "200 OK", "status": "OK", "code": 200, "body": '{"id": 1, "icu_available": 3, "status": "busy"}'},
                        {"name": "422 Exceeds total", "status": "Unprocessable Entity", "code": 422,
                         "body": '{"detail": "icu_available (999) cannot exceed icu_total (10)"}'},
                        {"name": "403 Wrong hospital", "status": "Forbidden", "code": 403,
                         "body": '{"detail": "hospital_staff can only update their own hospital"}'},
                    ],
                },
                {
                    "name": "Update Availability — General + Ventilators",
                    "request": {
                        "method": "PATCH",
                        "url": "{{base_url}}/api/v1/admin/hospitals/{{hospital_id}}/availability",
                        "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {"mode": "raw", "raw": json.dumps({"general_available": 45, "ventilators_available": 2}, indent=2)},
                    },
                },
                {
                    "name": "Get Availability Logs",
                    "request": {
                        "method": "GET",
                        "url": {
                            "raw": "{{base_url}}/api/v1/admin/hospitals/{{hospital_id}}/availability-logs?limit=20",
                            "host": ["{{base_url}}"],
                            "path": ["api", "v1", "admin", "hospitals", "{{hospital_id}}", "availability-logs"],
                            "query": [{"key": "limit", "value": "20"}],
                        },
                        "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                        "description": "Audit trail of availability changes, newest first.",
                    },
                    "response": [{
                        "name": "200 OK",
                        "status": "OK",
                        "code": 200,
                        "body": json.dumps([{
                            "id": 42, "hospital_id": 1, "updated_by_user_id": 1,
                            "field_name": "icu_available", "old_value": "5", "new_value": "3",
                            "created_at": "2026-04-26T10:30:00Z",
                        }], indent=2),
                    }],
                },
            ],
        },
        # ------------------------------------------------------------------ WebSocket
        {
            "name": "WebSocket",
            "item": [{
                "name": "Availability WebSocket",
                "request": {
                    "method": "GET",
                    "url": "ws://localhost:8000/api/v1/ws/availability",
                    "description": (
                        "Connect to receive live availability events.\n\n"
                        "Event shape:\n"
                        '{"event": "availability_update", "hospital_id": 1, '
                        '"icu_available": 3, "general_available": 45, '
                        '"ventilators_available": 2, "status": "busy"}\n\n'
                        "Test with wscat:\n"
                        "npx wscat -c ws://localhost:8000/api/v1/ws/availability"
                    ),
                },
            }],
        },
    ],
}

out_path = os.path.join(os.path.dirname(__file__), "..", "docs", "postman_collection.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print(f"Written to {os.path.abspath(out_path)}")
