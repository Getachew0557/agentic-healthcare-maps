import { useEffect, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import {
  AUTH_CHANGED_EVENT,
  clearToken,
  getToken,
  type AuthPayload,
} from "@/lib/authStorage";
import type { UserRole } from "@/shared/types";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  hospitalId?: string;
}

function mapJwtRoleToUserRole(r?: string): UserRole {
  if (r === "admin") return "admin";
  if (r === "hospital_staff") return "staff";
  return "patient";
}

function decode(token: string | null): AuthUser | null {
  if (!token) return null;
  try {
    const p = jwtDecode<AuthPayload>(token);
    if (p.exp * 1000 < Date.now()) return null;
    return {
      id: p.sub,
      email: p.email ?? "",
      role: mapJwtRoleToUserRole(p.role),
      hospitalId: p.hospital_id != null ? String(p.hospital_id) : undefined,
    };
  } catch {
    return null;
  }
}

/** Auth hook: user is derived from JWT (`/auth/login` tokens include email, role, hospital_id). */
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
    function onAuthChanged() {
      setUser(decode(getToken()));
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    };
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
    logout,
  };
}
