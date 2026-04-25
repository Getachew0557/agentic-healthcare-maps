param(
  [int]$BackendPort = 8000,
  [int]$FrontendPort = 5173
)

Write-Host "Starting backend + frontend (2 terminals recommended)."
Write-Host "Backend:  http://localhost:$BackendPort"
Write-Host "Frontend: http://localhost:$FrontendPort"
Write-Host ""
Write-Host "Backend command:"
Write-Host "  cd backend; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt -r requirements-dev.txt; uvicorn app.main:app --reload --port $BackendPort"
Write-Host ""
Write-Host "Frontend command:"
Write-Host "  cd frontend; npm install; npm run dev -- --port $FrontendPort"

