import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import type { UserRole } from "@/shared/types";
import { apiClient } from "@/lib/apiClient";
import { setToken } from "@/lib/authStorage";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Agentic Healthcare Maps" },
      { name: "description", content: "Sign in to the Agentic Healthcare Maps demo app." },
    ],
  }),
  component: LoginPage,
});

const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  patient: "/triage",
  staff: "/dashboard",
  admin: "/admin",
};

function inferRoleFromEmail(email: string): UserRole {
  const value = email.toLowerCase().trim();
  if (value.includes("admin")) return "admin";
  if (value.includes("staff") || value.includes("hospital")) return "staff";
  return "patient";
}

function LoginPage() {
  const { mockLogin } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "client@demo.app", password: "demo1234" },
  });

  async function onSubmit(values: LoginInput) {
    const role = inferRoleFromEmail(values.email);
    let mode: "api" | "mock" = "api";
    try {
      const response = await apiClient.post<{ access_token: string }>("/auth/login", values);
      setToken(response.data.access_token);
      toast.success(`Welcome — signed in via backend as ${role}`);
    } catch {
      mode = "mock";
      mockLogin(values.email, role);
      toast.warning(`Backend login failed, switched to static ${role} mode`);
    }
    const fallback = DEFAULT_ROUTE_BY_ROLE[role];
    const target = search.redirect ?? fallback;
    setTimeout(() => {
      // Use href so external-style redirects also work; navigate for in-app paths.
      if (target.startsWith("http")) window.location.href = target;
      else navigate({ to: target });
    }, mode === "api" ? 100 : 250);
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden bg-primary  p-12 text-primary-foreground lg:flex">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, white 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Activity className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight">
            Right hospital. Right time. Right care.
          </h2>
          <p className="mt-3 text-sm text-primary-foreground/80">
            One platform connecting patients, hospital staff, and administrators
            with real-time bed and emergency data.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> AI symptom triage
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Live bed & ICU availability
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Smart emergency routing
            </li>
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6 md:p-10">
        <div className="w-full max-w-md">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dynamic sign-in via backend, with static fallback. Roles are auto-detected from email.
          </p>

          <Alert className="mt-4 border-amber-500/30 bg-amber-500/5">
            <AlertTitle className="text-foreground/95">Backend + static fallback</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              We try <code className="rounded bg-muted px-1 py-0.5 text-xs">/auth/login</code> first. If the backend is offline
              or credentials fail in demo, the app falls back to local mock sign-in so testing can continue.
            </AlertDescription>
          </Alert>

          <Card className="mt-5 p-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <Label className="mb-1.5 block text-xs">Email</Label>
                <Input
                  type="email"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register("email")}
                  placeholder="client@demo.app"
                />
                {form.formState.errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Password</Label>
                <Input
                  type="password"
                  aria-invalid={!!form.formState.errors.password}
                  {...form.register("password")}
                  placeholder="••••••••"
                />
                {form.formState.errors.password && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button type="submit" size="lg" className="w-full shadow-glow-primary">
                Sign in
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Backend token when available; otherwise mock JWT for local role testing.
              </p>
              {/* <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Email hints: <strong>admin@...</strong> → admin, <strong>staff@...</strong> or <strong>hospital@...</strong> → hospital staff, otherwise client.
              </p> */}
              <p className="text-center text-sm text-muted-foreground">
                New here?{" "}
                <Link to="/signup" className="font-medium text-primary underline-offset-2 hover:underline">
                  Create an account (static)
                </Link>
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
