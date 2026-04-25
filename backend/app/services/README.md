# Services

Put integrations and domain logic here:

- `gemini.py`: symptom triage + structured extraction
- `tavily.py`: real-time medical search with citations
- `ocr/`: tesseract + pdf/image ingestion pipeline
- `vector/`: chroma + embeddings (sentence-transformers)
- `realtime/`: websocket + redis pub/sub

Keep `api/` routes thin; they should orchestrate services and validate schemas only.

