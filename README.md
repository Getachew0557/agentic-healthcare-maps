# 🏥 Agentic Healthcare Maps

AI Hack Nation 2026 – Global AI Hackathon  
Submitted by: **Team Getachew0557**  
License: **MIT**

Agentic Healthcare Maps is an AI-powered intelligence network that turns messy hospital records into a living, real-time map of healthcare availability.

## Monorepo structure (standard starter)

- `backend/` – FastAPI + SQLAlchemy + Alembic + JWT + WebSockets
- `frontend/` – React 18 + Vite + TypeScript + Tailwind + Leaflet + React Query
- `docs/` – Architecture, API contract, final project documentation
- `scripts/` – helper scripts (Windows PowerShell)

## Complete technology stack (matches documentation)

- **AI / LLM**: Google Gemini (Gemini 1.5 Flash, free tier), Tavily (citations)
- **OCR**: Tesseract + pytesseract + pdf2image + Pillow
- **Backend**: FastAPI + Uvicorn, Pydantic v2, SQLAlchemy + Alembic, python-jose, passlib[bcrypt], python-dotenv, WebSockets, Redis
- **DB**: PostgreSQL (prod) / MySQL (alt) / SQLite (dev), Redis (cache/pub-sub), Chroma (vector)
- **Frontend**: React 18, Vite, TypeScript, Tailwind, Leaflet, React Router, Axios, TanStack Query, React Hook Form + Zod, Recharts, jwt-decode
- **Dev tooling**: Black + Ruff, ESLint + Prettier
- **Infra**: Docker + Compose, GitHub Actions (optional next step)

## Quickstart (local dev)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

## Docs

- `docs/FINAL_PROJECT_DOCUMENTATION.md`
- `docs/ARCHITECTURE.md`
- `docs/API_CONTRACT.md`

