import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Activity, Brain, BedDouble, Route as RouteIcon, FileScan, ArrowRight, MapPin, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agentic Healthcare Maps — AI hospital routing for India" },
      { name: "description", content: "Describe your symptoms and we route you to the nearest hospital with the right specialty, available beds, and shortest travel time." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[var(--gradient-hero)]" />
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, oklch(0.55 0.18 245 / 0.15), transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.62 0.16 155 / 0.12), transparent 50%)",
          }}
        />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Live data from 8+ hospitals in Mumbai & Pune
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Find the <span className="text-primary">right hospital</span><br className="hidden md:block" /> before it's too late.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              In an emergency, calling around to check ICU beds, specialists, and ambulances wastes critical minutes. We
              triage your symptoms with AI, then route you to the nearest hospital that can actually treat you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base shadow-glow-primary">
                <Link to="/triage">
                  Find Hospital Now <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
                <Link to="/map">
                  <MapPin className="mr-1 h-4 w-4" /> Open hospital map
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Privacy-first</div>
              <div className="flex items-center gap-1.5"><Activity className="h-4 w-4 text-primary" /> Real-time bed data</div>
              <div className="flex items-center gap-1.5"><Brain className="h-4 w-4 text-emergency" /> AI triage</div>
            </div>
          </div>

          {/* Mock device card */}
          <div className="relative">
            <Card className="relative overflow-hidden border-border/60 bg-card/80 p-6 shadow-elevated backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Live triage</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emergency/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emergency">
                  <span className="h-1.5 w-1.5 rounded-full bg-emergency animate-pulse" /> Critical
                </span>
              </div>
              <p className="mt-3 text-sm font-medium">"Chest pain and difficulty breathing"</p>
              <div className="mt-4 space-y-3">
                {[
                  { name: "Jaslok Hospital", score: 94, beds: "3 ICU", time: "8 min", tone: "warning" as const },
                  { name: "P. D. Hinduja Hospital", score: 91, beds: "9 ICU", time: "12 min", tone: "success" as const },
                  { name: "KEM Hospital", score: 88, beds: "12 ICU", time: "15 min", tone: "success" as const },
                ].map((h) => (
                  <div key={h.name} className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated p-3">
                    <div>
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{h.beds} • {h.time} away</p>
                    </div>
                    <div className={"flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold " + (h.tone === "success" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground")}>
                      {h.score}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">From symptoms to the right ER in three steps.</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", title: "Describe what's happening", body: "Type symptoms in plain language. No medical jargon required." },
              { n: "02", title: "AI triages & ranks hospitals", body: "We match the case to specialty, urgency, and current bed availability." },
              { n: "03", title: "Route & call ahead", body: "Get directions, ETA, and the hospital's emergency line in one tap." },
            ].map((s) => (
              <Card key={s.n} className="p-6">
                <p className="text-3xl font-bold tracking-tight text-primary/30">{s.n}</p>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">What's inside</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Everything an emergency needs, in one place.</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Brain, title: "AI symptom triage", body: "Specialty + urgency from natural-language symptom descriptions.", tone: "bg-primary/10 text-primary" },
            { icon: BedDouble, title: "Real-time bed availability", body: "ICU, general, and ventilator counts updated by hospital staff.", tone: "bg-success/10 text-success" },
            { icon: RouteIcon, title: "Smart hospital routing", body: "Ranks hospitals by specialty match, beds, and travel time.", tone: "bg-warning/15 text-warning-foreground" },
            { icon: FileScan, title: "Messy data ingestion", body: "Upload PDFs, images, CSVs — we extract structured records.", tone: "bg-emergency/10 text-emergency" },
          ].map((f) => (
            <Card key={f.title} className="group p-6 transition-all hover:-translate-y-0.5 hover:shadow-elevated">
              <div className={"flex h-11 w-11 items-center justify-center rounded-xl " + f.tone}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/70 p-10 text-primary-foreground shadow-glow-primary md:p-14">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">Don't search. Get routed.</h3>
              <p className="mt-2 max-w-xl text-sm text-primary-foreground/80 md:text-base">
                Try the live demo with mock Mumbai & Pune hospital data.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="h-12 px-6 text-base">
              <Link to="/triage">Start triage <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}
