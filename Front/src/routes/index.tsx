import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Activity,
  Brain,
  Clock,
  HeartPulse,
  MapPinned,
  Shield,
  Sparkles,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  Search,
  Map,
  Users,
  TrendingUp,
  Ambulance,
  Hospital,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agentic Healthcare Maps — Find the right hospital, fast" },
      {
        name: "description",
        content:
          "A calm, agent-first experience to route you to the nearest hospital with the right specialty and capacity — demo with mock data.",
      },
    ],
  }),
  component: Landing,
});

const METRICS = [
  { label: "Time to first match", value: "Seconds", note: "symptom → candidates", icon: Clock },
  { label: "Facilities in demo", value: "8+", note: "Mumbai & Pune sample", icon: Hospital },
  { label: "Update channel", value: "Web", note: "hospital staff portal", icon: TrendingUp },
] as const;

const PILLARS = [
  {
    title: "Plain-language triage",
    body: "Describe what is happening. We extract specialty and urgency to shortlist care that fits the case.",
    icon: Brain,
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop",
  },
  {
    title: "Distance that respects traffic",
    body: "Rankings consider travel time and load — not just a straight line on a map.",
    icon: MapPinned,
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop",
  },
  {
    title: "Verifiable details",
    body: "When doctor and room data exist in the network, we surface it. When it does not, we say so — no invented room numbers.",
    icon: Shield,
    image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&h=400&fit=crop",
  },
] as const;

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Background Image */}
      <section className="relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1920&h=1080&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/70" />
        
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
          <div className="max-w-3xl">
            <p className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Agentic routing · mock network · not for emergency diagnosis
            </p>
            <h1 className="mt-6 font-heading text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl">
              The right door.
              <span className="text-primary"> The first time.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-200 md:text-xl">
              A focused interface for families in motion: we translate symptoms into a short, explainable list of nearby
              hospitals you can call or drive to — with live capacity and staff-sourced details when they exist in the
              system.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg transition-all hover:scale-105">
                <Link to="/login">
                  Sign in to the app
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/30 bg-white/10 px-8 text-base text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <Link to="/signup">Create an account</Link>
              </Button>
            </div>
            <p className="mt-4 max-w-lg text-xs text-gray-300">
              Static sign-in and sign-up for the hackathon — use the site menu for About and Contact when you need them.
            </p>
          </div>

          {/* Metrics Cards */}
          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {METRICS.map((m) => (
              <div
                key={m.label}
                className="group rounded-2xl border border-white/20 bg-white/10 p-5 text-left backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20"
              >
                <m.icon className="mb-3 h-8 w-8 text-primary" />
                <p className="font-heading text-3xl font-bold tracking-tight text-white md:text-4xl">{m.value}</p>
                <p className="text-sm font-medium text-gray-200">{m.label}</p>
                <p className="mt-1 text-xs text-gray-300">{m.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gradient-to-b from-white via-gray-50 to-white py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Simple process</p>
            <h2 className="mt-2 font-heading text-4xl font-bold tracking-tight md:text-5xl">
              How it works in 3 steps
            </h2>
            <div className="mt-3 h-1 w-20 bg-gradient-to-r from-primary to-primary/40 rounded-full mx-auto" />
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Search, title: "Describe symptoms", desc: "Tell us what's happening in plain language", color: "from-blue-500 to-cyan-500" },
              { icon: Brain, title: "AI Triage", desc: "We extract specialty and urgency instantly", color: "from-purple-500 to-pink-500" },
              { icon: Map, title: "Get matched", desc: "Receive ranked hospital options with live capacity", color: "from-emerald-500 to-teal-500" },
            ].map((step, i) => (
              <div key={i} className="group relative text-center">
                <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r shadow-lg transition-all group-hover:scale-110" style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }} className={`bg-gradient-to-r ${step.color}`}>
                  <step.icon className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-heading text-xl font-bold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Triage Demo Section with Image */}
      <section className="bg-surface/80 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-4xl font-bold tracking-tight md:text-5xl">
                Built for the <span className="text-primary">"where now?"</span> moment
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Lists of hospitals are easy. What is hard is knowing <em className="font-semibold text-foreground">where you should go next</em> with the time you have.
                The assistant keeps answers tight, source-aware, and easy to act on.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "A calm chat you can use under stress, with clear next steps and phone numbers",
                  "A map that stays in sync with capacity updates from the hospital web portal (demo)",
                  "Traces in admin so judges can see how answers were produced — governance, not just UI",
                ].map((t) => (
                  <div key={t} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-muted-foreground">{t}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Live Triage Card with Image */}
            <Card className="relative overflow-hidden border-border/70 p-0 shadow-elevated">
              <div className="relative h-48 overflow-hidden bg-gradient-to-r from-primary/20 to-primary/5">
                <img 
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=300&fit=crop"
                  alt="Emergency room"
                  className="h-full w-full object-cover opacity-30"
                />
                <div className="absolute inset-0 flex items-center justify-between p-4">
                  <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-sm">Live triage</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/90 px-3 py-1 text-xs text-white backdrop-blur-sm">
                    <HeartPulse className="h-3.5 w-3.5" />
                    Urgent
                  </span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-base font-medium text-foreground">“Shortness of breath, tight chest — started 20 minutes ago.”</p>
                <div className="mt-5 space-y-2">
                  {[
                    { left: "Specialty", right: "Cardiology", icon: Activity },
                    { left: "Urgency", right: "High", icon: HeartPulse },
                    { left: "Route focus", right: "Time + ICU headroom", icon: Clock },
                  ].map((row) => (
                    <div
                      key={row.left}
                      className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 px-4 py-3"
                    >
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <row.icon className="h-4 w-4" />
                        {row.left}
                      </span>
                      <span className="font-semibold text-foreground">{row.right}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Three Pillars with Images */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Why it feels different</p>
          <h2 className="mt-2 font-heading text-4xl font-bold tracking-tight md:text-5xl">Three design commitments</h2>
          <div className="mt-3 h-1 w-20 bg-gradient-to-r from-primary to-primary/40 rounded-full mx-auto" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PILLARS.map((p) => (
            <Card key={p.title} className="group overflow-hidden border-border/70 p-0 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={p.image} 
                  alt={p.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 rounded-full bg-white/90 p-2 backdrop-blur-sm">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-heading text-xl font-bold">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats + Testimonial Section */}
      <section className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <Stethoscope className="h-12 w-12 text-primary" />
              <h3 className="font-heading text-3xl font-bold">Hospitals stay in control</h3>
              <p className="text-lg text-muted-foreground">
                Staff use a web portal to publish capacity, rosters, and room assignments. No WhatsApp chains, no
                guesswork in what the public sees.
              </p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Real-time updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Verified data only</span>
                </div>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <img 
                src="https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&h=500&fit=crop"
                alt="Hospital dashboard"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-sm font-medium text-white">Hospital staff portal — demo interface</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section with Background Image */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1920&h=600&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary/80" />
        
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-24">
          <div className="text-center">
            <h3 className="font-heading text-4xl font-bold tracking-tight text-white md:text-5xl">
              Ready to experience the future of emergency routing?
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
              Sign in to explore triage, interactive maps, hospital dashboards, and admin tracing — all powered by our agentic system.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" variant="secondary" className="h-12 px-8 text-base shadow-lg transition-all hover:scale-105">
                <Link to="/login">
                  Sign in to the demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/30 bg-transparent px-8 text-base text-white transition-all hover:bg-white/10"
              >
                <Link to="/signup">Create free account</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/70">
              No credit card required • Full demo access • Mock data for showcase
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}