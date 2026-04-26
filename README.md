# 🏥 Agentic Healthcare Maps

**AI Hack Nation 2026 – Global AI Hackathon**  
Submitted by: **Team Getachew0557**  
Repository: https://github.com/Getachew0557/agentic-healthcare-maps  
License: **MIT**

![CI](https://github.com/Getachew0557/agentic-healthcare-maps/actions/workflows/ci.yml/badge.svg)
![Docker Build](https://github.com/Getachew0557/agentic-healthcare-maps/actions/workflows/docker-build.yml/badge.svg)
![Lint](https://github.com/Getachew0557/agentic-healthcare-maps/actions/workflows/lint.yml/badge.svg)

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

- Docker + Docker Compose (for Option A)
- Python 3.11+ with `agentic_env` conda environment (for Option B)
- PostgreSQL 14+ running locally (for Option B)
- Node.js 18+ (for Option B)

---

### Option A — Docker Compose (recommended, one command)

The entire stack — PostgreSQL, Redis, Backend API, Frontend — runs in containers. Migrations and seed data load automatically on first run.

**1. Clone and configure:**
```bash
git clone https://github.com/Getachew0557/agentic-healthcare-maps.git
cd agentic-healthcare-maps
cp .env.docker .env
```

**2. Edit `.env` and add your API keys:**
```env
GEMINI_API_KEY=your_key_from_aistudio.google.com
TAVILY_API_KEY=your_key_from_tavily.com
ORS_API_KEY=your_key_from_openrouteservice.org
JWT_SECRET=change_me_to_a_long_random_string
```

**3. Start everything:**
```bash
docker compose up -d
```

**4. Watch the first-run setup (migrations + seed + vector index):**
```bash
docker compose logs -f migrate
# Wait for: "Chroma index built: 284 hospitals"
```

**5. Open:**
```
Frontend:  http://localhost
API docs:  http://localhost:8000/docs
ReDoc:     http://localhost:8000/redoc
```

**Useful Docker commands:**
```bash
# View all service logs
docker compose logs -f

# Restart just the backend
docker compose restart backend

# Stop everything
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v

# Rebuild after code changes
docker compose up -d --build backend
```

**Services and ports:**

| Service | Port | Description |
|---|---|---|
| Frontend (Nginx) | `80` | React app |
| Backend (FastAPI) | `8000` | REST API + WebSocket |
| PostgreSQL | `5432` | Database |
| Redis | `6379` | Pub/sub cache |

---

### Option B — Local Development (manual)

**Backend:**
```bash
conda activate agentic_env
cd backend
cp .env.example .env          # add your API keys
alembic upgrade heads          # create DB tables
python scripts/seed.py         # seed 53 Mumbai/Pune hospitals
python scripts/import_csv.py   # load 284 real hospitals from CSV
python scripts/seed_doctors.py # seed 50 demo doctors with room assignments
python scripts/build_vector_index.py  # build Chroma RAG index (~45s)
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# Opens at http://localhost:5173
```

---

### API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Postman: import `docs/postman_collection.json`

---

## CI/CD (GitHub Actions)

Three workflows run automatically on every push:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push/PR to `main`, `backend`, `develop` | Runs 67 backend unit tests against a real PostgreSQL service |
| `docker-build.yml` | Push to `main` | Builds both Docker images to verify they compile |
| `lint.yml` | Every push/PR | Ruff + Black (Python), ESLint (TypeScript) |

Badges at the top of this README show live status.

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
| AI Triage | Google Gemini 3 Flash Preview | Free (60 req/min) |
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
├── .github/
│   └── workflows/
│       ├── ci.yml             # backend tests on every push
│       ├── docker-build.yml   # Docker image build verification
│       └── lint.yml           # Ruff + Black + ESLint
├── backend/
│   ├── app/
│   │   ├── api/v1/routes/     # 11 route files, 39 endpoints
│   │   ├── core/              # config, auth, security
│   │   ├── db/                # base, session, models
│   │   ├── models/            # 7 SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # gemini, tavily, ranking, vector, ocr, realtime
│   │   └── tests/             # 67 tests (unit + live)
│   ├── alembic/               # 3 migrations
│   ├── data/                  # healthcare_living_map_FINAL.csv (284 hospitals)
│   ├── scripts/               # seed, import, build_index
│   ├── Dockerfile             # multi-stage Python 3.11 + Tesseract
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── api/               # axios clients
│   │   ├── pages/             # patient, admin
│   │   └── routes/            # React Router
│   ├── Dockerfile             # multi-stage Node 20 + Nginx
│   ├── nginx.conf             # SPA routing + gzip + security headers
│   └── .dockerignore
├── docs/
│   ├── API_CONTRACT.md        # full 39-endpoint contract
│   ├── ARCHITECTURE.md        # system diagrams + data flows
│   └── postman_collection.json # 49 requests, auto-saves JWT
├── docker-compose.yml         # full stack: Postgres + Redis + Backend + Frontend
├── .env.docker                # Docker Compose env template
└── README.md
```

---

## Running Tests

**Unit tests** (no server needed):
```bash
conda activate agentic_env
cd backend
python -m pytest app/tests/ \
  --ignore=app/tests/test_chat_live.py \
  --ignore=app/tests/test_gemini_live.py \
  -v
# 67 passed
```

**Live end-to-end chat test** (server must be running):
```bash
# Start server first
uvicorn app.main:app --port 8000

# In another terminal
python app/tests/test_chat_live.py
# 5 passed — English, Hindi, fever, stroke, pediatric scenarios
```

**Live Gemini API test:**
```bash
python app/tests/test_gemini_live.py
```

---

## API Keys (All Free)

| Key | Where to get |
|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com — free tier, 60 req/min |
| `TAVILY_API_KEY` | https://tavily.com — hackathon code `TVLY-HF9ETJRW` |
| `ORS_API_KEY` | https://openrouteservice.org/dev/#/signup — free tier |
