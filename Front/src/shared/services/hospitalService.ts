import { apiClient } from "@/lib/apiClient";
import { HOSPITALS, RECENT_INGESTION_JOBS, RECENT_UPDATES } from "@/shared/data/mockData";
import type { Hospital, IngestionJob, AvailabilityUpdate, TriageResult, Urgency } from "@/shared/types";
import { realtimeBus } from "@/lib/realtimeBus";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fallback map origin when no GPS and no VITE_PATIENT_DEFAULT_* (Casablanca city centre) */
export const DEFAULT_MAP_ORIGIN = { lat: 33.5883, lng: -7.6114 };

export type TriageLocationInput = {
  lat: number;
  lng: number;
  radius_km?: number;
};

function withDistance(h: Hospital, originLat = DEFAULT_MAP_ORIGIN.lat, originLng = DEFAULT_MAP_ORIGIN.lng): Hospital {
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
  try {
    const { data } = await apiClient.get<BackendHospital[]>("/hospitals");
    return data.map((h) => mapBackendHospital(h));
  } catch {
    await delay(300);
    return HOSPITALS.map((h) => withDistance(h));
  }
}

export async function fetchHospitalById(id: string): Promise<Hospital | null> {
  const backendId = Number(id);
  if (!Number.isNaN(backendId)) {
    try {
      const { data } = await apiClient.get<BackendHospital>(`/hospitals/${backendId}`);
      return mapBackendHospital(data);
    } catch {
      // continue to fallback
    }
  }
  await delay(200);
  const h = HOSPITALS.find((x) => x.id === id);
  return h ? withDistance(h) : null;
}

export async function fetchRecentIngestionJobs(): Promise<IngestionJob[]> {
  try {
    const { data } = await apiClient.get<BackendAgentTrace[]>("/admin/traces", {
      params: { limit: 10 },
    });
    return data.map((trace) => ({
      id: String(trace.id),
      fileName: trace.model ?? "trace",
      fileType: "json",
      status: "done",
      createdAt: new Date(trace.created_at).toLocaleString(),
      hospitalName: undefined,
      recordsExtracted: undefined,
    }));
  } catch {
    await delay(150);
    return RECENT_INGESTION_JOBS;
  }
}

export async function fetchRecentUpdates(): Promise<AvailabilityUpdate[]> {
  try {
    const { data } = await apiClient.get<BackendAvailabilityLog[]>("/admin/audit", {
      params: { limit: 20 },
    });
    return data.map((log) => ({
      id: String(log.id),
      hospitalId: String(log.hospital_id),
      hospitalName: `Hospital #${log.hospital_id}`,
      changedBy: `User #${log.updated_by_user_id}`,
      timestamp: new Date(log.created_at).toLocaleString(),
      note: `${log.field_name}: ${log.old_value} -> ${log.new_value}`,
    }));
  } catch {
    await delay(150);
    return RECENT_UPDATES;
  }
}

