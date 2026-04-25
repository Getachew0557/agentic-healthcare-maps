import { describe, it, expect, beforeEach } from "vitest";
import { mintMockJwt, getToken, setToken, clearToken } from "@/lib/authStorage";
import { jwtDecode } from "jwt-decode";

describe("authStorage — mock JWT lifecycle", () => {
  beforeEach(() => clearToken());

  it("mints a decodable JWT with role + exp", () => {
    const token = mintMockJwt({ sub: "u1", email: "a@b.com", role: "staff" });
    const decoded = jwtDecode<{ role: string; exp: number; email: string }>(token);
    expect(decoded.role).toBe("staff");
    expect(decoded.email).toBe("a@b.com");
    expect(decoded.exp * 1000).toBeGreaterThan(Date.now());
  });

  it("persists and clears the token", () => {
    setToken("abc");
    expect(getToken()).toBe("abc");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("respects custom ttl", () => {
    const token = mintMockJwt({
      sub: "u1",
      email: "a@b.com",
      role: "patient",
      ttlSeconds: 1,
    });
    const decoded = jwtDecode<{ exp: number }>(token);
    expect(decoded.exp * 1000 - Date.now()).toBeLessThan(2000);
  });
});
