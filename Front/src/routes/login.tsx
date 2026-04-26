import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { setToken } from "@/lib/authStorage";
import { defaultRouteForBackendRole } from "@/lib/postLoginRedirect";
import { Activity, Shield, Clock, MapPin, Heart, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign In — Agentic Healthcare Maps" },
      { name: "description", content: "Sign in to access AI-powered healthcare routing platform." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    try {
      const response = await apiClient.post<{ access_token: string }>("/auth/login", values);
      setToken(response.data.access_token);
      const me = await apiClient.get<{ role: string }>("/auth/me");
      const target = defaultRouteForBackendRole(me.data.role, search.redirect);
      toast.success("Welcome back");
      setTimeout(() => {
        if (target.startsWith("http")) window.location.href = target;
        else navigate({ to: target });
      }, 100);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Sign in failed. Check your email and password."));
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Left Side - Medical Background */}
      <div className="relative hidden overflow-hidden lg:block">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=1600&fit=crop')",
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-blue-900/95" />
        
        {/* Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: "30px 30px",
          }}
        />
        
        {/* Animated Elements */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative max-w-md p-8 text-white">
            {/* Floating Heart Animation */}
            <div className="absolute -top-10 -right-10 animate-float">
              <Heart className="h-16 w-16 text-white/20" />
            </div>
            
            {/* Logo */}
            <div className="relative mb-8 flex items-center gap-3">
              <div className="rounded-2xl bg-white/20 backdrop-blur-sm p-3">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Agentic</h2>
                <p className="text-sm text-white/70">Healthcare Maps</p>
              </div>
            </div>
            
            {/* Welcome Message */}
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Welcome back to
              <span className="block text-cyan-300">smarter healthcare</span>
            </h2>
            
            <p className="mt-4 text-base text-white/80 leading-relaxed">
              Sign in to access AI-powered hospital routing, real-time bed availability, and intelligent symptom triage.
            </p>
            
            {/* Features */}
            <div className="mt-8 space-y-3">
              {[
                "Real-time hospital capacity tracking",
                "AI-powered symptom analysis",
                "Live doctor availability",
                "Smart emergency routing",
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="rounded-full bg-white/20 p-1">
                    <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                  </div>
                  <span className="text-sm text-white/80">{feature}</span>
                </div>
              ))}
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-8 flex items-center gap-4 border-t border-white/20 pt-6">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-300" />
                <span className="text-xs text-white/60">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-300" />
                <span className="text-xs text-white/60">24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-300" />
                <span className="text-xs text-white/60">Real-time Updates</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
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
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to continue your healthcare journey
            </p>
          </div>

          <Card className="mt-6 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 p-6">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Email Address</Label>
                <Input
                  type="email"
                  className="mt-1.5 border-gray-200 bg-white focus:border-primary/50 focus:ring-primary/20"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register("email")}
                  placeholder="you@example.com"
                />
                {form.formState.errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label className="text-sm font-semibold text-gray-700">Password</Label>
                <Input
                  type="password"
                  className="mt-1.5 border-gray-200 bg-white focus:border-primary/50"
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

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                  Remember me
                </label>
                <a href="#" className="text-sm text-primary hover:underline">
                  Forgot password?
                </a>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg transition-all hover:shadow-primary/25 hover:scale-[1.02]"
              >
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </Button>
                <Button variant="outline" className="gap-2">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.99h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.99C18.343 21.128 22 16.991 22 12z"/>
                  </svg>
                  Facebook
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                New to Agentic Healthcare?{" "}
                <Link to="/signup" className="font-semibold text-primary underline-offset-4 transition hover:underline">
                  Create an account
                </Link>
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}