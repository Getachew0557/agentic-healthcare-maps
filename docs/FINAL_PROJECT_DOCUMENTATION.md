# 🏥 FINAL PROJECT DOCUMENTATION: Agentic Healthcare Maps

AI Hack Nation 2026 – Global AI Hackathon  
Submitted by: **Team Getachew0557**  
Repository: `https://github.com/Getachew0557/agentic-healthcare-maps`  
License: **MIT**

## 1. Executive Summary

Agentic Healthcare Maps is an AI-powered intelligence network that transforms messy, fragmented hospital records into a living, real-time map of healthcare availability.

The system ingests thousands of inconsistent hospital records from PDFs, CSVs, Excel files, and even handwritten notes. Using **Google Gemini (free tier)** for symptom triage, **Tavily API** (hackathon credits) for real-time medical search with citations, and **open-source OCR** for document parsing, it extracts structured data about bed availability, specialist doctors, ventilator counts, and emergency services.

Users describe their symptoms in plain language. The AI agent instantly recommends the nearest hospital with the required specialty and available capacity. Hospital staff update their availability through a **secure professional dashboard inside the application**.

Mission: **no family should travel hours only to discover the help they need isn't there.**

## 2. Problem Statement

In India, a postal code can literally determine a lifespan. This is the harsh reality of healthcare access in developing nations.

### The core issues

- Hospitals maintain data in complete isolation from one another
- Some hospitals use Excel spreadsheets while others use paper registers
- Many hospitals have no digital records at all
- A typical district has 50+ hospitals with different data formats
- No centralized healthcare directory exists at state or national level
- Families waste precious golden-hour time hopping between hospitals
- Rural patients travel hours only to find no ICU beds available
- Language barriers prevent rural patients from navigating city hospitals
- Hospital staff have no easy way to update bed availability
- Emergency patients arrive to find specialists are not on duty

### The human impact

Every hour wasted in hospital hunting is an hour a patient does not have. During cardiac emergencies, stroke events, or severe trauma, the difference between life and death is measured in minutes.

## 3. Solution Overview

Agentic Healthcare Maps solves this problem through five core capabilities that work together seamlessly using **100% free technologies**.

### The five pillars

1. Ingest messy hospital records from any source using open-source OCR (Tesseract)
2. Clean and structure data using Google Gemini free tier with medical taxonomies
3. Perform real-time medical search using Tavily API (hackathon credits) for citable, current information
4. Create a living intelligence network that updates in real time through a secure hospital dashboard
5. Provide a dual-interface system: patient recommendations + hospital admin updates

### The patient journey

The patient/family describes symptoms in plain language in English, Hindi, or any other language. Gemini extracts the required specialty and urgency. Tavily searches trusted medical sources to return current clinical guidance with citations. The system ranks hospitals by travel time, specialty match, and available capacity. Finally, it shows an interactive map with the top results.

### The hospital journey

Hospital administrators log in to a secure dashboard. They update bed availability using plus/minus controls, mark specialists on duty, and toggle equipment status. Updates propagate instantly to the patient map. **No WhatsApp. No SMS.**

## 4. Core Features

### Feature 1: Messy hospital record ingestion (OCR + parsing)

- Inputs: PDF/CSV/XLSX/JSON/images/photos of handwritten registers
- OCR: Tesseract for scans/images, direct parsing for digital sources
- Output: standardized JSON for SQL + vector indexing

### Feature 2: AI-powered symptom triage (Gemini)

- Input: free-text symptoms (multilingual)
- Output: specialty + urgency (and optionally confidence + short rationale)
- Fallback: deterministic rules if LLM unavailable (demo-safe)

### Feature 3: Real-time medical search with citations (Tavily)

- Queries trusted sources (PubMed, WHO, Mayo Clinic, etc.)
- Returns citations to reduce hallucinations and build judge trust

### Feature 4: Professional hospital admin dashboard

- Secure login
- Update ICU/general beds + ventilators
- Specialist availability + equipment toggles
- Changes are timestamped and logged

### Feature 5: Smart matching + routing

- Rank by travel time + specialty match + capacity
- Emergency mode weights travel time heavily (golden-hour priority)
- Show transparent score breakdown (explainability)

### Feature 6: Real-time patient map visualization

- Leaflet + OpenStreetMap
- Color-coded availability markers (green/yellow/red/gray)
- WebSocket updates reflect dashboard changes instantly

## 5. 🛠️ Complete Technology Stack (Best List)

This section lists the **actual technologies used** in the project, organized by layer.

### Frontend (Patient + Admin in one app)

- **React 18**
- **Vite**
- **TypeScript**
- **Tailwind CSS**
- **Leaflet.js** (+ OpenStreetMap tiles)
- **React Router DOM**
- **Axios**
- **TanStack Query (React Query)**
- **React Hook Form + Zod**
- **Recharts**
- **jwt-decode**
- **ESLint + Prettier**
- **Vitest + React Testing Library** (minimum smoke tests)

### Backend

- **Python 3.11+**
- **FastAPI**
- **Uvicorn**
- **Pydantic v2**
- **SQLAlchemy + Alembic**
- **WebSockets**
- **python-jose** (JWT)
- **passlib[bcrypt]** (password hashing)
- **python-dotenv**
- **Ruff + Black**
- **pytest + pytest-asyncio + httpx** (API tests)

