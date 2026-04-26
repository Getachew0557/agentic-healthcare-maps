import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { jwtDecode } from "jwt-decode";
import { getToken } from "@/lib/authStorage";
import type { AuthPayload } from "@/lib/authStorage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  Shield,
  Activity,
  Stethoscope,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Cpu,
  Bell,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/apiError";
import { ingestHospitalFile, type IngestApiResponse } from "@/shared/services/hospitalService";

export const Route = createFileRoute("/admin")({
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
      if (p.role !== "admin") {
        throw redirect({ to: "/triage" });
      }
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as object)) throw e;
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin — ChatMap" },
      { name: "description", content: "Manage users, hospitals, and bulk hospital data import." },
    ],
  }),
  component: AdminPage,
});

type BackendUser = {
  id: number;
  email: string;
  role: "admin" | "hospital_staff" | "patient";
  hospital_id: number | null;
};

type BackendHospital = {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
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

type BackendAdminMetrics = {
  hospitals: { total: number };
  audit_logs: { total: number };
  recent_changes: Array<{
    id: number;
    updated_by_user_id: number;
    field_name: string;
    old_value: string;
    new_value: string;
    created_at: string;
  }>;
};

type BackendTrace = { id: number; model: string | null; created_at?: string };

function AdminPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const myId = me?.id ? Number(me.id) : 0;

  const { data: metrics } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const { data } = await apiClient.get<BackendAdminMetrics>("/admin/metrics");
      return data;
    },
    retry: 1,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await apiClient.get<BackendUser[]>("/admin/users", { params: { limit: 200 } });
      return data;
    },
    retry: 1,
  });
  const { data: hospitals = [] } = useQuery({
    queryKey: ["admin-hospitals"],
    queryFn: async () => {
      const { data } = await apiClient.get<BackendHospital[]>("/admin/hospitals", { params: { limit: 500 } });
      return data;
    },
    retry: 1,
  });
  const { data: traces = [] } = useQuery({
    queryKey: ["admin-traces"],
    queryFn: async () => {
      const { data } = await apiClient.get<BackendTrace[]>("/admin/traces", { params: { limit: 20 } });
      return data;
    },
    retry: 1,
  });

  const reindex = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ indexed: number }>("/admin/vector/reindex");
      return data;
    },
    onSuccess: (d) => toast.success(`Re-indexed ${d.indexed} hospitals`),
    onError: (e) => toast.error(getApiErrorMessage(e, "Re-index failed")),
  });

  const counts = {
    hospitals: metrics?.hospitals.total ?? hospitals.length,
    patients: users.filter((u) => u.role === "patient").length,
    staff: users.filter((u) => u.role === "hospital_staff").length,
    admins: users.filter((u) => u.role === "admin").length,
    logs: metrics?.audit_logs.total ?? 0,
  };
  const recentActivities = (metrics?.recent_changes ?? []).map((change) => ({
    id: change.id,
    action: `${change.field_name}: ${change.old_value} → ${change.new_value}`,
    user: `User #${change.updated_by_user_id}`,
    time: new Date(change.created_at).toLocaleString(),
    type: change.field_name === "status" ? ("success" as const) : ("info" as const),
  }));

  function refreshAll() {
    void qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    void qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
    void qc.invalidateQueries({ queryKey: ["admin-traces"] });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-blue-500/10 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <Shield className="h-3 w-3" />
                Admin
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Platform control</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                Users, hospitals, and bulk imports. Use{" "}
                <Link to="/ingestion" className="font-medium text-primary underline">
                  Ingestion
                </Link>{" "}
                for the same upload flow on a public page (admin token required for API).
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => refreshAll()}>
              <RefreshCw className="h-4 w-4" />
              Refresh data
            </Button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <AdminStatCard label="Hospitals" value={counts.hospitals} icon={<Building2 className="h-5 w-5" />} color="blue" />
          <AdminStatCard label="Patients" value={counts.patients} icon={<Users className="h-5 w-5" />} color="green" />
          <AdminStatCard label="Hospital staff" value={counts.staff} icon={<Stethoscope className="h-5 w-5" />} color="purple" />
          <AdminStatCard label="Admins" value={counts.admins} icon={<Shield className="h-5 w-5" />} color="orange" />
          <AdminStatCard label="Audit events" value={counts.logs} icon={<Activity className="h-5 w-5" />} color="teal" />
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:w-auto">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
            <TabsTrigger value="import">Data import</TabsTrigger>
            <TabsTrigger value="vector">Vector</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab users={users} myId={myId} />
          </TabsContent>

          <TabsContent value="hospitals">
            <HospitalsTab hospitals={hospitals} />
          </TabsContent>

          <TabsContent value="import">
            <ImportTab />
          </TabsContent>

          <TabsContent value="vector">
            <Card>
              <div className="border-b border-gray-100 p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Cpu className="h-5 w-5 text-primary" />
                  Vector index
                </h2>
                <p className="mt-1 text-sm text-gray-500">Re-embed all hospitals into Chroma after bulk CSV/JSON imports.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 p-5">
                <Button onClick={() => reindex.mutate()} disabled={reindex.isPending}>
                  {reindex.isPending ? "Re-indexing…" : "Rebuild vector index"}
                </Button>
              </div>
              <Separator />
              <div className="p-5">
                <p className="text-sm font-medium text-gray-700">Recent agent traces</p>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  {traces.map((t) => (
                    <li key={t.id} className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                      Trace #{t.id} {t.model ? `· ${t.model}` : ""}
                    </li>
                  ))}
                  {traces.length === 0 && <li className="text-gray-400">No traces yet.</li>}
                </ul>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <div className="border-b border-gray-100 p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Bell className="h-5 w-5 text-primary" />
                  Recent availability changes
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-4">
                    <div className={`rounded-full p-2 ${activity.type === "success" ? "bg-green-100" : "bg-blue-100"}`}>
                      {activity.type === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Activity className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">by {activity.user}</p>
                    </div>
                    <span className="text-xs text-gray-400">{activity.time}</span>
                  </div>
                ))}
                {recentActivities.length === 0 && <p className="p-6 text-sm text-gray-500">No recent changes.</p>}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function UsersTab({ users, myId }: { users: BackendUser[]; myId: number }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<BackendUser | null>(null);
  const [cEmail, setCEmail] = useState("");
  const [cPass, setCPass] = useState("");
  const [cRole, setCRole] = useState<"patient" | "hospital_staff" | "admin">("patient");
  const [cHid, setCHid] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [eRole, setERole] = useState<"patient" | "hospital_staff" | "admin">("patient");
  const [eHid, setEHid] = useState("");
  const [ePass, setEPass] = useState("");

  const createMu = useMutation({
    mutationFn: async () => {
      const hid = cHid.trim() ? Number(cHid) : null;
      const { data } = await apiClient.post<BackendUser>("/admin/users", {
        email: cEmail.trim(),
        password: cPass,
        role: cRole,
        hospital_id: hid !== null && !Number.isNaN(hid) ? hid : null,
      });
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["admin-metrics"] });
      setCreateOpen(false);
      setCEmail("");
      setCPass("");
      setCHid("");
      toast.success("User created");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not create user")),
  });

  const patchMu = useMutation({
    mutationFn: async () => {
      if (!edit) return;
      const body: {
        email?: string;
        role?: string;
        hospital_id?: number | null;
        password?: string;
      } = { email: eEmail.trim(), role: eRole };
      const ht = eHid.trim();
      if (ht === "") body.hospital_id = null;
      else {
        const n = Number(ht);
        if (!Number.isNaN(n)) body.hospital_id = n;
      }
      if (ePass.trim()) body.password = ePass;
      const { data } = await apiClient.patch<BackendUser>(`/admin/users/${edit.id}`, body);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEdit(null);
      setEPass("");
      toast.success("User updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not update user")),
  });

  const delMu = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["admin-metrics"] });
      toast.success("User deleted");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not delete user")),
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Users</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Add user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Email</Label>
                <Input value={cEmail} onChange={(e) => setCEmail(e.target.value)} type="email" autoComplete="off" />
              </div>
              <div>
                <Label>Password (min 8 characters)</Label>
                <Input value={cPass} onChange={(e) => setCPass(e.target.value)} type="password" autoComplete="new-password" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={cRole} onValueChange={(v) => setCRole(v as typeof cRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">patient</SelectItem>
                    <SelectItem value="hospital_staff">hospital_staff</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hospital ID (for staff; optional)</Label>
                <Input value={cHid} onChange={(e) => setCHid(e.target.value)} placeholder="e.g. 1" />
                <p className="mt-1 text-xs text-muted-foreground">Use an ID from the Hospitals tab.</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMu.mutate()}
                disabled={createMu.isPending || !cEmail.trim() || cPass.length < 8}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Hospital ID</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/80">
                <td className="px-4 py-2 font-mono text-xs">{u.id}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <Badge variant="outline" className="capitalize">
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{u.hospital_id ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEdit(u);
                      setEEmail(u.email);
                      setERole(u.role);
                      setEHid(u.hospital_id != null ? String(u.hospital_id) : "");
                      setEPass("");
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={u.id === myId}
                    onClick={() => {
                      if (u.id === myId) return;
                      if (confirm(`Delete user ${u.email}?`)) delMu.mutate(u.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Dialog open onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit user #{edit.id}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Email</Label>
                <Input value={eEmail} onChange={(e) => setEEmail(e.target.value)} type="email" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={eRole} onValueChange={(v) => setERole(v as typeof eRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">patient</SelectItem>
                    <SelectItem value="hospital_staff">hospital_staff</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hospital ID (empty = none)</Label>
                <Input value={eHid} onChange={(e) => setEHid(e.target.value)} />
              </div>
              <div>
                <Label>New password (optional)</Label>
                <Input value={ePass} onChange={(e) => setEPass(e.target.value)} type="password" placeholder="Leave blank to keep" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => patchMu.mutate()} disabled={patchMu.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

const emptyHospitalForm = {
  name: "",
  address: "",
  phone: "",
  lat: "",
  lng: "",
  is_24x7: true,
  status: "normal" as "normal" | "busy" | "emergency_only",
  icu_total: "0",
  icu_available: "0",
  general_total: "0",
  general_available: "0",
  ventilators_available: "0",
  specialties: "",
};

function HospitalsTab({ hospitals }: { hospitals: BackendHospital[] }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyHospitalForm);
  const [edit, setEdit] = useState<BackendHospital | null>(null);
  const [eForm, setEForm] = useState(emptyHospitalForm);

  const openEdit = (h: BackendHospital) => {
    setEdit(h);
    setEForm({
      name: h.name,
      address: h.address,
      phone: h.phone ?? "",
      lat: String(h.lat),
      lng: String(h.lng),
      is_24x7: h.is_24x7,
      status: h.status,
      icu_total: String(h.icu_total),
      icu_available: String(h.icu_available),
      general_total: String(h.general_total),
      general_available: String(h.general_available),
      ventilators_available: String(h.ventilators_available),
      specialties: h.specialties.join(", "),
    });
  };

  const createMu = useMutation({
    mutationFn: async () => {
      const specs = form.specialties
        .split(/[,;\n]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const { data } = await apiClient.post<BackendHospital>("/admin/hospitals", {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim() || null,
        lat: Number(form.lat),
        lng: Number(form.lng),
        is_24x7: form.is_24x7,
        status: form.status,
        icu_total: Math.max(0, parseInt(form.icu_total, 10) || 0),
        icu_available: Math.max(0, parseInt(form.icu_available, 10) || 0),
        general_total: Math.max(0, parseInt(form.general_total, 10) || 0),
        general_available: Math.max(0, parseInt(form.general_available, 10) || 0),
        ventilators_available: Math.max(0, parseInt(form.ventilators_available, 10) || 0),
        specialties: specs,
      });
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
      void qc.invalidateQueries({ queryKey: ["admin-metrics"] });
      setCreateOpen(false);
      setForm(emptyHospitalForm);
      toast.success("Hospital created");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not create hospital")),
  });

  const patchMu = useMutation({
    mutationFn: async () => {
      if (!edit) return;
      const { data } = await apiClient.patch<BackendHospital>(`/admin/hospitals/${edit.id}`, {
        name: eForm.name.trim(),
        address: eForm.address.trim(),
        phone: eForm.phone.trim() || null,
        lat: Number(eForm.lat),
        lng: Number(eForm.lng),
        is_24x7: eForm.is_24x7,
        status: eForm.status,
        icu_total: Math.max(0, parseInt(eForm.icu_total, 10) || 0),
        icu_available: Math.max(0, parseInt(eForm.icu_available, 10) || 0),
        general_total: Math.max(0, parseInt(eForm.general_total, 10) || 0),
        general_available: Math.max(0, parseInt(eForm.general_available, 10) || 0),
        ventilators_available: Math.max(0, parseInt(eForm.ventilators_available, 10) || 0),
      });
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
      void qc.invalidateQueries({ queryKey: ["admin-metrics"] });
      setEdit(null);
      toast.success("Hospital updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not update hospital")),
  });

  const delMu = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/hospitals/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["admin-metrics"] });
      toast.success("Hospital deleted");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not delete hospital")),
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <h2 className="text-lg font-semibold">Hospitals</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add hospital
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New hospital</DialogTitle>
            </DialogHeader>
            <HospitalFormFields form={form} setForm={setForm} includeSpecialties />
            <DialogFooter>
              <Button
                onClick={() => createMu.mutate()}
                disabled={createMu.isPending || !form.name.trim() || !form.lat || !form.lng}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Beds (avail / total)</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {hospitals.map((h) => {
              const tot = h.icu_total + h.general_total;
              const av = h.icu_available + h.general_available;
              return (
                <tr key={h.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-2 font-mono text-xs">{h.id}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{h.name}</div>
                    <div className="max-w-xs truncate text-xs text-muted-foreground">{h.address}</div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary">{h.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {av} / {tot}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="link" asChild className="h-auto p-0 text-xs">
                      <Link to="/hospitals/$hospitalId" params={{ hospitalId: String(h.id) }} search={{}}>
                        View
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(h)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete ${h.name}? This removes related records.`)) delMu.mutate(h.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {edit && (
        <Dialog open onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit hospital #{edit.id}</DialogTitle>
            </DialogHeader>
            <HospitalFormFields form={eForm} setForm={setEForm} includeSpecialties={false} />
            {edit && (
              <p className="text-xs text-muted-foreground">
                Service lines (specialties) are managed per hospital in{" "}
                <Link to="/dashboard" className="font-medium text-primary underline">
                  staff dashboard
                </Link>{" "}
                or via API.
              </p>
            )}
            <DialogFooter>
              <Button onClick={() => patchMu.mutate()} disabled={patchMu.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function HospitalFormFields({
  form,
  setForm,
  includeSpecialties = false,
}: {
  form: typeof emptyHospitalForm;
  setForm: import("react").Dispatch<import("react").SetStateAction<typeof emptyHospitalForm>>;
  includeSpecialties?: boolean;
}) {
  return (
    <div className="grid gap-3 py-2">
      <div>
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <Label>Address</Label>
        <Textarea rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
      </div>
      <div>
        <Label>Phone</Label>
        <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Latitude</Label>
          <Input value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} />
        </div>
        <div>
          <Label>Longitude</Label>
          <Input value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.is_24x7} onCheckedChange={(v) => setForm((f) => ({ ...f, is_24x7: v }))} id="h247" />
        <Label htmlFor="h247">24/7</Label>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as typeof form.status }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">normal</SelectItem>
            <SelectItem value="busy">busy</SelectItem>
            <SelectItem value="emergency_only">emergency_only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>ICU total / avail</Label>
          <div className="flex gap-1">
            <Input
              value={form.icu_total}
              onChange={(e) => setForm((f) => ({ ...f, icu_total: e.target.value }))}
            />
            <Input
              value={form.icu_available}
              onChange={(e) => setForm((f) => ({ ...f, icu_available: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label>General total / avail</Label>
          <div className="flex gap-1">
            <Input
              value={form.general_total}
              onChange={(e) => setForm((f) => ({ ...f, general_total: e.target.value }))}
            />
            <Input
              value={form.general_available}
              onChange={(e) => setForm((f) => ({ ...f, general_available: e.target.value }))}
            />
          </div>
        </div>
      </div>
      <div>
        <Label>Ventilators (available)</Label>
        <Input
          value={form.ventilators_available}
          onChange={(e) => setForm((f) => ({ ...f, ventilators_available: e.target.value }))}
        />
      </div>
      {includeSpecialties && (
        <div>
          <Label>Specialties (comma-separated)</Label>
          <Input
            value={form.specialties}
            onChange={(e) => setForm((f) => ({ ...f, specialties: e.target.value }))}
            placeholder="cardiology, emergency"
          />
        </div>
      )}
    </div>
  );
}

function ImportTab() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestApiResponse | null>(null);
  const [importing, setImporting] = useState(false);

  async function preview(f: File) {
    setFile(f);
    setLoading(true);
    setResult(null);
    try {
      const data = await ingestHospitalFile(f, false);
      setResult(data);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Upload failed (admin only; check file format)"));
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!file) return;
    setImporting(true);
    try {
      const data = await ingestHospitalFile(file, true);
      setResult(data);
      void qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
      void qc.invalidateQueries({ queryKey: ["admin-metrics"] });
      toast.success(data.message);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Import failed"));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Bulk hospital file</h2>
          <p className="mt-1 text-sm text-muted-foreground">CSV, JSON, or Excel. First upload shows a preview; then import to PostgreSQL + index.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json,.xlsx,.xls,.pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void preview(f);
            }}
          />
          <Button variant="outline" onClick={() => inputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            Choose file
          </Button>
          {result && file && result.total_parsed > 0 && result.total_inserted === 0 && (
            <Button onClick={() => void confirmImport()} disabled={importing || loading}>
              {importing ? "Importing…" : `Import ${result.total_parsed} record(s)`}
            </Button>
          )}
        </div>
      </div>
      {loading && <p className="mt-4 text-sm text-muted-foreground">Parsing file…</p>}
      {result && (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">Parsed: {result.total_parsed}</Badge>
            <Badge variant="secondary">Inserted: {result.total_inserted}</Badge>
            <Badge variant="secondary">Skipped: {result.total_skipped}</Badge>
            <Badge variant="outline">{result.filename}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{result.message}</p>
          <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">{JSON.stringify(result.preview, null, 2)}</pre>
        </div>
      )}
    </Card>
  );
}

function AdminStatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "orange" | "teal";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600",
    green: "bg-green-500/10 text-green-600",
    purple: "bg-purple-500/10 text-purple-600",
    orange: "bg-orange-500/10 text-orange-600",
    teal: "bg-teal-500/10 text-teal-600",
  };
  return (
    <Card className="transition-all hover:shadow-md">
      <div className="p-4">
        <div className={`mb-2 inline-flex rounded-lg ${colorClasses[color]} p-2`}>{icon}</div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
      </div>
    </Card>
  );
}
