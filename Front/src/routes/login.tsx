import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Activity, User, Stethoscope, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/shared/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema, type LoginInput } from "@/lib/schemas";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Agentic Healthcare Maps" },
      {
        name: "description",
        content: "Sign in as a patient, hospital staff, or administrator.",
      },
    ],
  }),
  component: LoginPage,
});

const ROLES: {
  id: UserRole;
  label: string;
  desc: string;
  icon: typeof User;
  defaultRoute: string;
}[] = [
  { id: "patient", label: "Patient", desc: "Find a hospital fast", icon: User, defaultRoute: "/triage" },
  {
    id: "staff",
    label: "Hospital Staff",
    desc: "Update bed availability",
    icon: Stethoscope,
    defaultRoute: "/dashboard",
  },
  { id: "admin", label: "Admin", desc: "Network analytics", icon: ShieldCheck, defaultRoute: "/admin" },
];

function LoginPage() {
  const [role, setRole] = useState<UserRole>("staff");
  const { mockLogin } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "staff@kem.demo", password: "demo1234" },
  });

  function onSubmit(values: LoginInput) {
    mockLogin(values.email, role);
    toast.success(`Welcome — signed in as ${role}`);
    const fallback = ROLES.find((r) => r.id === role)!.defaultRoute;
    const target = search.redirect ?? fallback;
    setTimeout(() => {
      // Use href so external-style redirects also work; navigate for in-app paths.
      if (target.startsWith("http")) window.location.href = target;
      else navigate({ to: target });
    }, 250);
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/60 p-12 text-primary-foreground lg:flex">
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
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose your role to continue. Demo login — credentials prefilled.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                  role === r.id
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border bg-card hover:bg-secondary/60",
                )}
              >
                <r.icon
                  className={cn(
                    "h-4 w-4",
                    role === r.id ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <p className="text-sm font-semibold">{r.label}</p>
                <p className="text-[11px] text-muted-foreground">{r.desc}</p>
              </button>
            ))}
          </div>

          <Card className="mt-5 p-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <Label className="mb-1.5 block text-xs">Email</Label>
                <Input
                  type="email"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register("email")}
                  placeholder="you@hospital.org"
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
                Sign in as {role}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Mock JWT — stored locally, decoded with jwt-decode.
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
