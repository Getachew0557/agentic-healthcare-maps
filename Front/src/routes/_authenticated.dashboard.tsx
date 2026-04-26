import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { jwtDecode } from "jwt-decode";
import { getToken } from "@/lib/authStorage";
import type { AuthPayload } from "@/lib/authStorage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StatCard } from "@/shared/components/StatCard";
import {
  BedDouble,
  ShieldAlert,
  Wind,
  Ambulance,
  Activity,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/apiError";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ location }) => {
    const token = getToken();
    if (!token) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    try {
      const p = jwtDecode<AuthPayload>(token);
      if (p.exp * 1000 <= Date.now()) {
        throw redirect({ to: "/login", search: { redirect: location.href } });
      }
      if (p.role !== "hospital_staff") {
        throw redirect({ to: p.role === "admin" ? "/admin" : "/triage" });
      }
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as object)) throw e;
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  head: () => ({
    meta: [
      { title: "Staff Dashboard — ChatMap" },
      {
        name: "description",
        content: "Update your facility profile, specialties, and doctor directory.",
      },
    ],
  }),
  component: Dashboard,
});

type BackendHospital = {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  website?: string | null;
  lat: number;
  lng: number;
  is_24x7: boolean;
  status: "normal" | "busy" | "emergency_only";
  icu_total: number;
  icu_available: number;
  general_total: number;
  general_available: number;
  ventilators_available: number;
  specialties: string[];
};

type BackendSpecialty = { id: number; name: string };

type BackendDoctor = {
  id: number;
  hospital_id: number;
  name: string;
  specialty: string;
  phone: string | null;
  is_active: boolean;
  room: {
    id: number;
    room_code: string;
    room_type: string | null;
  } | null;
};

type BackendAvailabilityLog = {
  id: number;
  updated_by_user_id: number;
  field_name: string;
  old_value: string;
  new_value: string;
  created_at: string;
};

type HospitalForm = {
  name: string;
  address: string;
  phone: string;
  website: string;
  lat: string;
  lng: string;
  is_24x7: boolean;
  status: "normal" | "busy" | "emergency_only";
  icu_total: string;
  icu_available: string;
  general_total: string;
  general_available: string;
  ventilators_available: string;
};

function toForm(h: BackendHospital): HospitalForm {
  return {
    name: h.name,
    address: h.address,
    phone: h.phone ?? "",
    website: h.website ?? "",
    lat: String(h.lat),
    lng: String(h.lng),
    is_24x7: h.is_24x7,
    status: h.status,
    icu_total: String(h.icu_total),
    icu_available: String(h.icu_available),
    general_total: String(h.general_total),
    general_available: String(h.general_available),
    ventilators_available: String(h.ventilators_available),
  };
}

function Dashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<HospitalForm | null>(null);
  const [newSpec, setNewSpec] = useState("");

  const { data: selected, isLoading: loadingH } = useQuery({
    queryKey: ["hospital-dashboard-me"],
    queryFn: async () => {
      const { data } = await apiClient.get<BackendHospital>("/admin/hospitals/me");
      return data;
    },
    retry: 1,
  });

  useEffect(() => {
    if (selected) setForm(toForm(selected));
  }, [selected]);

  const { data: specialtyRows = [] } = useQuery({
    queryKey: ["hospital-specialties", selected?.id],
    enabled: Boolean(selected?.id),
    queryFn: async () => {
      const { data } = await apiClient.get<BackendSpecialty[]>(`/hospitals/${selected!.id}/specialties`);
      return data;
    },
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["hospital-doctors", selected?.id],
    enabled: Boolean(selected?.id),
    queryFn: async () => {
      const { data } = await apiClient.get<BackendDoctor[]>(`/hospitals/${selected!.id}/doctors`, {
        params: { active_only: false },
      });
      return data;
    },
  });

  const { data: updates } = useQuery({
    queryKey: ["hospital-dashboard-updates", selected?.id],
    enabled: Boolean(selected?.id),
    queryFn: async () => {
      const { data } = await apiClient.get<BackendAvailabilityLog[]>(
        `/admin/hospitals/${selected!.id}/availability-logs`,
        { params: { limit: 10 } },
      );
      return data;
    },
    retry: 1,
  });

  const saveHospital = useMutation({
    mutationFn: async (payload: HospitalForm) => {
      const body = {
        name: payload.name.trim(),
        address: payload.address.trim(),
        phone: payload.phone.trim() || null,
        website: payload.website.trim() || null,
        lat: Number(payload.lat),
        lng: Number(payload.lng),
        is_24x7: payload.is_24x7,
        status: payload.status,
        icu_total: Math.max(0, parseInt(payload.icu_total, 10) || 0),
        icu_available: Math.max(0, parseInt(payload.icu_available, 10) || 0),
        general_total: Math.max(0, parseInt(payload.general_total, 10) || 0),
        general_available: Math.max(0, parseInt(payload.general_available, 10) || 0),
        ventilators_available: Math.max(0, parseInt(payload.ventilators_available, 10) || 0),
      };
      if (!Number.isFinite(body.lat) || !Number.isFinite(body.lng)) {
        throw new Error("Latitude and longitude must be valid numbers.");
      }
      const { data } = await apiClient.patch<BackendHospital>("/admin/hospitals/me", body);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["hospital-dashboard-me"], data);
      setForm(toForm(data));
      void qc.invalidateQueries({ queryKey: ["hospital-dashboard-updates", data.id] });
      toast.success("Hospital profile updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not save profile")),
  });

  const addSpecialty = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiClient.post<BackendSpecialty>(`/hospitals/${selected!.id}/specialties`, { name });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospital-specialties"] });
      qc.invalidateQueries({ queryKey: ["hospital-dashboard-me"] });
      setNewSpec("");
      toast.success("Specialty added");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not add specialty")),
  });

  const delSpecialty = useMutation({
    mutationFn: async (specId: number) => {
      await apiClient.delete(`/hospitals/${selected!.id}/specialties/${specId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospital-specialties"] });
      qc.invalidateQueries({ queryKey: ["hospital-dashboard-me"] });
      toast.success("Specialty removed");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not remove specialty")),
  });

  const bedSummary = selected
    ? {
        icu: { total: selected.icu_total, available: selected.icu_available },
        general: { total: selected.general_total, available: selected.general_available },
        ventilators: { total: selected.ventilators_available, available: selected.ventilators_available },
      }
    : { icu: { total: 0, available: 0 }, general: { total: 0, available: 0 }, ventilators: { total: 0, available: 0 } };
  const emergencyOpen = selected ? selected.status !== "emergency_only" : false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-success/10 p-6 shadow-elevated">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Staff Dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">My hospital</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium">{user?.email}</span>. Edits are saved to the live API and map.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" onClick={logout}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total beds"
          value={bedSummary.icu.total + bedSummary.general.total}
          icon={<BedDouble className="h-5 w-5" />}
        />
        <StatCard
          label="ICU available"
          value={bedSummary.icu.available}
          hint={`of ${bedSummary.icu.total}`}
          tone={bedSummary.icu.available === 0 ? "emergency" : "primary"}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <StatCard
          label="General available"
          value={bedSummary.general.available}
          hint={`of ${bedSummary.general.total}`}
          tone="success"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Ventilators (avail.)"
          value={bedSummary.ventilators.available}
          hint="tracked as available count"
          tone="warning"
          icon={<Wind className="h-5 w-5" />}
        />
        <StatCard
          label="Emergency"
          value={emergencyOpen ? "OPEN" : "DIVERT"}
          tone={emergencyOpen ? "success" : "emergency"}
          icon={<Ambulance className="h-5 w-5" />}
        />
      </div>

      {loadingH || !form ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading your hospital link…</p>
      ) : (
        <Tabs defaultValue="profile" className="mt-8">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile &amp; location</TabsTrigger>
            <TabsTrigger value="specialties">Specialties</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border-primary/15 p-6">
              <h2 className="text-lg font-semibold">Facility details</h2>
              <p className="mt-1 text-sm text-muted-foreground">Address, phone, website, map coordinates, and bed counts.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="h-name">Hospital name</Label>
                  <Input
                    id="h-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="h-addr">Address</Label>
                  <Textarea
                    id="h-addr"
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm((f) => (f ? { ...f, address: e.target.value } : f))}
                  />
                </div>
                <div>
                  <Label htmlFor="h-phone">Phone</Label>
                  <Input
                    id="h-phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => (f ? { ...f, phone: e.target.value } : f))}
                  />
                </div>
                <div>
                  <Label htmlFor="h-web">Website</Label>
                  <Input
                    id="h-web"
                    placeholder="https://…"
                    value={form.website}
                    onChange={(e) => setForm((f) => (f ? { ...f, website: e.target.value } : f))}
                  />
                </div>
                <div>
                  <Label htmlFor="h-lat">Latitude</Label>
                  <Input
                    id="h-lat"
                    value={form.lat}
                    onChange={(e) => setForm((f) => (f ? { ...f, lat: e.target.value } : f))}
                  />
                </div>
                <div>
                  <Label htmlFor="h-lng">Longitude</Label>
                  <Input
                    id="h-lng"
                    value={form.lng}
                    onChange={(e) => setForm((f) => (f ? { ...f, lng: e.target.value } : f))}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="h-247"
                    checked={form.is_24x7}
                    onCheckedChange={(v) => setForm((f) => (f ? { ...f, is_24x7: v } : f))}
                  />
                  <Label htmlFor="h-247">24/7 operations</Label>
                </div>
                <div>
                  <Label>Service status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v: "normal" | "busy" | "emergency_only") =>
                      setForm((f) => (f ? { ...f, status: v } : f))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="emergency_only">Emergency only / divert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ICU total / available</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={form.icu_total}
                      onChange={(e) => setForm((f) => (f ? { ...f, icu_total: e.target.value } : f))}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={form.icu_available}
                      onChange={(e) => setForm((f) => (f ? { ...f, icu_available: e.target.value } : f))}
                    />
                  </div>
                </div>
                <div>
                  <Label>General beds total / available</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={form.general_total}
                      onChange={(e) => setForm((f) => (f ? { ...f, general_total: e.target.value } : f))}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={form.general_available}
                      onChange={(e) => setForm((f) => (f ? { ...f, general_available: e.target.value } : f))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="h-v">Ventilators (available count)</Label>
                  <Input
                    id="h-v"
                    type="number"
                    min={0}
                    value={form.ventilators_available}
                    onChange={(e) => setForm((f) => (f ? { ...f, ventilators_available: e.target.value } : f))}
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={() => form && saveHospital.mutate(form)} disabled={saveHospital.isPending}>
                  {saveHospital.isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/map" className="inline-flex items-center">
                    <MapPin className="mr-1 h-4 w-4" /> View on map
                  </Link>
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="specialties">
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Service lines (specialties)</h2>
              <p className="mt-1 text-sm text-muted-foreground">Used for triage and map filters. Use lowercase slugs, e.g. <code>cardiology</code>.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Input
                  placeholder="e.g. neurology"
                  className="max-w-sm"
                  value={newSpec}
                  onChange={(e) => setNewSpec(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const n = newSpec.trim();
                    if (!n || !selected) return;
                    addSpecialty.mutate(n);
                  }}
                  disabled={addSpecialty.isPending}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {specialtyRows.map((s) => (
                  <li key={s.id}>
                    <Badge variant="secondary" className="gap-1 pr-1">
                      {s.name}
                      <button
                        type="button"
                        className="rounded p-0.5 hover:bg-background/80"
                        aria-label="Remove"
                        onClick={() => {
                          if (confirm("Remove this specialty?")) delSpecialty.mutate(s.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  </li>
                ))}
                {specialtyRows.length === 0 && <p className="text-sm text-muted-foreground">No specialties yet.</p>}
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="doctors">
            <DoctorsPanel hospitalId={selected.id} doctors={doctors} />
          </TabsContent>

          <TabsContent value="activity">
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Recent bed / availability changes</h2>
              <ul className="mt-4 space-y-3">
                {(updates ?? []).map((u) => (
                  <li key={u.id} className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-sm font-medium">{selected.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.field_name}: {u.old_value} → {u.new_value}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      User #{u.updated_by_user_id} • {new Date(u.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
                {(updates ?? []).length === 0 && <p className="text-sm text-muted-foreground">No log entries yet.</p>}
              </ul>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function DoctorsPanel({ hospitalId, doctors }: { hospitalId: number; doctors: BackendDoctor[] }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<BackendDoctor | null>(null);
  const [name, setName] = useState("");
  const [spec, setSpec] = useState("");
  const [phone, setPhone] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomType, setRoomType] = useState("");
  const [edName, setEdName] = useState("");
  const [edSpec, setEdSpec] = useState("");
  const [edPhone, setEdPhone] = useState("");

  useEffect(() => {
    if (!edit) return;
    setEdName(edit.name);
    setEdSpec(edit.specialty);
    setEdPhone(edit.phone ?? "");
    setRoomCode(edit.room?.room_code ?? "");
    setRoomType(edit.room?.room_type ?? "");
  }, [edit]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["hospital-doctors", hospitalId] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<BackendDoctor>(`/hospitals/${hospitalId}/doctors`, {
        name: name.trim(),
        specialty: spec.trim(),
        phone: phone.trim() || null,
      });
      return data;
    },
    onSuccess: () => {
      invalidate();
      setName("");
      setSpec("");
      setPhone("");
      toast.success("Doctor added");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not add doctor")),
  });

  const update = useMutation({
    mutationFn: async (payload: { id: number; body: { name?: string; specialty?: string; phone?: string | null; is_active?: boolean } }) => {
      const { data } = await apiClient.patch<BackendDoctor>(`/hospitals/${hospitalId}/doctors/${payload.id}`, payload.body);
      return data;
    },
    onSuccess: () => {
      invalidate();
      setEdit(null);
      toast.success("Doctor updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not update doctor")),
  });

  const remove = useMutation({
    mutationFn: async (doctorId: number) => {
      await apiClient.delete(`/hospitals/${hospitalId}/doctors/${doctorId}`);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Doctor deactivated (soft delete)");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not deactivate doctor")),
  });

  const assignRoom = useMutation({
    mutationFn: async (doctorId: number) => {
      const { data } = await apiClient.post(`/hospitals/${hospitalId}/doctors/${doctorId}/room`, {
        room_code: roomCode.trim(),
        room_type: roomType.trim() || null,
      });
      return data;
    },
    onSuccess: () => {
      invalidate();
      setRoomCode("");
      setRoomType("");
      toast.success("Room saved");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not assign room")),
  });

  const clearRoom = useMutation({
    mutationFn: async (doctorId: number) => {
      await apiClient.delete(`/hospitals/${hospitalId}/doctors/${doctorId}/room`);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Room cleared");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not clear room")),
  });

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Doctors</h2>
          <p className="text-sm text-muted-foreground">Add, edit, or deactivate. Rooms power patient-facing triage (no fake rooms).</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Add doctor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New doctor</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Specialty (e.g. cardiology, internal_medicine)</Label>
                <Input value={spec} onChange={(e) => setSpec(e.target.value)} />
              </div>
              <div>
                <Label>Phone (optional)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => name.trim() && spec.trim() && create.mutate()} disabled={create.isPending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2 pr-2">Name</th>
              <th className="py-2 pr-2">Specialty</th>
              <th className="py-2 pr-2">Phone</th>
              <th className="py-2 pr-2">Room</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => (
              <tr key={d.id} className="border-b border-border/60">
                <td className="py-2 pr-2 font-medium">{d.name}</td>
                <td className="py-2 pr-2">{d.specialty}</td>
                <td className="py-2 pr-2 text-muted-foreground">{d.phone ?? "—"}</td>
                <td className="py-2 pr-2">
                  {d.room ? (
                    <span className="text-xs">
                      {d.room.room_code}
                      {d.room.room_type ? ` · ${d.room.room_type}` : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700">Not on file</span>
                  )}
                </td>
                <td className="py-2 pr-2">
                  <Badge variant={d.is_active ? "default" : "secondary"}>{d.is_active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEdit(d)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {d.is_active ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Deactivate this doctor? They will be hidden from public lists.")) remove.mutate(d.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => update.mutate({ id: d.id, body: { is_active: true } })}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {doctors.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No doctors yet. Add your team above.</p>}
      </div>

      {edit && (
        <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {edit.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label htmlFor="ed-name">Name</Label>
                <Input id="ed-name" value={edName} onChange={(e) => setEdName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ed-spec">Specialty</Label>
                <Input id="ed-spec" value={edSpec} onChange={(e) => setEdSpec(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ed-ph">Phone</Label>
                <Input id="ed-ph" value={edPhone} onChange={(e) => setEdPhone(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                onClick={() =>
                  update.mutate({
                    id: edit.id,
                    body: { name: edName, specialty: edSpec, phone: edPhone.trim() || null },
                  })
                }
                disabled={update.isPending}
              >
                Save
              </Button>
            </DialogFooter>
            <div className="mt-2 rounded-lg border border-dashed p-3">
              <p className="text-xs font-medium">Room assignment</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Input
                  placeholder="Room code (e.g. ICU-2)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                />
                <Input
                  placeholder="Type (optional: consultation / icu / ward)"
                  className="max-w-xs"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => roomCode.trim() && assignRoom.mutate(edit.id)}
                  disabled={assignRoom.isPending}
                >
                  Set room
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => clearRoom.mutate(edit.id)}>
                  Clear room
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
