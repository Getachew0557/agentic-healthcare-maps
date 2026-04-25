# 🏥 Final Project Documentation: Agentic Healthcare Maps

AI Hack Nation 2026 – Global AI Hackathon  
Submitted by: **Team Getachew0557**  
License: **MIT**

This document is the project write-up used for judging and external sharing.

## Executive Summary

Agentic Healthcare Maps is an AI-powered intelligence network that transforms messy, fragmented hospital records into a living, real-time map of healthcare availability. The system ingests inconsistent hospital records from PDFs, CSVs, Excel files, and handwritten notes. Using **Google Gemini (free tier)** for symptom triage, **Tavily** for real-time medical search with citations, and **Tesseract OCR** for document parsing, it extracts structured data about bed availability, specialist doctors, ventilator counts, and emergency services.

Users describe symptoms in plain language; the AI recommends the nearest hospital with the required specialty and available capacity. Hospital staff update availability through a secure professional dashboard. The mission is simple: **no family should travel hours only to discover the help they need isn't there.**

## Problem Statement

Hospitals maintain data in isolation, across inconsistent formats (paper registers, Excel sheets, and incomplete digital systems). Families lose critical time “hospital hunting” during emergencies; outcomes depend on minutes.

## Solution Overview

The solution combines:

- Messy record ingestion (OCR + parsing)
- AI normalization and structuring (Gemini)
- Real-time citable medical search (Tavily)
- A living network with real-time updates (dashboard + pub/sub)
- Dual interface: patient map + hospital admin panel

## Core Features (Summary)

- **Messy ingestion**: PDF/CSV/XLSX/Images → standardized JSON
- **Symptom triage**: Gemini extracts specialty + urgency (multilingual)
- **Citable search**: Tavily returns medical sources and citations
- **Admin dashboard**: secure login + professional availability updates
- **Matching/routing**: ranked hospitals by travel time + match + capacity
- **Real-time map**: live markers with availability color-coding

## Complete Technology Stack (100% Free)

- Symptom triage: Google Gemini 1.5 Flash (free tier)
- Medical search: Tavily (hackathon credits)
- OCR: Tesseract (open source)
- Vector DB: Chroma (open source)
- Metadata DB: PostgreSQL / SQLite
- Cache / real-time: Redis
- Map: Leaflet + OpenStreetMap
- Routing: OpenRouteService (free tier)
- Backend: FastAPI + Python
- Frontend: React + Vite + Tailwind (patient) + Recharts (admin)
- Auth: JWT + bcrypt
- Deploy: Vercel (hackathon credits)

