import type { UserRole } from "@/shared/types";

const KEY = "ahm.auth.token";

export interface AuthPayload {
  sub: string;
  email: string;
  role: UserRole;
  hospitalId?: string;
  exp: number; // seconds
}

/** Tiny base64url helpers — works in browser + node SSR. */
function b64url(input: string): string {
  const b64 = typeof btoa !== "undefined" ? btoa(input) : Buffer.from(input).toString("base64");
  return b64.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Build a fake JWT (header.payload.sig) for the demo. Not signed — the demo
 * backend isn't real. Decoded by jwt-decode in `useAuth`.
 */
export function mintMockJwt(payload: Omit<AuthPayload, "exp"> & { ttlSeconds?: number }): string {
  const { ttlSeconds = 60 * 60 * 8, ...rest } = payload;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const header = b64url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = b64url(JSON.stringify({ ...rest, exp }));
  return `${header}.${body}.demo`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
