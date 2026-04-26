import { useEffect, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import {
  clearToken,
  getToken,
  mintMockJwt,
  setToken,
  type AuthPayload,
} from "@/lib/authStorage";
import type { UserRole } from "@/shared/types";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  hospitalId?: string;
}

function decode(token: string | null): AuthUser | null {
  if (!token) return null;
  try {
    const p = jwtDecode<AuthPayload>(token);
    if (p.exp * 1000 < Date.now()) return null;
    return { id: p.sub, email: p.email, role: p.role, hospitalId: p.hospitalId };
  } catch {
    return null;
  }
}

/**
 * Auth hook. Mock JWT is minted client-side for the demo; swap `mockLogin`
 * for an axios POST to `/auth/login` once the backend is real.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => decode(getToken()));

  // Auto-logout when token expires.
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;
    try {
      const p = jwtDecode<AuthPayload>(token);
      const ms = p.exp * 1000 - Date.now();
      if (ms <= 0) {
        clearToken();
        setUser(null);
        return;
      }
      const t = setTimeout(() => {
        clearToken();
        setUser(null);
      }, ms);
      return () => clearTimeout(t);
    } catch {
      // ignore
    }
  }, [user]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "ahm.auth.token") setUser(decode(getToken()));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const mockLogin = useCallback((email: string, role: UserRole) => {
    const token = mintMockJwt({
      sub: `u-${role}-${Date.now()}`,
      email,
      role,
      hospitalId: role === "staff" ? "h-kem" : undefined,
    });
    setToken(token);
    setUser(decode(token));
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    role: user?.role ?? null,
    mockLogin,
    logout,
  };
}
