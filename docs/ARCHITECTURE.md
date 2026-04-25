# Architecture (Agentic Healthcare Maps)

## High-level overview

The system has two user-facing experiences:

- **Patient UI**: symptom input → hospital recommendations + map
- **Hospital Admin UI**: authenticated dashboard → real-time capacity updates

Backend responsibilities:

- Ingest + normalize messy hospital records (OCR + parsing)
- Symptom triage → required specialty + urgency (Google Gemini)
- Medical search with citations (Tavily)
- Hospital ranking + routing metadata
- Real-time availability propagation (WebSockets / pub-sub)

## Services

- **Backend**: FastAPI (`backend/`)
- **Frontend**: React + Vite + Tailwind (`frontend/`)
- **DB**: PostgreSQL (prod) / SQLite (dev option)
- **Cache / real-time pub-sub**: Redis
- **Vector DB**: Chroma (open source)
- **Maps**: Leaflet + OpenStreetMap tiles
- **Routing**: OpenRouteService

## Suggested data flow

1. **Ingestion**
   - Input: PDF/CSV/XLSX/JSON/image
   - OCR (Tesseract) for images/scans
   - LLM cleanup/standardization (Gemini) → structured JSON
   - Persist to SQL + embeddings to Chroma

2. **Patient triage**
   - Patient symptom text (any language)
   - Gemini extracts specialty + urgency
   - Tavily returns relevant clinical info + citations

3. **Hospital matching**
   - Query vector store + SQL filters
   - Rank by time + specialty match + capacity (+ ventilators for respiratory emergencies)
   - Return top hospitals + map metadata

4. **Admin updates**
   - Admin updates beds/specialists/equipment
   - Persist change + publish update event (Redis)
   - Patient map receives update via WebSocket

