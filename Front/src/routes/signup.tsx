import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Activity, User, Building2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { signupSchema, type SignupInput } from "@/lib/schemas";
import { apiClient } from "@/lib/apiClient";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Agentic Healthcare Maps" },
      { name: "description", content: "Sign up as a client or hospital — static demo, no real backend." },
    ],
  }),
  component: SignupPage,
});

const ROLE_OPTIONS: {
  value: "client" | "hospital";
  label: string;
  blurb: string;
  icon: typeof User;
  benefits: string[];
}[] = [
  { 
    value: "client", 
    label: "Client", 
    blurb: "Search hospitals and get routed by symptoms.", 
    icon: User,
    benefits: ["Real-time hospital capacity", "Smart routing based on symptoms", "Save favorite locations"]
  },
  { 
    value: "hospital", 
    label: "Hospital Staff", 
    blurb: "Update capacity, doctors, and rooms (staff demo).", 
    icon: Building2,
    benefits: ["Manage bed availability", "Update doctor schedules", "Receive patient referrals"]
  },
];

function SignupPage() {
  const navigate = useNavigate();
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "client",
      organizationName: "",
    },
  });

  const role = form.watch("role");

  async function onSubmit(values: SignupInput) {
    const label = values.role === "hospital" ? "Hospital Staff" : "Client";
    const payload = {
      full_name: values.fullName,
      email: values.email,
      password: values.password,
      role: values.role === "hospital" ? "staff" : "patient",
      organization_name: values.organizationName?.trim() || undefined,
    };
    try {
      await apiClient.post("/auth/signup", payload);
      toast.success(`Account created (${label}) via backend.`, {
        description: "You can now sign in with the same credentials.",
        icon: "✅",
      });
    } catch {
      localStorage.setItem(
        "ahm.signup.pending",
        JSON.stringify({ ...values, password: "[omitted]", confirmPassword: "[omitted]", at: new Date().toISOString() }),
      );
      toast.warning(`Signup endpoint unavailable — saved ${label} request in static mode.`, {
        description: "No server account was created. You can still test flows locally.",
      });
    }
    setTimeout(() => navigate({ to: "/login", search: { redirect: undefined } }), 400);
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle at 30% 30%, white 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Activity className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight">
            Join the network and get routed faster.
          </h2>
          <p className="mt-3 text-sm text-primary-foreground/80">
            Choose account type, create your profile, and continue with static sign in for this hackathon demo.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Client flows for symptom routing
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Hospital staff flows for capacity updates
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Endpoint-first with safe local fallback
            </li>
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6 md:p-10">
        <div className="w-full max-w-md">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dynamic sign-up via backend with static fallback if API is unavailable.
          </p>

          <Card className="mt-5 border-border/80 p-6 shadow-elevated">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  I am a <span className="text-primary">*</span>
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ROLE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "group relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200",
                        role === option.value
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/10",
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        className="sr-only"
                        checked={role === option.value}
                        onChange={() => {
                          form.setValue("role", option.value, { shouldValidate: true, shouldDirty: true });
                          form.clearErrors("organizationName");
                        }}
                      />
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "rounded-lg p-2 transition-all",
                          role === option.value ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        )}>
                          <option.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.blurb}</p>
                        </div>
                        {role === option.value && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                {form.formState.errors.role && (
                  <p className="mt-1.5 text-xs text-destructive">{form.formState.errors.role.message}</p>
                )}
              </div>

              <div className="space-y-4">
                {role === "hospital" && (
                  <div>
                    <Label className="text-xs font-semibold">Organization name <span className="text-primary">*</span></Label>
                    <Input
                      className="mt-1.5 border-muted/60 bg-background/50"
                      placeholder="e.g., City General Hospital"
                      autoComplete="organization"
                      {...form.register("organizationName")}
                    />
                    {form.formState.errors.organizationName && (
                      <p className="mt-1 text-xs text-destructive">{form.formState.errors.organizationName.message}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold">Full name <span className="text-primary">*</span></Label>
                  <Input
                    className="mt-1.5 border-muted/60 bg-background/50"
                    placeholder="Your name"
                    autoComplete="name"
                    {...form.register("fullName")}
                  />
                  {form.formState.errors.fullName && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold">Email <span className="text-primary">*</span></Label>
                  <Input
                    className="mt-1.5 border-muted/60 bg-background/50"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold">Password <span className="text-primary">*</span></Label>
                  <Input
                    className="mt-1.5 border-muted/60 bg-background/50"
                    type="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold">Confirm password <span className="text-primary">*</span></Label>
                  <Input
                    className="mt-1.5 border-muted/60 bg-background/50"
                    type="password"
                    autoComplete="new-password"
                    {...form.register("confirmPassword")}
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg transition-all hover:shadow-primary/25"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Creating account..." : "Create account"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have access?{" "}
                <Link
                  to="/login"
                  search={{ redirect: undefined }}
                  className="font-semibold text-primary underline-offset-4 transition hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}