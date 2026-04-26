import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { fetchHospitalById } from "@/shared/services/hospitalService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BedStatusBadge } from "@/shared/components/Badges";
import { StatCard } from "@/shared/components/StatCard";
import { 
  ArrowLeft, Phone, MapPin, Stethoscope, BedDouble, Activity, 
  Clock, Ambulance, ShieldAlert, Star, Heart, Users, Calendar,
  ChevronRight, Navigation, Mail, Share2, Bookmark, AlertCircle,
  CheckCircle, XCircle, TrendingUp, Building2, Award, Video,
  MessageCircle, Download, Printer, ExternalLink
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/hospitals/$hospitalId")({
  validateSearch: (search: Record<string, unknown>) => ({
    specialty: typeof search.specialty === "string" ? search.specialty : undefined,
  }),
  loader: async ({ params }) => {
    const h = await fetchHospitalById(params.hospitalId);
    if (!h) throw notFound();
    return h;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Hospital"} — Real-time Bed Availability` },
      { name: "description", content: `${loaderData?.name} in ${loaderData?.city}: live bed availability, specialties, and emergency readiness.` },
    ],
  }),
  component: HospitalDetail,
  errorComponent: ({ error }) => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="rounded-full bg-red-100 p-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Could not load hospital: {error.message}</p>
        <Button asChild className="mt-4">
          <Link to="/map">Back to map</Link>
        </Button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="rounded-full bg-gray-100 p-4">
          <Building2 className="h-8 w-8 text-gray-400" />
        </div>
        <p className="mt-4 text-lg font-semibold">Hospital not found</p>
        <Button asChild className="mt-4">
          <Link to="/map">Back to map</Link>
        </Button>
      </div>
    </div>
  ),
});

