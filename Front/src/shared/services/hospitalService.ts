// Mock service layer. Swap these implementations with real API calls later.
import { HOSPITALS, RECENT_INGESTION_JOBS, RECENT_UPDATES } from "@/shared/data/mockData";
import type { Hospital, IngestionJob, AvailabilityUpdate, TriageResult, Urgency } from "@/shared/types";
import { realtimeBus } from "@/lib/realtimeBus";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withDistance(h: Hospital, originLat = 19.076, originLng = 72.8777): Hospital {
  // Simple haversine approximation for demo
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(h.lat - originLat);
  const dLng = toRad(h.lng - originLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(originLat)) * Math.cos(toRad(h.lat)) * Math.sin(dLng / 2) ** 2;
  const distanceKm = +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  const travelTimeMin = Math.max(5, Math.round(distanceKm * 2.5));
  return { ...h, distanceKm, travelTimeMin };
}

export async function fetchHospitals(): Promise<Hospital[]> {
  await delay(300);
  return HOSPITALS.map((h) => withDistance(h));
}

export async function fetchHospitalById(id: string): Promise<Hospital | null> {
  await delay(200);
  const h = HOSPITALS.find((x) => x.id === id);
  return h ? withDistance(h) : null;
}

export async function fetchRecentIngestionJobs(): Promise<IngestionJob[]> {
  await delay(150);
  return RECENT_INGESTION_JOBS;
}

export async function fetchRecentUpdates(): Promise<AvailabilityUpdate[]> {
  await delay(150);
  return RECENT_UPDATES;
}

export async function updateHospitalAvailability(
  id: string,
  patch: Partial<Hospital["beds"]> & { ambulanceAvailable?: boolean; emergencyOpen?: boolean }
): Promise<Hospital | null> {
  await delay(400);
  const idx = HOSPITALS.findIndex((h) => h.id === id);
  if (idx < 0) return null;
  const h = HOSPITALS[idx];
  HOSPITALS[idx] = {
    ...h,
    beds: { ...h.beds, ...(patch as Hospital["beds"]) },
    ambulanceAvailable: patch.ambulanceAvailable ?? h.ambulanceAvailable,
    emergencyOpen: patch.emergencyOpen ?? h.emergencyOpen,
  };
  const updated = withDistance(HOSPITALS[idx]);
  realtimeBus.emit({ type: "availability.updated", hospital: updated, at: Date.now() });
  return updated;
}

// ---- Triage (mock AI) ----
const SYMPTOM_RULES: { match: RegExp; specialty: string; urgency: Urgency; summary: string; redFlags: string[] }[] = [
  {
    match: /(chest pain|breath|breathing|heart|cardiac)/i,
    specialty: "Cardiology",
    urgency: "critical",
    summary: "Possible cardiac event. Immediate cardiology evaluation needed.",
    redFlags: ["Chest pain with breathlessness", "Possible MI risk"],
  },
  {
    match: /(accident|bleeding|fracture|trauma|injury)/i,
    specialty: "Trauma",
    urgency: "critical",
    summary: "Trauma case. Route to nearest hospital with trauma + ICU capacity.",
    redFlags: ["Active bleeding", "Possible internal injury"],
  },
  {
    match: /(stroke|weakness|slurred|facial droop|paralysis)/i,
    specialty: "Neurology",
    urgency: "critical",
    summary: "Possible stroke. Time-critical — transport immediately.",
    redFlags: ["Stroke window <4.5 hrs"],
  },
  {
    match: /(child|kid|baby|infant|paediatric|fever|cough)/i,
    specialty: "Paediatrics",
    urgency: "moderate",
    summary: "Paediatric case with fever/respiratory symptoms.",
    redFlags: ["Monitor for breathing distress"],
  },
  {
    match: /(diabet|sugar|insulin|dizzy|faint)/i,
    specialty: "General Medicine",
    urgency: "urgent",
    summary: "Metabolic concern — likely glycaemic event.",
    redFlags: ["Risk of hypoglycaemia"],
  },
];

export async function analyzeSymptoms(text: string): Promise<TriageResult> {
  await delay(1400);
  const rule =
    SYMPTOM_RULES.find((r) => r.match.test(text)) ?? {
      specialty: "General Medicine",
      urgency: "moderate" as Urgency,
      summary: "Symptoms suggest a general consultation. Visit any nearby hospital.",
      redFlags: [],
    };

  const ranked = HOSPITALS.map((h) => withDistance(h))
    .map((h) => {
      const specialtyHit = h.specialties.includes(rule.specialty) ? 40 : 0;
      const icuBoost = rule.urgency === "critical" ? Math.min(25, h.beds.icu.available * 2) : Math.min(10, h.beds.icu.available);
      const bedBoost = Math.min(20, h.beds.general.available / 5);
      const distancePenalty = Math.min(25, (h.distanceKm ?? 0) * 1.2);
      const score = Math.max(0, Math.min(100, Math.round(specialtyHit + icuBoost + bedBoost + 15 - distancePenalty)));
      return {
        hospital: h,
        matchScore: score,
        reason: specialtyHit
          ? `Strong ${rule.specialty} unit, ${h.beds.icu.available} ICU beds free`
          : `Nearby option, ${h.beds.general.available} general beds free`,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  return { ...rule, recommendedHospitals: ranked };
}

// ---- Ingestion (mock OCR/AI) ----
export async function ingestFile(file: File): Promise<{ json: Record<string, unknown>; job: IngestionJob }> {
  await delay(1800);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "file";
  const job: IngestionJob = {
    id: `j-${Date.now()}`,
    fileName: file.name,
    fileType: ext,
    status: "done",
    createdAt: "just now",
    hospitalName: "Auto-detected Hospital",
    recordsExtracted: Math.floor(Math.random() * 80) + 10,
  };
  const json = {
    hospital: {
      name: "Sunrise Multispeciality Hospital",
      address: "Plot 22, MIDC, Andheri East, Mumbai",
      phone: "+91 22 4000 1100",
    },
    capacity: {
      icu_beds: { total: 40, available: 7 },
      general_beds: { total: 220, available: 38 },
      ventilators: { total: 18, available: 4 },
    },
    specialties: ["Cardiology", "Orthopaedics", "General Medicine"],
    last_updated: new Date().toISOString(),
    confidence: 0.92,
  };
  return { json, job };
}
