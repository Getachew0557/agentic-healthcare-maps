/** Maps backend `GET /auth/me` role to the first page after sign-in or sign-up. */
export function defaultRouteForBackendRole(role: string, redirectFromQuery?: string): string {
  if (redirectFromQuery) return redirectFromQuery;
  if (role === "admin") return "/admin";
  if (role === "hospital_staff") return "/dashboard";
  return "/triage";
}
