# Contributing Guide (Team Starter)

This repo is a **monorepo** with a strict structure so everyone can work in parallel without collisions.

## Repo layout

- `backend/`: FastAPI service (Python)
- `frontend/`: React app (Vite + Tailwind)
- `docs/`: architecture, API contracts, product documentation
- `scripts/`: common dev scripts (PowerShell + bash)

## Branch workflow

- Create a branch from `main`:
  - `feat/<short-topic>` (new feature)
  - `fix/<short-topic>` (bug fix)
  - `chore/<short-topic>` (refactor, tooling, docs)

Examples:
- `feat/patient-map`
- `feat/admin-auth`
- `fix/hospital-ranking`

## Where to put your work

### Backend

- API endpoints: `backend/app/api/`
- Core settings/logging: `backend/app/core/`
- DB layer: `backend/app/db/`
- Domain models: `backend/app/models/`
- Request/response schemas: `backend/app/schemas/`
- Integrations/services (Gemini, Tavily, OCR, vector DB): `backend/app/services/`

**Rule**: keep endpoints thin; move logic into `services/`.

### Frontend

- Pages/routes: `frontend/src/pages/`
  - patient UI: `frontend/src/pages/patient/`
  - admin UI: `frontend/src/pages/admin/`
- Reusable components: `frontend/src/components/`
- API client and types: `frontend/src/api/`
- Shared utilities: `frontend/src/lib/`
- Styles: `frontend/src/styles/`

**Rule**: avoid one giant `App.tsx`. Create pages + components.

## Environment variables

- Never commit real secrets.
- Copy examples:
  - `backend/.env.example` → `backend/.env`
  - `frontend/.env.example` → `frontend/.env`

## Pull requests

PRs should include:
- What changed + why
- Screenshots for UI changes
- How to run/test locally

