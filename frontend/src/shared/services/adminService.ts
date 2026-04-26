import { HOSPITALS } from "@/shared/data/mockData";
import type { Hospital, UserRole } from "@/shared/types";

const USERS_KEY = "ahm.admin.users.v1";
const VECTOR_KEY = "ahm.vector.records.v1";
const TAVILY_KEY = "ahm.tavily.apiKey.v1";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  hospitalId?: string;
  createdAt: string;
};

export type VectorRecord = {
  id: string;
  hospitalId: string;
  title: string;
  illness: string;
  doctorName: string;
  room?: string;
  notes: string;
  source: "manual" | "document" | "api";
  updatedAt: string;
};

function loadUsers(): AdminUser[] {
  if (typeof window === "undefined") return seedUsers();
  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) {
    const seeded = seedUsers();
    window.localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as AdminUser[];
    return Array.isArray(parsed) ? parsed : seedUsers();
  } catch {
    return seedUsers();
  }
}

function saveUsers(users: AdminUser[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadVectors(): VectorRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(VECTOR_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as VectorRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveVectors(items: VectorRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VECTOR_KEY, JSON.stringify(items));
}

function seedUsers(): AdminUser[] {
  return [
    {
      id: "u-admin-1",
      fullName: "Platform Admin",
      email: "admin@demo.app",
      role: "admin",
      createdAt: new Date().toISOString(),
    },
    {
      id: "u-staff-1",
      fullName: "KEM Staff",
      email: "staff@kem.app",
      role: "staff",
      hospitalId: "h-kem",
      createdAt: new Date().toISOString(),
    },
    {
      id: "u-patient-1",
      fullName: "Client Demo",
      email: "client@demo.app",
      role: "patient",
      createdAt: new Date().toISOString(),
    },
  ];
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  await delay(150);
  return loadUsers().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createAdminUser(input: Omit<AdminUser, "id" | "createdAt">): Promise<AdminUser> {
  await delay(200);
  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("Email already exists");
  }
  const next: AdminUser = {
    id: makeId("u"),
    createdAt: new Date().toISOString(),
    ...input,
    email: input.email.toLowerCase(),
  };
  users.push(next);
  saveUsers(users);
  return next;
}

export async function updateAdminUserRole(id: string, role: UserRole, hospitalId?: string): Promise<AdminUser> {
  await delay(180);
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");
  users[idx] = { ...users[idx], role, hospitalId: role === "staff" ? hospitalId : undefined };
  saveUsers(users);
  return users[idx];
}

export async function deleteAdminUser(id: string): Promise<void> {
  await delay(120);
  const users = loadUsers().filter((u) => u.id !== id);
  saveUsers(users);
}

export async function fetchHospitalsForAdmin(): Promise<Hospital[]> {
  await delay(150);
  return [...HOSPITALS];
}

export async function createHospitalForAdmin(input: Omit<Hospital, "id">): Promise<Hospital> {
  await delay(220);
  const next: Hospital = { ...input, id: makeId("h") };
  HOSPITALS.unshift(next);
  return next;
}

export async function updateHospitalForAdmin(
  id: string,
  patch: Partial<Pick<Hospital, "name" | "address" | "city" | "phone" | "specialties">>,
): Promise<Hospital> {
  await delay(200);
  const idx = HOSPITALS.findIndex((h) => h.id === id);
  if (idx < 0) throw new Error("Hospital not found");
  HOSPITALS[idx] = { ...HOSPITALS[idx], ...patch };
  return HOSPITALS[idx];
}

export async function deleteHospitalForAdmin(id: string): Promise<void> {
  await delay(150);
  const idx = HOSPITALS.findIndex((h) => h.id === id);
  if (idx < 0) return;
  HOSPITALS.splice(idx, 1);
}

export async function fetchVectorRecords(hospitalId: string): Promise<VectorRecord[]> {
  await delay(130);
  return loadVectors()
    .filter((v) => v.hospitalId === hospitalId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertVectorRecord(
  input: Omit<VectorRecord, "id" | "updatedAt"> & { id?: string },
): Promise<VectorRecord> {
  await delay(180);
  const records = loadVectors();
  const id = input.id ?? makeId("vec");
  const next: VectorRecord = {
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  };
  const idx = records.findIndex((r) => r.id === id);
  if (idx >= 0) records[idx] = next;
  else records.unshift(next);
  saveVectors(records);
  return next;
}

export async function deleteVectorRecord(id: string): Promise<void> {
  await delay(120);
  saveVectors(loadVectors().filter((r) => r.id !== id));
}

export function getStoredTavilyApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TAVILY_KEY) ?? "";
}

export function setStoredTavilyApiKey(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TAVILY_KEY, key.trim());
}
