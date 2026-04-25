import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchHospitals, fetchRecentIngestionJobs } from "@/shared/services/hospitalService";
import { StatCard } from "@/shared/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/shared/components/LoadingState";
import { Hospital as HospIcon, BedDouble, ShieldAlert, FileScan } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { bedStatusOf } from "@/shared/components/Badges";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Agentic Healthcare Maps" },
      { name: "description", content: "Overview analytics for hospitals, beds, emergency readiness, and ingestion jobs." },
    ],
  }),
  component: AdminPage,
});

const COLORS = ["oklch(0.62 0.16 155)", "oklch(0.78 0.16 75)", "oklch(0.58 0.22 25)", "oklch(0.6 0.02 250)"];

function AdminPage() {
  const { data: hospitals = [], isLoading } = useQuery({ queryKey: ["hospitals"], queryFn: fetchHospitals });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: fetchRecentIngestionJobs });

  if (isLoading) return <div className="p-10"><LoadingState /></div>;

  const totalBeds = hospitals.reduce((s, h) => s + h.beds.icu.total + h.beds.general.total, 0);
  const availBeds = hospitals.reduce((s, h) => s + h.beds.icu.available + h.beds.general.available, 0);
  const emergencyReady = hospitals.filter((h) => h.emergencyOpen && h.beds.icu.available > 0).length;

  const bedsByHospital = hospitals.map((h) => ({
    name: h.name.replace("Hospital", "").replace("Super Speciality", "").trim().slice(0, 12),
    ICU: h.beds.icu.available,
    General: Math.round(h.beds.general.available / 5),
  }));

  const statusBreakdown = ["available", "low", "full", "unknown"].map((s) => ({
    name: s,
    value: hospitals.filter((h) => bedStatusOf(h) === s).length,
  })).filter((d) => d.value > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Admin overview</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Network analytics</h1>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Hospitals" value={hospitals.length} hint="across Mumbai & Pune" tone="primary" icon={<HospIcon className="h-5 w-5" />} />
        <StatCard label="Available beds" value={availBeds} hint={`of ${totalBeds} total`} tone="success" icon={<BedDouble className="h-5 w-5" />} />
        <StatCard label="Emergency-ready" value={emergencyReady} hint="ER open + ICU free" tone="emergency" icon={<ShieldAlert className="h-5 w-5" />} />
        <StatCard label="Ingestion jobs (24h)" value={jobs.length} tone="warning" icon={<FileScan className="h-5 w-5" />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Available beds by hospital</h2>
          <p className="text-xs text-muted-foreground">General beds shown ÷ 5 for scale</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={bedsByHospital}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.92 0.01 240)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ICU" fill="oklch(0.55 0.18 245)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="General" fill="oklch(0.62 0.16 155)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Capacity status</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.92 0.01 240)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-3">
          <h2 className="text-lg font-semibold">Recent ingestion jobs</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-medium">File</th>
                  <th className="py-2 text-left font-medium">Hospital</th>
                  <th className="py-2 text-left font-medium">Records</th>
                  <th className="py-2 text-left font-medium">Status</th>
                  <th className="py-2 text-left font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-border last:border-0">
                    <td className="py-3 font-medium">{j.fileName}</td>
                    <td className="py-3 text-muted-foreground">{j.hospitalName ?? "—"}</td>
                    <td className="py-3 text-muted-foreground">{j.recordsExtracted ?? "—"}</td>
                    <td className="py-3">
                      <Badge variant="outline" className={
                        j.status === "done" ? "border-success/30 bg-success/10 text-success" :
                        j.status === "processing" ? "border-primary/30 bg-primary/10 text-primary" :
                        j.status === "failed" ? "border-emergency/30 bg-emergency/10 text-emergency" :
                        "border-border"
                      }>{j.status}</Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{j.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
