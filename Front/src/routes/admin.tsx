import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  createAdminUser,
  createHospitalForAdmin,
  deleteAdminUser,
  deleteHospitalForAdmin,
  fetchAdminUsers,
  fetchHospitalsForAdmin,
  fetchVectorRecords,
  upsertVectorRecord,
} from "@/shared/services/adminService";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Agentic Healthcare Maps" },
      { name: "description", content: "Overview analytics for hospitals, beds, emergency readiness, and ingestion jobs." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: fetchAdminUsers });
  const { data: hospitals = [] } = useQuery({ queryKey: ["admin-hospitals"], queryFn: fetchHospitalsForAdmin });
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("h-kem");
  const { data: vectorRows = [] } = useQuery({
    queryKey: ["admin-vector", selectedHospitalId],
    queryFn: () => fetchVectorRecords(selectedHospitalId),
    enabled: !!selectedHospitalId,
  });

  const [newUser, setNewUser] = useState({ fullName: "", email: "", role: "patient", hospitalId: "" });
  const [newHospital, setNewHospital] = useState({ name: "", address: "", city: "", phone: "", specialties: "" });
  const [newVector, setNewVector] = useState({
    title: "",
    illness: "",
    doctorName: "",
    room: "",
    notes: "",
    source: "manual",
  });

  const createUserMut = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      toast.success("User created");
      setNewUser({ fullName: "", email: "", role: "patient", hospitalId: "" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteUserMut = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const createHospitalMut = useMutation({
    mutationFn: createHospitalForAdmin,
    onSuccess: () => {
      toast.success("Hospital added");
      setNewHospital({ name: "", address: "", city: "", phone: "", specialties: "" });
      qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteHospitalMut = useMutation({
    mutationFn: deleteHospitalForAdmin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
      toast.success("Hospital removed");
    },
  });

  const createVectorMut = useMutation({
    mutationFn: upsertVectorRecord,
    onSuccess: () => {
      toast.success("Vector knowledge updated");
      setNewVector({ title: "", illness: "", doctorName: "", room: "", notes: "", source: "manual" });
      qc.invalidateQueries({ queryKey: ["admin-vector", selectedHospitalId] });
    },
  });

  const counts = useMemo(
    () => ({
      patients: users.filter((u) => u.role === "patient").length,
      staff: users.filter((u) => u.role === "staff").length,
      admins: users.filter((u) => u.role === "admin").length,
    }),
    [users],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-success/10 p-6 shadow-elevated">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Admin control</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Users + Hospitals + Vector Data</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          MongoDB scope: users/auth/contacts. Vector scope: hospitals, doctors, illness notes, and triage knowledge.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <QuickStat label="Hospitals" value={hospitals.length} />
        <QuickStat label="Patients" value={counts.patients} />
        <QuickStat label="Hospital staff" value={counts.staff} />
        <QuickStat label="Admins" value={counts.admins} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="border-primary/15 bg-card/90 p-6 shadow-soft lg:col-span-2">
          <h2 className="text-lg font-semibold">Users CRUD (MongoDB)</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Full name" value={newUser.fullName} onChange={(v) => setNewUser((s) => ({ ...s, fullName: v }))} />
            <Field label="Email" value={newUser.email} onChange={(v) => setNewUser((s) => ({ ...s, email: v }))} />
            <Field label="Role (admin/staff/patient)" value={newUser.role} onChange={(v) => setNewUser((s) => ({ ...s, role: v }))} />
            <Field label="Hospital ID (staff only)" value={newUser.hospitalId} onChange={(v) => setNewUser((s) => ({ ...s, hospitalId: v }))} />
          </div>
          <Button
            className="mt-3 shadow-glow-primary"
            onClick={() =>
              createUserMut.mutate({
                fullName: newUser.fullName,
                email: newUser.email,
                role: (newUser.role as "admin" | "staff" | "patient") ?? "patient",
                hospitalId: newUser.hospitalId || undefined,
              })
            }
            disabled={!newUser.fullName || !newUser.email}
          >
            Add user
          </Button>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-medium">Name</th>
                  <th className="py-2 text-left font-medium">Email</th>
                  <th className="py-2 text-left font-medium">Role</th>
                  <th className="py-2 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/80 last:border-0">
                    <td className="py-3 font-medium">{u.fullName}</td>
                    <td className="py-3 text-muted-foreground">{u.email}</td>
                    <td className="py-3"><Badge variant="outline">{u.role}</Badge></td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm" onClick={() => deleteUserMut.mutate(u.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border-success/20 bg-card/90 p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Hospitals CRUD (MongoDB login info only)</h2>
          <div className="mt-4 space-y-2">
            <Field label="Name" value={newHospital.name} onChange={(v) => setNewHospital((s) => ({ ...s, name: v }))} />
            <Field label="Address" value={newHospital.address} onChange={(v) => setNewHospital((s) => ({ ...s, address: v }))} />
            <Field label="City" value={newHospital.city} onChange={(v) => setNewHospital((s) => ({ ...s, city: v }))} />
            <Field label="Phone" value={newHospital.phone} onChange={(v) => setNewHospital((s) => ({ ...s, phone: v }))} />
            <Field label="Specialties (comma separated)" value={newHospital.specialties} onChange={(v) => setNewHospital((s) => ({ ...s, specialties: v }))} />
          </div>
          <Button
            className="mt-3 w-full shadow-glow-success"
            onClick={() =>
              createHospitalMut.mutate({
                name: newHospital.name,
                address: newHospital.address,
                city: newHospital.city,
                phone: newHospital.phone,
                specialties: newHospital.specialties.split(",").map((x) => x.trim()).filter(Boolean),
                lat: 19.07,
                lng: 72.87,
                beds: { icu: { total: 20, available: 8 }, general: { total: 120, available: 40 }, ventilators: { total: 8, available: 3 } },
                ambulanceAvailable: true,
                emergencyOpen: true,
                open24x7: true,
                rating: 4.2,
              })
            }
            disabled={!newHospital.name || !newHospital.city}
          >
            Add hospital
          </Button>
          <div className="mt-4 space-y-2">
            {hospitals.slice(0, 6).map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
                <span className="truncate">{h.name}</span>
                <Button variant="ghost" size="sm" onClick={() => deleteHospitalMut.mutate(h.id)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-warning/30 bg-gradient-to-br from-warning/10 via-card to-card p-6 shadow-soft lg:col-span-3">
          <h2 className="text-lg font-semibold">Vector knowledge ingestion (for AI retrieval)</h2>
          <p className="text-xs text-muted-foreground">
            Save doctor/illness/hospital notes to vector-ready records. These are the records your AI should query first.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-xs">Hospital ID</Label>
              <Input value={selectedHospitalId} onChange={(e) => setSelectedHospitalId(e.target.value)} />
            </div>
            <Field label="Record title" value={newVector.title} onChange={(v) => setNewVector((s) => ({ ...s, title: v }))} />
            <Field label="Illness" value={newVector.illness} onChange={(v) => setNewVector((s) => ({ ...s, illness: v }))} />
            <Field label="Doctor" value={newVector.doctorName} onChange={(v) => setNewVector((s) => ({ ...s, doctorName: v }))} />
            <Field label="Room (optional)" value={newVector.room} onChange={(v) => setNewVector((s) => ({ ...s, room: v }))} />
            <Field label="Source: manual/document/api" value={newVector.source} onChange={(v) => setNewVector((s) => ({ ...s, source: v }))} />
          </div>
          <div className="mt-3">
            <Label className="mb-1.5 block text-xs">Notes / context chunk</Label>
            <Textarea value={newVector.notes} onChange={(e) => setNewVector((s) => ({ ...s, notes: e.target.value }))} />
          </div>
          <Button
            className="mt-3 shadow-glow-primary"
            onClick={() =>
              createVectorMut.mutate({
                hospitalId: selectedHospitalId,
                title: newVector.title,
                illness: newVector.illness,
                doctorName: newVector.doctorName,
                room: newVector.room || undefined,
                notes: newVector.notes,
                source: (newVector.source as "manual" | "document" | "api") ?? "manual",
              })
            }
            disabled={!selectedHospitalId || !newVector.title || !newVector.notes}
          >
            Store in vector records
          </Button>
          <div className="mt-4 space-y-2">
            {vectorRows.map((v) => (
              <div key={v.id} className="rounded-xl border border-border bg-background/70 p-3">
                <p className="text-sm font-medium">{v.title} · {v.illness}</p>
                <p className="text-xs text-muted-foreground">
                  {v.doctorName} {v.room ? `• Room ${v.room}` : "• Room not on file"} • {v.source}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{v.notes}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/70 bg-gradient-to-br from-card to-muted/40 p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
