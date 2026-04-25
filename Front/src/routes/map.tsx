import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHospitals } from "@/shared/services/hospitalService";
import { LoadingState } from "@/shared/components/LoadingState";
import { Card } from "@/components/ui/card";
import { BedStatusBadge } from "@/shared/components/Badges";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Hospital } from "@/shared/types";
import { useRealtimeAvailability } from "@/hooks/useRealtimeAvailability";

const HospitalMap = lazy(() => import("@/features/hospitals/HospitalMap").then((m) => ({ default: m.HospitalMap })));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Hospital Map — Agentic Healthcare Maps" },
      { name: "description", content: "Interactive map of hospitals with live bed availability, specialties, and travel time." },
    ],
  }),
  component: MapPage,
  ssr: false,
});

function MapPage() {
  useRealtimeAvailability();
  const { data: hospitals = [], isLoading } = useQuery({ queryKey: ["hospitals"], queryFn: fetchHospitals });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const filtered = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(query.toLowerCase()) ||
      h.city.toLowerCase().includes(query.toLowerCase()) ||
      h.specialties.some((s) => s.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[380px_1fr]">
      {/* Sidebar */}
      <aside className="flex flex-col border-r border-border bg-surface">
        <div className="border-b border-border p-4">
          <h1 className="text-lg font-semibold tracking-tight">Hospitals near you</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} matched • Mumbai & Pune</p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, city, specialty" className="pl-9" />
          </div>
          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
            <Legend color="bg-success" label="Available" />
            <Legend color="bg-warning" label="Low" />
            <Legend color="bg-emergency" label="Full" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading && <LoadingState label="Loading hospitals..." />}
          <div className="space-y-2">
            {filtered.map((h) => (
              <HospitalRow key={h.id} hospital={h} active={selectedId === h.id} onClick={() => setSelectedId(h.id)} />
            ))}
          </div>
        </div>
      </aside>

      {/* Map */}
      <div className="relative h-[60vh] lg:h-auto">
        {mounted ? (
          <Suspense fallback={<LoadingState label="Loading map..." />}>
            <HospitalMap hospitals={filtered} selectedId={selectedId} onSelect={(h) => setSelectedId(h.id)} />
          </Suspense>
        ) : (
          <LoadingState label="Loading map..." />
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={"h-2 w-2 rounded-full " + color} /> {label}
    </span>
  );
}

function HospitalRow({ hospital, active, onClick }: { hospital: Hospital; active: boolean; onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      className={"cursor-pointer p-3 transition-all hover:shadow-soft " + (active ? "ring-2 ring-primary" : "")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{hospital.name}</p>
          <p className="truncate text-xs text-muted-foreground">{hospital.address}</p>
        </div>
        <BedStatusBadge hospital={hospital} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{hospital.distanceKm} km • {hospital.travelTimeMin} min</span>
        <Link to="/hospitals/$hospitalId" params={{ hospitalId: hospital.id }} className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
          Details →
        </Link>
      </div>
    </Card>
  );
}
