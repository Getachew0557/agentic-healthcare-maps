export type BedStatus = "available" | "low" | "full" | "unknown";
export type Urgency = "critical" | "urgent" | "moderate" | "routine";
export type UserRole = "patient" | "staff" | "admin";

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  phone: string;
  /** Public website when different from phone contact */
  website?: string;
  specialties: string[];
  beds: {
    icu: { total: number; available: number };
    general: { total: number; available: number };
    ventilators: { total: number; available: number };
  };
  ambulanceAvailable: boolean;
  emergencyOpen: boolean;
  open24x7: boolean;
  rating: number;
  travelTimeMin?: number;
  distanceKm?: number;
}

export interface TriageResult {
  specialty: string;
  urgency: Urgency;
  summary: string;
  redFlags: string[];
  recommendedHospitals: RankedHospital[];
}

export interface RankedHospital {
  hospital: Hospital;
  matchScore: number;
  reason: string;
}

export interface IngestionJob {
  id: string;
  fileName: string;
  fileType: string;
  status: "queued" | "processing" | "done" | "failed";
  createdAt: string;
  hospitalName?: string;
  recordsExtracted?: number;
}

export interface AvailabilityUpdate {
  id: string;
  hospitalId: string;
  hospitalName: string;
  changedBy: string;
  timestamp: string;
  note: string;
}
