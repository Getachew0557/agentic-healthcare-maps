import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getToken } from "@/lib/authStorage";
import { jwtDecode } from "jwt-decode";
import type { AuthPayload } from "@/lib/authStorage";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    const token = getToken();
    let valid = false;
    if (token) {
      try {
        const p = jwtDecode<AuthPayload>(token);
        valid = p.exp * 1000 > Date.now();
      } catch {
        valid = false;
      }
    }
    if (!valid) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