export async function updateHospitalAvailability(
  id: string,
  patch: Partial<Hospital["beds"]> & { ambulanceAvailable?: boolean; emergencyOpen?: boolean }
): Promise<Hospital | null> {
  const backendId = Number(id);
  if (!Number.isNaN(backendId)) {
    try {
      const payload: Record<string, unknown> = {};
      if (patch.beds?.icu?.available !== undefined) payload.icu_available = patch.beds.icu.available;
      if (patch.beds?.general?.available !== undefined) {
        payload.general_available = patch.beds.general.available;
      }
      if (patch.beds?.ventilators?.available !== undefined) {
        payload.ventilators_available = patch.beds.ventilators.available;
      }
      if (patch.emergencyOpen !== undefined) {
        payload.status = patch.emergencyOpen ? "normal" : "emergency_only";
      }
      const { data } = await apiClient.patch<BackendHospital>(
        `/admin/hospitals/${backendId}/availability`,
        payload,
      );
      const updated = mapBackendHospital(data);
      realtimeBus.emit({ type: "availability.updated", hospital: updated, at: Date.now() });
      return updated;
    } catch {
      // continue fallback
    }
  }

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

function resolveTriageOrigin(userLocation: TriageLocationInput | undefined): { lat: number; lng: number } {
  if (
    userLocation &&
    Number.isFinite(userLocation.lat) &&
    Number.isFinite(userLocation.lng) &&
    Math.abs(userLocation.lat) <= 90 &&
    Math.abs(userLocation.lng) <= 180
  ) {
    return { lat: userLocation.lat, lng: userLocation.lng };
  }
  const envLat = Number(import.meta.env.VITE_PATIENT_DEFAULT_LAT);
  const envLng = Number(import.meta.env.VITE_PATIENT_DEFAULT_LNG);
  if (Number.isFinite(envLat) && Number.isFinite(envLng)) {
    return { lat: envLat, lng: envLng };
  }
  return { lat: DEFAULT_MAP_ORIGIN.lat, lng: DEFAULT_MAP_ORIGIN.lng };
}

/**
 * @param userLocation - From triage (GPS or city). If omitted, uses env defaults or a single in-app GPS fix (Morocco / env default, not India).
 */
export async function analyzeSymptoms(
  text: string,
  userLocation?: TriageLocationInput,
): Promise<TriageResult> {
  const baseOrigin = resolveTriageOrigin(userLocation);
  let lat = baseOrigin.lat;
  let lng = baseOrigin.lng;

  try {
    const triageRes = await apiClient.post<BackendTriageResponse>("/patient/triage", {
      symptoms_text: text,
    });
    if (!userLocation) {
      if (typeof window !== "undefined" && window.navigator.geolocation) {
        await new Promise<void>((resolve) => {
          window.navigator.geolocation.getCurrentPosition(
            (position) => {
              lat = position.coords.latitude;
              lng = position.coords.longitude;
              resolve();
            },
            () => resolve(),
            { timeout: 10_000, enableHighAccuracy: true, maximumAge: 0 },
          );
        });
      } else {
        lat = baseOrigin.lat;
        lng = baseOrigin.lng;
      }
    } else {
      lat = userLocation.lat;
      lng = userLocation.lng;
    }

    const recommendationsRes = await apiClient.post<BackendRecommendationsResponse>(
      "/patient/recommendations",
      {
        specialty: triageRes.data.specialty,
        urgency: mapUrgencyForBackend(triageRes.data.urgency),
        lat,
        lng,
        radius_km: userLocation?.radius_km ?? 40,
      },
    );
    const recommendedHospitals = recommendationsRes.data.results.map((result) => ({
      hospital: mapBackendHospital(result.hospital, lat, lng),
      matchScore: Math.round(result.score_breakdown.total * 100),
      reason:
        result.doctors.length > 0
          ? `${result.hospital.name}: ${result.doctors.length} doctor(s) matching your case`
          : `${result.hospital.name} (no matching specialist in our records — call to confirm)`,
    }));
    return {
      specialty: triageRes.data.specialty,
      urgency: mapUrgencyToFrontend(triageRes.data.urgency),
      summary: triageRes.data.rationale,
      redFlags: triageRes.data.claims
        .filter((claim) => claim.field.toLowerCase().includes("emergency"))
        .map((claim) => claim.value),
      recommendedHospitals,
    };
  } catch {
    await delay(1400);
    const rule =
      SYMPTOM_RULES.find((r) => r.match.test(text)) ?? {
        specialty: "General Medicine",
        urgency: "moderate" as Urgency,
        summary: "Symptoms suggest a general consultation. Visit any nearby hospital.",
        redFlags: [],
      };

    const o = resolveTriageOrigin(userLocation);
    const ranked = HOSPITALS.map((h) => withDistance(h, o.lat, o.lng))
      .map((h) => {
        const specialtyHit = h.specialties.includes(rule.specialty) ? 40 : 0;
        const icuBoost =
          rule.urgency === "critical"
            ? Math.min(25, h.beds.icu.available * 2)
            : Math.min(10, h.beds.icu.available);
        const bedBoost = Math.min(20, h.beds.general.available / 5);
        const distancePenalty = Math.min(25, (h.distanceKm ?? 0) * 1.2);
        const score = Math.max(
          0,
          Math.min(100, Math.round(specialtyHit + icuBoost + bedBoost + 15 - distancePenalty)),
        );
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
}

export type IngestApiResponse = {
  filename: string;
  total_parsed: number;
  total_inserted: number;
  total_skipped: number;
  preview: Array<Record<string, unknown>>;
  message: string;
};

/** Admin-only. `confirm=false` returns preview; `confirm=true` inserts into DB. */
export async function ingestHospitalFile(
  file: File,
  confirm: boolean,
): Promise<IngestApiResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<IngestApiResponse>("/admin/ingest", formData, {
    params: { confirm },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ---- Ingestion (mock OCR/AI) ----
export async function ingestFile(file: File): Promise<{ json: Record<string, unknown>; job: IngestionJob }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post("/admin/ingest", formData, {
      params: { confirm: false },
      headers: { "Content-Type": "multipart/form-data" },
    });
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "file";
    const job: IngestionJob = {
      id: `j-${Date.now()}`,
      fileName: file.name,
      fileType: ext,
      status: "done",
      createdAt: new Date().toLocaleString(),
      hospitalName: "Ingested",
      recordsExtracted: typeof data?.indexed === "number" ? data.indexed : undefined,
    };
    return { json: data ?? {}, job };
  } catch {
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
}

type BackendHospital = {
  id: number;
  external_id?: string | null;
  name: string;
  address: string;
  phone: string | null;
  website?: string | null;
  lat: number;
  lng: number;
  is_24x7: boolean;
  status: "normal" | "busy" | "emergency_only";
  icu_total: number;
  icu_available: number;
  general_total: number;
  general_available: number;
  ventilators_available: number;
  specialties: string[];
};

type BackendTriageResponse = {
  specialty: string;
  urgency: string;
  confidence: number;
  rationale: string;
  claims: Array<{ field: string; value: string }>;
};

type BackendRecommendationsResponse = {
  results: Array<{
    hospital: BackendHospital;
    distance_km: number;
    eta_minutes: number | null;
    score_breakdown: { total: number };
    doctors: Array<{ id: number }>;
  }>;
};

type BackendAvailabilityLog = {
  id: number;
  hospital_id: number;
  updated_by_user_id: number;
  field_name: string;
  old_value: string;
  new_value: string;
  created_at: string;
};

type BackendAgentTrace = {
  id: number;
  model: string | null;
  created_at: string;
};

function mapBackendHospital(
  h: BackendHospital,
  originLat = DEFAULT_MAP_ORIGIN.lat,
  originLng = DEFAULT_MAP_ORIGIN.lng,
): Hospital {
  const totalBeds = h.icu_available + h.general_available;
  return withDistance(
    {
      id: String(h.id),
      name: h.name,
      address: h.address,
      city: extractCity(h.address),
      lat: h.lat,
      lng: h.lng,
      phone: h.phone && h.phone.length > 0 ? h.phone : h.website ?? "Not available",
      website: h.website ?? undefined,
      specialties: h.specialties ?? [],
      beds: {
        icu: { total: h.icu_total, available: h.icu_available },
        general: { total: h.general_total, available: h.general_available },
        ventilators: { total: h.ventilators_available, available: h.ventilators_available },
      },
      ambulanceAvailable: h.status !== "emergency_only",
      emergencyOpen: h.status !== "emergency_only",
      open24x7: h.is_24x7,
      rating: 4.4,
    },
    originLat,
    originLng,
  );
}

function extractCity(address: string): string {
  const chunks = address.split(",").map((x) => x.trim()).filter(Boolean);
  if (chunks.length >= 2) return chunks[chunks.length - 2];
  return chunks[0] ?? "Unknown";
}

function mapUrgencyForBackend(urgency: string): "normal" | "urgent" | "emergency" {
  const value = urgency.toLowerCase();
  if (value === "critical" || value === "emergency") return "emergency";
  if (value === "urgent") return "urgent";
  return "normal";
}

function mapUrgencyToFrontend(urgency: string): Urgency {
  const value = urgency.toLowerCase();
  if (value === "emergency") return "critical";
  if (value === "urgent") return "urgent";
  return "moderate";
}
