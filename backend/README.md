# Backend (FastAPI)

## Requirements

- Python 3.11+

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate  # (Windows PowerShell: .venv\Scripts\Activate.ps1)
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Open:
- Swagger: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

