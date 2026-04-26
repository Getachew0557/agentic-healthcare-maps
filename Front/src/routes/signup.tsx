import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Building2, CheckCircle2, Heart, Shield, Clock, MapPin, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { signupSchema, type SignupInput } from "@/lib/schemas";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { setToken } from "@/lib/authStorage";
import { defaultRouteForBackendRole } from "@/lib/postLoginRedirect";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — Agentic Healthcare Maps" },
      { name: "description", content: "Sign up as a client or hospital — real-time healthcare routing platform." },
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
  color: string;
}[] = [
  { 
    value: "client", 
    label: "Patient", 
    blurb: "Find the right hospital, fast", 
    icon: User,
    benefits: ["Real-time hospital capacity", "AI-powered symptom routing", "Save favorite locations", "Emergency contact integration"],
    color: "from-blue-500 to-cyan-500"
  },
  { 
    value: "hospital", 
    label: "Healthcare Provider", 
    blurb: "Manage your facility's availability", 
    icon: Building2,
    benefits: ["Update bed capacity live", "Manage doctor schedules", "Receive patient referrals", "Real-time analytics dashboard"],
    color: "from-teal-500 to-emerald-500"
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
    const backendRole = values.role === "hospital" ? "hospital_staff" : "patient";
    try {
      await apiClient.post("/auth/register", {
        email: values.email,
        password: values.password,
        role: backendRole,
      });
      const loginRes = await apiClient.post<{ access_token: string }>("/auth/login", {
        email: values.email,
        password: values.password,
      });
      setToken(loginRes.data.access_token);
      const me = await apiClient.get<{ role: string }>("/auth/me");
      const target = defaultRouteForBackendRole(me.data.role);
      toast.success("Account created — you're signed in", { icon: "🎉" });
      setTimeout(() => {
        navigate({ to: target });
      }, 150);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not create account. Try a different email or sign in."));
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Left Side - Enhanced with Medical Background Image */}
      <div className="relative hidden overflow-hidden lg:block">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&h=1600&fit=crop')",
          }}
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-blue-900/95" />
        
        {/* Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: "30px 30px",
          }}
        />
        
        {/* Floating Elements */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative max-w-md p-8 text-white">
            {/* Animated Pulse Ring */}
            <div className="absolute -top-20 -left-20">
              <div className="relative">
                <div className="absolute h-40 w-40 rounded-full border-4 border-white/20 animate-ping" />
                <div className="absolute h-40 w-40 rounded-full border-4 border-white/10" />
              </div>
            </div>
            
            {/* Logo Area */}
            <div className="relative mb-8 flex items-center gap-3">
              <div className="rounded-2xl bg-white/20 backdrop-blur-sm p-3">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Agentic</h2>
                <p className="text-sm text-white/70">Healthcare Maps</p>
              </div>
            </div>
            
            {/* Hero Text */}
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Join the future of
              <span className="block text-cyan-300">emergency care</span>
            </h2>
            
            <p className="mt-4 text-base text-white/80 leading-relaxed">
              Experience AI-powered hospital routing with real-time bed availability, doctor matching, and intelligent triage.
            </p>
            
            {/* Feature List */}
            <div className="mt-8 space-y-3">
              {[
                "AI symptom analysis & specialty matching",
                "Live bed & ICU availability tracking",
                "Real-time doctor schedules & room numbers",
                "Smart routing with traffic consideration",
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="rounded-full bg-white/20 p-1">
                    <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                  </div>
                  <span className="text-sm text-white/80">{feature}</span>
                </div>
              ))}
            </div>
            
            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">8+</p>
                <p className="text-xs text-white/60">Hospitals</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">&lt;30s</p>
                <p className="text-xs text-white/60">Response Time</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">24/7</p>
                <p className="text-xs text-white/60">Availability</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-6 md:p-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-2">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold">Agentic</h1>
              <p className="text-xs text-muted-foreground">Healthcare Maps</p>
            </div>
          </div>
          
          <div className="text-center lg:text-left">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-gray-900">
              Create an account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Start your journey to faster, smarter healthcare routing
            </p>
          </div>

          <Card className="mt-6 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 p-6" noValidate>
              {/* Role Selection */}
              <div>
                <p className="mb-3 text-sm font-semibold text-gray-700">
                  I am a <span className="text-primary">*</span>
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {ROLE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "group relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200",
                        role === option.value
                          ? "border-primary bg-gradient-to-r from-primary/5 to-primary/3 shadow-md"
                          : "border-gray-200 bg-white hover:border-primary/40 hover:shadow-sm",
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
                          "rounded-xl p-2.5 transition-all",
                          role === option.value 
                            ? `bg-gradient-to-r ${option.color} text-white shadow-lg` 
                            : "bg-gray-100 text-gray-500"
                        )}>
                          <option.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{option.label}</p>
                          <p className="text-xs text-gray-500">{option.blurb}</p>
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

              {/* Form Fields */}
              <div className="space-y-4">
                {role === "hospital" && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">
                      Organization Name <span className="text-primary">*</span>
                    </Label>
                    <Input
                      className="mt-1.5 border-gray-200 bg-white focus:border-primary/50 focus:ring-primary/20"
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
                  <Label className="text-sm font-semibold text-gray-700">
                    Full Name <span className="text-primary">*</span>
                  </Label>
                  <Input
                    className="mt-1.5 border-gray-200 bg-white focus:border-primary/50"
                    placeholder="Dr. Sarah Johnson"
                    autoComplete="name"
                    {...form.register("fullName")}
                  />
                  {form.formState.errors.fullName && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    Email Address <span className="text-primary">*</span>
                  </Label>
                  <Input
                    className="mt-1.5 border-gray-200 bg-white focus:border-primary/50"
                    type="email"
                    placeholder="hello@example.com"
                    autoComplete="email"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    Password <span className="text-primary">*</span>
                  </Label>
                  <Input
                    className="mt-1.5 border-gray-200 bg-white focus:border-primary/50"
                    type="password"
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    Confirm Password <span className="text-primary">*</span>
                  </Label>
                  <Input
                    className="mt-1.5 border-gray-200 bg-white focus:border-primary/50"
                    type="password"
                    placeholder="Confirm your password"
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
                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg transition-all hover:shadow-primary/25 hover:scale-[1.02]"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  search={{ redirect: undefined }}
                  className="font-semibold text-primary underline-offset-4 transition hover:underline"
                >
                  Sign in instead
                </Link>
              </p>

              <p className="text-center text-xs text-muted-foreground">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}