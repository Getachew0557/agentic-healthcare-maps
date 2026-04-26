import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchHospitals,
  fetchRecentUpdates,
  updateHospitalAvailability,
} from "@/shared/services/hospitalService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/shared/components/StatCard";
import { LoadingState } from "@/shared/components/LoadingState";
import {
  BedDouble,
  ShieldAlert,
  Wind,
  Ambulance,
  Activity,
  Clock,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { buildAvailabilitySchema, type AvailabilityInput } from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeAvailability } from "@/hooks/useRealtimeAvailability";
import {
  deleteVectorRecord,
  fetchVectorRecords,
  getStoredTavilyApiKey,
  setStoredTavilyApiKey,
  upsertVectorRecord,
  updateHospitalForAdmin,
} from "@/shared/services/adminService";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Staff Dashboard — Agentic Healthcare Maps" },
      {
        name: "description",
        content:
          "Hospital staff dashboard to update bed availability and emergency status.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { user, logout } = useAuth();
  useRealtimeAvailability();

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ["hospitals"],
    queryFn: fetchHospitals,
  });
  const { data: updates = [] } = useQuery({
    queryKey: ["recent-updates"],
    queryFn: fetchRecentUpdates,
  });
  const { data: vectors = [] } = useQuery({
    queryKey: ["hospital-vector", selId],
    queryFn: () => fetchVectorRecords(selId ?? ""),
    enabled: !!selId,
  });

  const [selId, setSelId] = useState<string | null>(null);
  useEffect(() => {
    if (selId || hospitals.length === 0) return;
    setSelId(user?.hospitalId ?? hospitals[0].id);
  }, [hospitals, selId, user?.hospitalId]);

  const selected = hospitals.find((h) => h.id === selId) ?? hospitals[0];

  const schema = useMemo(
    () =>
      selected
        ? buildAvailabilitySchema({
            icu: selected.beds.icu.total,
            general: selected.beds.general.total,
            ventilators: selected.beds.ventilators.total,
          })
        : null,
    [selected],
  );

  const form = useForm<AvailabilityInput>({
    resolver: schema ? zodResolver(schema) : undefined,
    values: selected
      ? {
          icu: selected.beds.icu.available,
          general: selected.beds.general.available,
          ventilators: selected.beds.ventilators.available,
          ambulanceAvailable: selected.ambulanceAvailable,
          emergencyOpen: selected.emergencyOpen,
        }
      : undefined,
    mode: "onBlur",
  });

  const mutation = useMutation({
    mutationFn: (data: AvailabilityInput) =>
      updateHospitalAvailability(selected!.id, {
        icu: { total: selected!.beds.icu.total, available: data.icu },
        general: { total: selected!.beds.general.total, available: data.general },
        ventilators: {
          total: selected!.beds.ventilators.total,
          available: data.ventilators,
        },
        ambulanceAvailable: data.ambulanceAvailable,
        emergencyOpen: data.emergencyOpen,
      }),
    onSuccess: () => {
      toast.success("Availability updated — propagating to triage & map");
      qc.invalidateQueries({ queryKey: ["hospitals"] });
      qc.invalidateQueries({ queryKey: ["hospital", selected?.id] });
    },
    onError: () => toast.error("Failed to update — please try again"),
  });
  const profileMutation = useMutation({
    mutationFn: (payload: { name: string; address: string; city: string; phone: string; specialties: string[] }) =>
      updateHospitalForAdmin(selected!.id, payload),
    onSuccess: () => {
      toast.success("Hospital profile updated");
      qc.invalidateQueries({ queryKey: ["hospitals"] });
    },
    onError: () => toast.error("Profile update failed"),
  });
  const vectorMutation = useMutation({
    mutationFn: upsertVectorRecord,
    onSuccess: () => {
      toast.success("Knowledge chunk stored in vector records");
      qc.invalidateQueries({ queryKey: ["hospital-vector", selId] });
    },
  });
  const removeVectorMutation = useMutation({
    mutationFn: deleteVectorRecord,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hospital-vector", selId] }),
  });

  const [profile, setProfile] = useState({ name: "", address: "", city: "", phone: "", specialties: "" });
  const [knowledge, setKnowledge] = useState({
    title: "",
    illness: "",
    doctorName: "",
    room: "",
    notes: "",
    source: "manual",
  });
  const [tavilyKey, setTavilyKey] = useState("");

  useEffect(() => {
    if (!selected) return;
    setProfile({
      name: selected.name,
      address: selected.address,
      city: selected.city,
      phone: selected.phone,
      specialties: selected.specialties.join(", "),
    });
  }, [selected?.id]);

  useEffect(() => {
    setTavilyKey(getStoredTavilyApiKey());
  }, []);

  if (isLoading || !selected || !schema)
    return (
      <div className="p-10">
        <LoadingState />
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-success/10 p-6 shadow-elevated">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Staff Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            Live availability
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium">{user?.email}</span>. Updates
            propagate to triage & map in real time.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-full max-w-xs">
            <Label className="mb-1.5 block text-xs">Hospital</Label>
            <Select value={selected.id} onValueChange={(v) => setSelId(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hospitals.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total beds"
          value={selected.beds.icu.total + selected.beds.general.total}
          icon={<BedDouble className="h-5 w-5" />}
        />
        <StatCard
          label="ICU available"
          value={selected.beds.icu.available}
          hint={`of ${selected.beds.icu.total}`}
          tone={selected.beds.icu.available === 0 ? "emergency" : "primary"}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <StatCard
          label="General available"
          value={selected.beds.general.available}
          hint={`of ${selected.beds.general.total}`}
          tone="success"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Ventilators"
          value={selected.beds.ventilators.available}
          hint={`of ${selected.beds.ventilators.total}`}
          tone="warning"
          icon={<Wind className="h-5 w-5" />}
        />
        <StatCard
          label="Emergency"
          value={selected.emergencyOpen ? "OPEN" : "CLOSED"}
          tone={selected.emergencyOpen ? "success" : "emergency"}
          icon={<Ambulance className="h-5 w-5" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="border-primary/15 bg-card/90 p-6 shadow-soft lg:col-span-2">
          <h2 className="text-lg font-semibold">Update availability</h2>
          <p className="text-xs text-muted-foreground">
            Available beds cannot exceed total or be negative.
          </p>
          <form
            onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
            className="mt-5 space-y-5"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <NumField
                label={`ICU (max ${selected.beds.icu.total})`}
                error={form.formState.errors.icu?.message}
                {...form.register("icu", { valueAsNumber: true })}
              />
              <NumField
                label={`General (max ${selected.beds.general.total})`}
                error={form.formState.errors.general?.message}
                {...form.register("general", { valueAsNumber: true })}
              />
              <NumField
                label={`Ventilators (max ${selected.beds.ventilators.total})`}
                error={form.formState.errors.ventilators?.message}
                {...form.register("ventilators", { valueAsNumber: true })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ToggleRow
                label="Ambulance available"
                checked={form.watch("ambulanceAvailable")}
                onCheckedChange={(b) => form.setValue("ambulanceAvailable", b)}
              />
              <ToggleRow
                label="Emergency department open"
                checked={form.watch("emergencyOpen")}
                onCheckedChange={(b) => form.setValue("emergencyOpen", b)}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => form.reset()}
                disabled={mutation.isPending}
              >
                Reset
              </Button>
              <Button type="submit" size="lg" disabled={mutation.isPending} className="shadow-glow-primary">
                {mutation.isPending ? "Saving..." : "Save update"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="border-border/70 bg-card/90 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5 text-primary" /> Recent updates
            </h2>
          </div>
          <ul className="mt-4 space-y-3">
            {updates.map((u) => (
              <li key={u.id} className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium">{u.hospitalName}</p>
                <p className="text-xs text-muted-foreground">{u.note}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {u.changedBy} • {u.timestamp}
                </p>
              </li>
            ))}
          </ul>
          <Button variant="outline" asChild className="mt-4 w-full">
            <Link to="/map">
              View on map <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </Card>

        <Card className="border-success/20 bg-card/90 p-6 shadow-soft lg:col-span-2">
          <h2 className="text-lg font-semibold">Hospital profile (editable)</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Hospital name" value={profile.name} onChange={(v) => setProfile((s) => ({ ...s, name: v }))} />
            <Field label="Phone" value={profile.phone} onChange={(v) => setProfile((s) => ({ ...s, phone: v }))} />
            <Field label="Address" value={profile.address} onChange={(v) => setProfile((s) => ({ ...s, address: v }))} />
            <Field label="City" value={profile.city} onChange={(v) => setProfile((s) => ({ ...s, city: v }))} />
          </div>
          <div className="mt-3">
            <Field label="Specialties (comma separated)" value={profile.specialties} onChange={(v) => setProfile((s) => ({ ...s, specialties: v }))} />
          </div>
          <Button
            className="mt-3 shadow-glow-success"
            onClick={() =>
              profileMutation.mutate({
                ...profile,
                specialties: profile.specialties.split(",").map((x) => x.trim()).filter(Boolean),
              })
            }
            disabled={profileMutation.isPending}
          >
            {profileMutation.isPending ? "Saving..." : "Save profile"}
          </Button>
        </Card>

        <Card className="border-warning/30 bg-gradient-to-br from-warning/10 via-card to-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Tavily API (hospital-side)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Store your key locally for chat grounding. In production, keep this key on backend only.
          </p>
          <Label className="mb-1.5 mt-4 block text-xs">Tavily API key</Label>
          <Input
            type="password"
            value={tavilyKey}
            onChange={(e) => setTavilyKey(e.target.value)}
            placeholder="tvly-..."
          />
          <Button
            className="mt-3 w-full"
            onClick={() => {
              setStoredTavilyApiKey(tavilyKey);
              toast.success("Tavily key saved locally");
            }}
          >
            Save key
          </Button>
        </Card>

        <Card className="border-primary/15 bg-card/95 p-6 shadow-soft lg:col-span-3">
          <h2 className="text-lg font-semibold">Doctor/illness knowledge to Vector DB input</h2>
          <p className="text-xs text-muted-foreground">
            Add or update structured chunks that AI can retrieve quickly (doctor names, rooms, condition pathways).
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Field label="Title" value={knowledge.title} onChange={(v) => setKnowledge((s) => ({ ...s, title: v }))} />
            <Field label="Illness" value={knowledge.illness} onChange={(v) => setKnowledge((s) => ({ ...s, illness: v }))} />
            <Field label="Doctor name" value={knowledge.doctorName} onChange={(v) => setKnowledge((s) => ({ ...s, doctorName: v }))} />
            <Field label="Room (optional)" value={knowledge.room} onChange={(v) => setKnowledge((s) => ({ ...s, room: v }))} />
            <Field label="Source (manual/document/api)" value={knowledge.source} onChange={(v) => setKnowledge((s) => ({ ...s, source: v }))} />
          </div>
          <div className="mt-3">
            <Label className="mb-1.5 block text-xs">Notes</Label>
            <Textarea
              value={knowledge.notes}
              onChange={(e) => setKnowledge((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Example: Acute chest pain after 40 min -> route to Cardiology ER, Dr. A. Sharma, Room C-12..."
            />
          </div>
            <Button
            className="mt-3 shadow-glow-primary"
            onClick={() =>
              vectorMutation.mutate({
                hospitalId: selected.id,
                title: knowledge.title,
                illness: knowledge.illness,
                doctorName: knowledge.doctorName,
                room: knowledge.room || undefined,
                notes: knowledge.notes,
                source: (knowledge.source as "manual" | "document" | "api") ?? "manual",
              })
            }
            disabled={!knowledge.title || !knowledge.notes}
          >
            Push knowledge chunk
          </Button>
          <div className="mt-4 space-y-2">
            {vectors.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/70 p-3">
                <div>
                  <p className="text-sm font-medium">{item.title} · {item.illness}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.doctorName} {item.room ? `• Room ${item.room}` : "• Room not on file"} • {item.source}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeVectorMutation.mutate(item.id)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

const NumField = ({
  label,
  error,
  ...props
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <Input type="number" min={0} step={1} aria-invalid={!!error} {...props} />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
};

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (b: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
