import type { Hospital, IngestionJob, AvailabilityUpdate } from "@/shared/types";

/**
 * Offline / API-fail fallback. Coordinates in Morocco (Casablanca, Rabat) so distance matches local demos.
 * Replace with your region or rely on the live API + seeded DB.
 */
export const HOSPITALS: Hospital[] = [
  {
    id: "h-casa-chu",
    name: "CHU Ibn Rochd (demo)",
    address: "Rue des Hôpitaux, Mers Sultan",
    city: "Casablanca",
    lat: 33.5865,
    lng: -7.6118,
    phone: "+212 522 20 00 00",
    specialties: ["Cardiology", "Trauma", "Neurology", "General Medicine"],
    beds: {
      icu: { total: 40, available: 8 },
      general: { total: 600, available: 120 },
      ventilators: { total: 30, available: 6 },
    },
    ambulanceAvailable: true,
    emergencyOpen: true,
    open24x7: true,
    rating: 4.3,
  },
  {
    id: "h-casa-ms",
    name: "Hôpital des Spécialités (demo)",
    address: "Avenue Mers Sultan",
    city: "Casablanca",
    lat: 33.5912,
    lng: -7.6254,
    phone: "+212 522 25 00 00",
    specialties: ["Cardiology", "Oncology", "Orthopaedics", "Neurology"],
    beds: {
      icu: { total: 25, available: 4 },
      general: { total: 200, available: 35 },
      ventilators: { total: 18, available: 3 },
    },
    ambulanceAvailable: true,
    emergencyOpen: true,
    open24x7: true,
    rating: 4.4,
  },
  {
    id: "h-casa-children",
    name: "Centre Pédiatrique (demo)",
    address: "Boulevard Zerktouni",
    city: "Casablanca",
    lat: 33.5801,
    lng: -7.5998,
    phone: "+212 522 12 00 00",
    specialties: ["Paediatrics", "General Medicine", "Neurology"],
    beds: {
      icu: { total: 12, available: 2 },
      general: { total: 80, available: 18 },
      ventilators: { total: 8, available: 1 },
    },
    ambulanceAvailable: true,
    emergencyOpen: true,
    open24x7: false,
    rating: 4.2,
  },
  {
    id: "h-rabat-chu",
    name: "CHU Rabat (demo)",
    address: "Hôpital d'Enfants, Rabat",
    city: "Rabat",
    lat: 34.0181,
    lng: -6.8319,
    phone: "+212 537 70 00 00",
    specialties: ["Cardiology", "Trauma", "Paediatrics", "Surgery"],
    beds: {
      icu: { total: 50, available: 10 },
      general: { total: 500, available: 90 },
      ventilators: { total: 25, available: 5 },
    },
    ambulanceAvailable: true,
    emergencyOpen: true,
    open24x7: true,
    rating: 4.3,
  },
  {
    id: "h-casa-clinic",
    name: "Clinique Ain Borja (demo)",
    address: "Ain Sebaa",
    city: "Casablanca",
    lat: 33.6004,
    lng: -7.5233,
    phone: "+212 520 00 00 00",
    specialties: ["Cardiology", "Orthopaedics", "General Medicine"],
    beds: {
      icu: { total: 15, available: 5 },
      general: { total: 120, available: 40 },
      ventilators: { total: 10, available: 4 },
    },
    ambulanceAvailable: true,
    emergencyOpen: true,
    open24x7: true,
    rating: 4.0,
  },
];

export const RECENT_INGESTION_JOBS: IngestionJob[] = [
  { id: "j1", fileName: "icu_update.pdf", fileType: "pdf", status: "done", createdAt: "2 min ago", hospitalName: "CHU Ibn Rochd (demo)", recordsExtracted: 14 },
  { id: "j2", fileName: "beds_march.xlsx", fileType: "xlsx", status: "done", createdAt: "18 min ago", hospitalName: "Hôpital des Spécialités (demo)", recordsExtracted: 86 },
  { id: "j3", fileName: "intake.jpg", fileType: "image", status: "processing", createdAt: "just now", hospitalName: "CHU Rabat (demo)" },
  { id: "j4", fileName: "staff.csv", fileType: "csv", status: "done", createdAt: "1 hr ago", hospitalName: "Centre Pédiatrique (demo)", recordsExtracted: 42 },
  { id: "j5", fileName: "scanned_intake.pdf", fileType: "pdf", status: "failed", createdAt: "2 hr ago" },
];

export const RECENT_UPDATES: AvailabilityUpdate[] = [
  { id: "u1", hospitalId: "h-casa-chu", hospitalName: "CHU Ibn Rochd (demo)", changedBy: "Infirmier(ère) A.", timestamp: "5 min ago", note: "Lits ICU mis à jour" },
  { id: "u2", hospitalId: "h-casa-clinic", hospitalName: "Clinique Ain Borja (demo)", changedBy: "Admin", timestamp: "22 min ago", note: "2 ventilators back online" },
  { id: "u3", hospitalId: "h-rabat-chu", hospitalName: "CHU Rabat (demo)", changedBy: "Admin", timestamp: "1 hr ago", note: "Urgences: normal" },
];

export const SYMPTOM_EXAMPLES = [
  "Chest pain and difficulty breathing",
  "Child fever and persistent cough",
  "Severe accident and bleeding",
  "Sudden weakness on one side of body",
  "High blood sugar and dizziness",
];
