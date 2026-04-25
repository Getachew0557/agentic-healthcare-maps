import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { fetchHospitalById } from "@/shared/services/hospitalService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BedStatusBadge } from "@/shared/components/Badges";
import { StatCard } from "@/shared/components/StatCard";
import { ArrowLeft, Phone, MapPin, Stethoscope, BedDouble, Activity, Clock, Ambulance, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/hospitals/$hospitalId")({
  loader: async ({ params }) => {
    const h = await fetchHospitalById(params.hospitalId);
    if (!h) throw notFound();
    return h;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Hospital"} — Agentic Healthcare Maps` },
      { name: "description", content: `${loaderData?.name} in ${loaderData?.city}: live bed availability, specialties, and emergency readiness.` },
    ],
  }),
  component: HospitalDetail,
  errorComponent: ({ error }) => <div className="p-10 text-center text-sm text-muted-foreground">Could not load hospital: {error.message}</div>,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-10 text-center">
      <p className="text-lg font-semibold">Hospital not found</p>
      <Button asChild className="mt-4"><Link to="/map">Back to map</Link></Button>
    </div>
  ),
});

function HospitalDetail() {
  const h = Route.useLoaderData() as import("@/shared/types").Hospital;
  const totalBeds = h.beds.icu.total + h.beds.general.total;
  const availBeds = h.beds.icu.available + h.beds.general.available;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <Link to="/map" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to map
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{h.name}</h1>
            <BedStatusBadge hospital={h} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {h.address}, {h.city}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {h.emergencyOpen && <Badge className="bg-emergency text-emergency-foreground">Emergency open</Badge>}
            {h.open24x7 && <Badge variant="outline">24/7</Badge>}
            {h.ambulanceAvailable && <Badge variant="outline" className="border-success/30 text-success">Ambulance available</Badge>}
            <Badge variant="outline">⭐ {h.rating}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`tel:${h.phone.replace(/\s/g, "")}`}><Phone className="mr-1 h-4 w-4" /> Call</a>
          </Button>
          <Button asChild className="shadow-glow-primary">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`} target="_blank" rel="noopener">
              Get directions
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Total beds" value={totalBeds} icon={<BedDouble className="h-5 w-5" />} />
        <StatCard label="Available" value={availBeds} hint={`${Math.round((availBeds / totalBeds) * 100)}% capacity free`} tone="success" icon={<Activity className="h-5 w-5" />} />
        <StatCard label="ICU available" value={h.beds.icu.available} hint={`of ${h.beds.icu.total}`} tone={h.beds.icu.available === 0 ? "emergency" : "primary"} icon={<ShieldAlert className="h-5 w-5" />} />
        <StatCard label="Travel time" value={`${h.travelTimeMin} min`} hint={`${h.distanceKm} km away`} icon={<Clock className="h-5 w-5" />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Availability</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Bar label="ICU" total={h.beds.icu.total} avail={h.beds.icu.available} />
            <Bar label="General" total={h.beds.general.total} avail={h.beds.general.available} />
            <Bar label="Ventilators" total={h.beds.ventilators.total} avail={h.beds.ventilators.available} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Contact & location</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-muted-foreground" /> {h.phone}</li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" /> {h.address}, {h.city}</li>
            <li className="flex items-start gap-2"><Ambulance className="mt-0.5 h-4 w-4 text-muted-foreground" /> Ambulance: {h.ambulanceAvailable ? "Available" : "Unavailable"}</li>
          </ul>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Stethoscope className="h-5 w-5 text-primary" /> Specialties & doctors</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {h.specialties.map((s) => (
              <Badge key={s} variant="outline" className="border-primary/20 bg-primary/5 text-primary">{s}</Badge>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {h.specialties.slice(0, 4).map((s, i) => (
              <div key={s} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Dr. {["A. Mehta", "S. Iyer", "R. Kulkarni", "P. Shah"][i]}</p>
                <p className="text-xs text-muted-foreground">{s} • Senior Consultant</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldAlert className="h-5 w-5 text-emergency" /> Emergency readiness</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <ReadyItem ok={h.emergencyOpen} label="Emergency department open" />
            <ReadyItem ok={h.beds.icu.available > 0} label="ICU bed available right now" />
            <ReadyItem ok={h.beds.ventilators.available > 0} label="Ventilator available" />
            <ReadyItem ok={h.ambulanceAvailable} label="Ambulance dispatchable" />
            <ReadyItem ok={h.open24x7} label="Operates 24/7" />
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Bar({ label, total, avail }: { label: string; total: number; avail: number }) {
  const pct = total ? (avail / total) * 100 : 0;
  const color = pct > 30 ? "bg-success" : pct > 0 ? "bg-warning" : "bg-emergency";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground"><span className="text-base font-semibold text-foreground">{avail}</span> / {total}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={"h-full transition-all " + color} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ReadyItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={"flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold " + (ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>{ok ? "✓" : "—"}</span>
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}
