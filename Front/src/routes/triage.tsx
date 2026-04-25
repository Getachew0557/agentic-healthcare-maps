import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Brain, ArrowRight, Sparkles, Zap } from "lucide-react";
import { SYMPTOM_EXAMPLES } from "@/shared/data/mockData";
import { analyzeSymptoms } from "@/shared/services/hospitalService";
import { LoadingState } from "@/shared/components/LoadingState";
import { UrgencyBadge } from "@/shared/components/Badges";
import { useRealtimeAvailability } from "@/hooks/useRealtimeAvailability";
import { symptomSchema, type SymptomInput } from "@/lib/schemas";
import { toast } from "sonner";

const DEMO_SCENARIO =
  "My mother has sudden chest pain and difficulty breathing, started 15 minutes ago and she's sweating heavily.";

export const Route = createFileRoute("/triage")({
  head: () => ({
    meta: [
      { title: "Symptom Search — Agentic Healthcare Maps" },
      {
        name: "description",
        content:
          "Describe your symptoms in plain language and get an AI-triaged list of recommended hospitals.",
      },
    ],
  }),
  component: TriagePage,
});

function TriagePage() {
  useRealtimeAvailability();
  const navigate = useNavigate();

  const form = useForm<SymptomInput>({
    resolver: zodResolver(symptomSchema),
    defaultValues: { text: "" },
    mode: "onSubmit",
  });

  const mutation = useMutation({
    mutationFn: ({ text }: SymptomInput) => analyzeSymptoms(text),
    onError: () => toast.error("Triage failed — please try again"),
  });

  function fillDemo() {
    form.setValue("text", DEMO_SCENARIO);
    form.handleSubmit((d) => mutation.mutate(d))();
  }

  const result = mutation.data;
  const loading = mutation.isPending;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Describe what's happening
            </h1>
            <p className="text-sm text-muted-foreground">
              Decision support — not a medical diagnosis.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={fillDemo}
          disabled={loading}
          className="border-emergency/40 text-emergency hover:bg-emergency/5 hover:text-emergency"
        >
          <Zap className="mr-1 h-4 w-4" /> Demo scenario
        </Button>
      </div>

      <Card className="mt-6 p-5">
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} noValidate>
          <Textarea
            rows={5}
            placeholder="e.g. My father has crushing chest pain and is sweating heavily, started 20 minutes ago..."
            aria-invalid={!!form.formState.errors.text}
            className="resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            {...form.register("text")}
          />
          {form.formState.errors.text && (
            <p className="mt-1 text-xs text-destructive">
              {form.formState.errors.text.message}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {SYMPTOM_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => form.setValue("text", ex, { shouldValidate: true })}
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Mock AI demo. Not for clinical use.
            </p>
            <Button type="submit" disabled={loading} size="lg" className="shadow-glow-primary">
              <Sparkles className="mr-1 h-4 w-4" />
              {loading ? "Analyzing..." : "Analyze symptoms"}
            </Button>
          </div>
        </form>
      </Card>

      {loading && (
        <Card className="mt-6 p-8">
          <LoadingState label="Triaging symptoms and ranking hospitals..." />
        </Card>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Assessment
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  {result.specialty}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
              </div>
              <UrgencyBadge urgency={result.urgency} />
            </div>
            {result.redFlags.length > 0 && (
              <div className="mt-4 rounded-lg border border-emergency/20 bg-emergency/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-emergency">
                  Red flags
                </p>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {result.redFlags.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emergency" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <div>
            <div className="mb-3 flex items-end justify-between">
              <h3 className="text-lg font-semibold">Top recommended hospitals</h3>
              <Button variant="outline" onClick={() => navigate({ to: "/map" })}>
                View on map <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {result.recommendedHospitals.map((r, idx) => (
                <Card
                  key={r.hospital.id}
                  className="flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      #{idx + 1} match
                    </span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                      {r.matchScore}
                    </div>
                  </div>
                  <h4 className="mt-2 text-base font-semibold">{r.hospital.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {r.hospital.address}, {r.hospital.city}
                  </p>
                  <p className="mt-3 text-sm">{r.reason}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-secondary p-2">
                      <p className="font-semibold">{r.hospital.distanceKm} km</p>
                      <p className="text-muted-foreground">distance</p>
                    </div>
                    <div className="rounded-md bg-secondary p-2">
                      <p className="font-semibold">{r.hospital.travelTimeMin} min</p>
                      <p className="text-muted-foreground">travel</p>
                    </div>
                    <div className="rounded-md bg-secondary p-2">
                      <p className="font-semibold">{r.hospital.beds.icu.available}</p>
                      <p className="text-muted-foreground">ICU</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={`tel:${r.hospital.phone}`}>Call</a>
                    </Button>
                    <Button asChild size="sm" variant={idx === 0 ? "default" : "outline"}>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${r.hospital.lat},${r.hospital.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Directions
                      </a>
                    </Button>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="mt-2">
                    <Link
                      to="/hospitals/$hospitalId"
                      params={{ hospitalId: r.hospital.id }}
                    >
                      View hospital details
                    </Link>
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