function HospitalDetail() {
  const navigate = useNavigate();
  const h = Route.useLoaderData() as import("@/shared/types").Hospital;
  const { specialty } = Route.useSearch();
  const totalBeds = h.beds.icu.total + h.beds.general.total;
  const availBeds = h.beds.icu.available + h.beds.general.available;
  const occupancyRate = totalBeds ? ((totalBeds - availBeds) / totalBeds) * 100 : 0;
  const focusSpecialty = specialty?.trim();
  const doctors = buildDoctorDirectory(h.specialties, focusSpecialty);
  const shownDoctors = focusSpecialty
    ? doctors.filter((d) => d.specialty.toLowerCase() === focusSpecialty.toLowerCase())
    : doctors;

  // Mock hospital image
  const hospitalImages: Record<string, string> = {
    default: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=400&fit=crop",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      {/* Hero Section with Image */}
      <div className="relative h-64 overflow-hidden lg:h-80">
        <img
          src={hospitalImages[h.name] || hospitalImages.default}
          alt={h.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* Back Button */}
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
              return;
            }
            navigate({ to: "/map" });
          }}
          className="absolute left-4 top-4 rounded-lg bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        {/* Action Buttons */}
        <div className="absolute right-4 top-4 flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded-lg bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70">
                  <Share2 className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Share</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded-lg bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70">
                  <Bookmark className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Save</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Hospital Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold md:text-4xl">{h.name}</h1>
                  <BedStatusBadge hospital={h} />
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-white/80">
                  <MapPin className="h-4 w-4" />
                  <span>{h.address}, {h.city}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {h.emergencyOpen && (
                    <Badge className="bg-red-500/90 text-white border-0">
                      <Heart className="mr-1 h-3 w-3" />
                      Emergency Open
                    </Badge>
                  )}
                  {h.open24x7 && (
                    <Badge variant="outline" className="border-white/30 text-white">
                      24/7 Service
                    </Badge>
                  )}
                  {h.ambulanceAvailable && (
                    <Badge variant="outline" className="border-green-400/30 text-green-300">
                      <Ambulance className="mr-1 h-3 w-3" />
                      Ambulance Available
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-yellow-400/30 text-yellow-300">
                    <Star className="mr-1 h-3 w-3 fill-yellow-400" />
                    {h.rating} ★ Rating
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="lg" asChild className="shadow-lg">
                  <a href={`tel:${h.phone.replace(/\s/g, "")}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call Now
                  </a>
                </Button>
                <Button size="lg" asChild className="bg-gradient-to-r from-primary to-primary/90 shadow-lg">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`} target="_blank" rel="noopener">
                    <Navigation className="mr-2 h-4 w-4" />
                    Directions
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardEnhanced
            label="Total Beds"
            value={totalBeds}
            subtext={`${availBeds} available`}
            icon={<BedDouble className="h-5 w-5" />}
            trend="neutral"
          />
          <StatCardEnhanced
            label="Occupancy Rate"
            value={`${Math.round(occupancyRate)}%`}
            subtext={`${totalBeds - availBeds} beds occupied`}
            icon={<Activity className="h-5 w-5" />}
            trend={occupancyRate > 70 ? "warning" : occupancyRate > 40 ? "neutral" : "success"}
          />
          <StatCardEnhanced
            label="ICU Availability"
            value={h.beds.icu.available}
            subtext={`of ${h.beds.icu.total} ICU beds`}
            icon={<ShieldAlert className="h-5 w-5" />}
            trend={h.beds.icu.available === 0 ? "critical" : h.beds.icu.available < 3 ? "warning" : "success"}
          />
          <StatCardEnhanced
            label="Travel Time"
            value={`${h.travelTimeMin} min`}
            subtext={`${h.distanceKm} km away`}
            icon={<Clock className="h-5 w-5" />}
            trend="neutral"
          />
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Bed Availability */}
              <Card className="lg:col-span-2 overflow-hidden">
                <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-5">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <BedDouble className="h-5 w-5 text-primary" />
                    Bed Availability
                  </h2>
                </div>
                <div className="p-5 space-y-5">
                  <BedProgressBar 
                    label="ICU Beds" 
                    available={h.beds.icu.available} 
                    total={h.beds.icu.total}
                    color="blue"
                  />
                  <BedProgressBar 
                    label="General Wards" 
                    available={h.beds.general.available} 
                    total={h.beds.general.total}
                    color="green"
                  />
                  <BedProgressBar 
                    label="Ventilators" 
                    available={h.beds.ventilators.available} 
                    total={h.beds.ventilators.total}
                    color="purple"
                  />
                </div>
              </Card>

              {/* Quick Contact */}
              <Card>
                <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-5">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Phone className="h-5 w-5 text-primary" />
                    Contact Information
                  </h2>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone Number</p>
                      <a href={`tel:${h.phone}`} className="text-sm text-primary hover:underline">
                        {h.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Address</p>
                      <p className="text-sm text-gray-600">{h.address}, {h.city}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <a href={`mailto:info@${h.name.replace(/\s/g, "").toLowerCase()}.com`} className="text-sm text-primary hover:underline">
                        info@{h.name.replace(/\s/g, "").toLowerCase()}.com
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="departments" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {h.specialties.map((specialty) => (
                <DepartmentCard key={specialty} name={specialty} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="doctors" className="space-y-6">
            {focusSpecialty && (
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  Showing doctors specializing in: <strong>{focusSpecialty}</strong>
                </p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shownDoctors.map((doc) => (
                <DoctorCard key={doc.id} doctor={doc} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="emergency" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <div className="border-b border-gray-100 bg-gradient-to-r from-red-50 to-white p-5">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-red-700">
                    <Heart className="h-5 w-5" />
                    Emergency Readiness
                  </h2>
                </div>
                <div className="p-5 space-y-3">
                  <EmergencyItem 
                    ok={h.emergencyOpen} 
                    label="Emergency Department Open" 
                    description="24/7 emergency care available"
                  />
                  <EmergencyItem 
                    ok={h.beds.icu.available > 0} 
                    label="ICU Bed Available" 
                    description="Critical care unit ready"
                  />
                  <EmergencyItem 
                    ok={h.beds.ventilators.available > 0} 
                    label="Ventilator Available" 
                    description="Respiratory support ready"
                  />
                  <EmergencyItem 
                    ok={h.ambulanceAvailable} 
                    label="Ambulance Service" 
                    description="Emergency transport available"
                  />
                  <EmergencyItem 
                    ok={h.open24x7} 
                    label="24/7 Operation" 
                    description="Round-the-clock service"
                  />
                </div>
              </Card>

              <Card>
                <div className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white p-5">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-700">
                    <AlertCircle className="h-5 w-5" />
                    Emergency Instructions
                  </h2>
                </div>
                <div className="p-5 space-y-4">
                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">🚨 For Medical Emergencies</p>
                    <p className="mt-1 text-sm text-red-700">
                      Call <strong>{h.phone}</strong> immediately or dial 108 for ambulance service.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">What to bring:</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                      <li>Valid ID proof</li>
                      <li>Previous medical records (if any)</li>
                      <li>List of current medications</li>
                      <li>Insurance card (if applicable)</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Enhanced Stat Card Component
function StatCardEnhanced({ 
  label, 
  value, 
  subtext, 
  icon, 
  trend 
}: { 
  label: string; 
  value: string | number; 
  subtext: string; 
  icon: React.ReactNode; 
  trend: "success" | "warning" | "critical" | "neutral";
}) {
  const trendColors = {
    success: "text-green-600",
    warning: "text-yellow-600",
    critical: "text-red-600",
    neutral: "text-gray-600",
  };
  
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="rounded-lg bg-primary/10 p-2">
            {icon}
          </div>
          <TrendingUp className={`h-4 w-4 ${trendColors[trend]}`} />
        </div>
        <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="mt-1 text-xs text-gray-500">{subtext}</p>
      </div>
    </Card>
  );
}

// Bed Progress Bar Component
function BedProgressBar({ 
  label, 
  available, 
  total, 
  color 
}: { 
  label: string; 
  available: number; 
  total: number; 
  color: "blue" | "green" | "purple";
}) {
  const percentage = total ? (available / total) * 100 : 0;
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
  };
  
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          {available} / {total}
        </span>
      </div>
      <Progress value={percentage} className="h-2" indicatorClassName={colorClasses[color]} />
      <p className="mt-1 text-xs text-gray-500">
        {percentage >= 50 ? "Good availability" : percentage > 0 ? "Limited availability" : "Currently full"}
      </p>
    </div>
  );
}

// Department Card
function DepartmentCard({ name }: { name: string }) {
  return (
    <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{name}</p>
              <p className="text-xs text-gray-500">Specialized care</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Card>
  );
}

// Doctor Card
function DoctorCard({ doctor }: { doctor: DoctorDirectoryItem }) {
  return (
    <Card className="group transition-all hover:shadow-md">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
              {doctor.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{doctor.name}</p>
            <p className="text-sm text-primary">{doctor.specialty}</p>
            <p className="text-xs text-gray-500">{doctor.title}</p>
            {doctor.room ? (
              <Badge variant="secondary" className="mt-2 text-xs">
                Room {doctor.room}
              </Badge>
            ) : (
              <p className="mt-2 text-xs italic text-gray-400">Call to confirm availability</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Emergency Item
function EmergencyItem({ ok, label, description }: { ok: boolean; label: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50">
      {ok ? (
        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
      )}
      <div>
        <p className={`text-sm font-medium ${ok ? "text-gray-900" : "text-gray-500"}`}>{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}

// Types
type DoctorDirectoryItem = {
  id: string;
  name: string;
  specialty: string;
  title: string;
  room: string | null;
};

function buildDoctorDirectory(
  specialties: string[],
  preferredSpecialty?: string,
): DoctorDirectoryItem[] {
  const names = ["Dr. Aarti Mehta", "Dr. Sanjay Iyer", "Dr. Riya Kulkarni", "Dr. Priya Shah", "Dr. Nikhil Rao"];
  const specialtiesList = preferredSpecialty ? [preferredSpecialty, ...specialties] : specialties;
  const uniqueSpecialties = Array.from(new Set(specialtiesList)).slice(0, 6);

  return uniqueSpecialties.map((s, i) => ({
    id: `${s}-${i}`,
    name: names[i % names.length],
    specialty: s,
    title: i % 2 === 0 ? "Senior Consultant" : "Consultant",
    room: i % 3 === 0 ? null : `Wing ${String.fromCharCode(65 + i)}-${10 + i}`,
  }));
}