### Databases

- **PostgreSQL** (primary production relational DB)
- **MySQL** (supported alternative relational DB)
- **SQLite** (local/dev option if needed)
- **Redis** (cache + pub/sub for real-time updates)
- **ChromaDB** (vector database)

### AI / OCR / Retrieval (decision-support, not diagnosis)

- **Google Gemini API (Gemini 1.5 Flash)** (symptom triage; free tier)
- **Tavily API** (real-time medical search with citations; hackathon credits)
- **Tesseract OCR** + **pytesseract**
- **pdf2image** + **Pillow**
- **Sentence Transformers** (`all-MiniLM-L6-v2`) for embeddings (optional module)

### Mapping + routing

- **OpenStreetMap**
- **OpenRouteService** (ETA / travel time)
- **OSMnx** + **Geopy** (data + geocoding helpers)

### Deployment / DevOps

- **Vercel** (frontend)
- **Railway** (backend) / **Render** (alternatives)
- **Docker + Docker Compose**
- **GitHub Actions** (CI/CD)

## 6. Data Sources

Primary sources:

- OpenStreetMap hospital POIs via OSMnx (ODbL)
- Kaggle Indian Healthcare Facilities (seed data; CC0)

Demo approach:

- Synthetic messy docs for ingestion demo (PDF scans, handwriting photos, malformed CSVs)
- Target demo region: Mumbai metro + Pune district (500–1000 records)

## 7. Innovation and Winning Factors

- **Zero cost, deployable stack**: Gemini free tier + Tavily credits + open source
- **Professional dashboard**: hospital updates happen in-app (not WhatsApp/SMS)
- **Citations**: Tavily makes answers verifiable
- **Multilingual**: Gemini supports Hindi and regional languages
- **Messy data superpower**: embraces real-world formats (PDFs/handwriting)

## 8. 24-hour build plan

- 0–2: repo setup + dependencies
- 2–6: OCR + ingestion + seed hospitals
- 6–10: Gemini triage + Tavily citations
- 10–12: FastAPI endpoints + auth
- 12–16: patient UI + admin dashboard
- 16–18: Leaflet map + WebSockets
- 18–24: polish, test, deploy, demo video

## 9. Demo Script for Judges

### Opening (problem)

“In rural India, a father suffers a heart attack. His family drives two hours to the nearest city. Hospital A has no cardiologist. Hospital B has no ICU beds. By the time they reach Hospital C, the golden hour has passed.”

### Stack highlight

“We used free technologies: Gemini for symptom understanding, Tavily for citations, and a secure hospital dashboard for real-time updates. **No WhatsApp.**”

### Patient demo

Type in Hindi: “मेरी माँ को सीने में दर्द और सांस लेने में तकलीफ हो रही है”.  
Show specialty + urgency, then top hospitals + map markers + ETAs.

### Hospital demo

Log into dashboard, update ICU beds, refresh patient view, marker updates instantly.

### Ingestion demo (optional)

Upload handwritten register photo → OCR → parsed hospital appears on map.

## 10. Future Enhancements

- Voice input + speech-to-text
- Ambulance dispatch integration
- Predictive availability forecasting
- Government operations dashboard
- Offline PWA mode for low connectivity

## 11. Success Metrics

- Hospital hunting time reduction: 70%
- Specialty matching accuracy: 85%+
- Messy record processing time: < 10s
- Map load time: < 2s
- Update propagation time: < 5s

## 12. Team Roles

- Team Lead (Getachew0557): architecture, GitHub, Gemini integration, deployment
- Person 2: backend API, Tavily integration, routing
- Person 3: ingestion, OCR, vector DB
- Person 4: patient frontend, hospital dashboard, map integration

## 13. Standard File Structure (actual repo)

This repository uses **one frontend app** (patient + admin routes) and **one backend service** (FastAPI).

```text
agentic-healthcare-maps/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py
│   │   │       └── routes/
│   │   ├── core/           # config, security, auth helpers
│   │   ├── db/             # base, session
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic request/response
│   │   └── services/       # gemini, tavily, ranking, ingestion, websocket, embeddings
│   └── alembic/            # migrations
├── frontend/
│   ├── src/
│   │   ├── api/            # axios + typed clients
│   │   ├── pages/
│   │   │   ├── patient/
│   │   │   └── admin/
│   │   ├── routes/
│   │   └── styles/
│   └── package.json
├── docs/
├── scripts/
├── docker-compose.yml
├── README.md
└── LICENSE
```

## 14. Getting Started (team members)

```bash
git clone https://github.com/Getachew0557/agentic-healthcare-maps.git
cd agentic-healthcare-maps
```

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

## 15. Conclusion

Agentic Healthcare Maps is more than a hackathon project. By combining **Gemini free tier**, **Tavily citations**, **open-source OCR**, **free mapping**, and a **professional hospital dashboard**, the system turns healthcare chaos into clarity.

**No GPT-4. No Claude. No expensive APIs. No WhatsApp.**  
Just purpose-built, cost-effective, professional decision-support for healthcare access.
