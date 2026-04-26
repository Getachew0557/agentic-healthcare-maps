# Services

Domain logic and external integrations. Routes stay thin — they orchestrate services and validate schemas only.

## AI / LLM

| File | Purpose |
|---|---|
| `gemini.py` | Symptom triage via Google Gemini 1.5 Flash REST API. Returns specialty, urgency, confidence, rationale as strict JSON. Temperature 0.2 for determinism. |
| `tavily.py` | Real-time medical citation search (PubMed, WHO, Mayo Clinic). Returns title + URL only — no raw content to prevent hallucination surface. |
| `triage.py` | Orchestrator: Gemini → deterministic fallback → Tavily citations. Populates `claims` array. Works with zero API keys. |
| `ranking.py` | Weighted hospital scoring: travel time + specialty match + bed availability + ventilators. Urgency-shifted weights. ORS ETA integration. |
| `trace_logger.py` | Persists every AI invocation to `agent_traces` table for admin governance. Non-fatal — never blocks the request. |

## Vector Search (RAG)

| File | Purpose |
|---|---|
| `vector/embeddings.py` | Chroma + `all-MiniLM-L6-v2`. Builds hospital documents, embeds them, stores in Chroma. Hybrid retrieval: SQL geo filter → Chroma re-rank. |

## OCR / Ingestion

| File | Purpose |
|---|---|
| `ocr/parser.py` | Multi-format parser: CSV, JSON, Excel (pandas), PDF (pdf2image + Tesseract), images (Tesseract). Returns `list[ParsedHospital]`. |

## Real-time

| File | Purpose |
|---|---|
| `realtime/ws_manager.py` | WebSocket `ConnectionManager` fan-out. Redis pub/sub subscriber with exponential backoff. `broadcast_availability_update()` — direct + Redis publish. |
