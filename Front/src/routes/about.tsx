import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { MapPin, Shield, Sparkles, Users, HeartHandshake, Target, Eye, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About us — Agentic Healthcare Maps" },
      { name: "description", content: "Our mission, scope, and how we use AI to route people to the right care." },
    ],
  }),
  component: AboutPage,
});

const PILLARS = [
  {
    title: "Grounded answers",
    body: "We designed the assistant to cite hospital and doctor data from the network — not to invent room numbers or names. When something is not on file, the UI should say so clearly.",
    icon: Sparkles,
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    title: "Privacy by design",
    body: "This hackathon build uses mock data and static auth for demos. A production system would add explicit consent, retention limits, and regional compliance.",
    icon: Shield,
    gradient: "from-blue-500/20 to-indigo-500/20",
  },
  {
    title: "Built for the golden hour",
    body: "Our ranking blends specialty fit, available capacity, and travel time so families spend less time guessing where to go during emergencies.",
    icon: MapPin,
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
];

function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero section with animated gradient */}
      <section className="relative overflow-hidden border-b border-border/70 bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(60% 80% at 12% 8%, oklch(0.55 0.12 240 / 0.08) 0%, transparent 50%)",
          }}
        />
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24 text-center">
          <div className="inline-flex animate-float items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            <Target className="h-4 w-4" />
            Our mission
          </div>
          <h1 className="mt-6 font-heading text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            We map care to <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">the moment you need it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            <strong className="font-semibold text-foreground">Agentic Healthcare Maps</strong> is a triage and routing experience: 
            describe what is happening, and we help you find nearby hospitals with the right specialty, capacity, and people — where data exists.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
            <span className="text-lg">⚠️</span>
            <strong>Important:</strong> This tool is not a substitute for a clinician. In an emergency, call your local emergency number.
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <div className="grid items-start gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Eye className="h-3.5 w-3.5" />
              Why we exist
            </div>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight md:text-4xl">
              Solving the uncertainty problem
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              In many places, the hardest part of an emergency is not lack of hospital lists — it is the uncertainty: who has
              a bed, who is truly qualified for this case, and what is the fastest path there. We combine a conversational
              agent with a structured care graph so answers feel human but stay verifiable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium shadow-sm">
                <Users className="h-3.5 w-3.5 text-primary" />
                For patients, hospitals, and ops
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium shadow-sm">
                <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                Public-good orientation
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium shadow-sm">
                <Award className="h-3.5 w-3.5 text-primary" />
                Hackathon built
              </div>
            </div>
          </div>
          
          <Card className="relative overflow-hidden border-border/80 p-6 shadow-elevated transition-all hover:shadow-xl">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            <h3 className="font-heading text-xl font-bold">📦 This demo (hackathon scope)</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {[
                "Client chat + map, hospital staff dashboard, and an admin trace view to show governance",
                "Static sign-in / sign-up to explore flows without a production backend",
                "Mock data for a handful of facilities — not a national registry",
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 w-full gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg transition-all hover:shadow-primary/25">
              <Link to="/login">
                Open the app (static sign in)
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Card>
        </div>

        {/* Three pillars with enhanced styling */}
        <div className="mt-20">
          <div className="mb-10 text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">Our core commitments</h2>
            <div className="mt-2 h-1 w-20 bg-gradient-to-r from-primary to-primary/40 rounded-full mx-auto" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map((p, idx) => (
              <Card
                key={p.title}
                className="group relative overflow-hidden border-border/80 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${p.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <div className="relative">
                  <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-bold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}