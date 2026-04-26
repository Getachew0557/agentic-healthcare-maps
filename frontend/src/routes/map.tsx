import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHospitals } from "@/shared/services/hospitalService";
import type { Hospital } from "@/shared/types";
import { LoadingState } from "@/shared/components/LoadingState";
import { Card } from "@/components/ui/card";
import { BedStatusBadge } from "@/shared/components/Badges";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Hospital as HospitalIcon,
  MapPin,
  Clock, 
  Navigation, 
  Star, 
  Filter, 
  X, 
  ChevronDown,
  Ambulance,
  Shield,
  TrendingUp,
  Users,
  Phone,
  Mail,
  ExternalLink,
  Layers,
  Satellite,
  Map as MapIcon,
  Plus,
  Minus,
  Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useRealtimeAvailability } from "@/hooks/useRealtimeAvailability";

const HospitalMap = lazy(() => import("@/features/hospitals/HospitalMap").then((m) => ({ default: m.HospitalMap })));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Hospital Map — Real-time Bed Availability" },
      { name: "description", content: "Interactive map of hospitals with live bed availability, specialties, and travel time." },
    ],
  }),
  component: MapPage,
  ssr: false,
});

// Mock hospital images for better visual appeal
const hospitalImages: Record<string, string> = {
  default: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop",
  "City Hospital": "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400&h=300&fit=crop",
  "Apollo": "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&h=300&fit=crop",
};

function MapPage() {
  useRealtimeAvailability();
  const { data: hospitals = [], isLoading } = useQuery({ 
    queryKey: ["hospitals"], 
    queryFn: fetchHospitals 
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    specialties: [] as string[],
    minBeds: 0,
    maxDistance: 50,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [mapView, setMapView] = useState<"standard" | "satellite" | "terrain">("standard");
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  // Get unique specialties from hospitals
  const allSpecialties = useMemo(() => {
    const specialties = new Set<string>();
    hospitals.forEach(h => h.specialties.forEach(s => specialties.add(s)));
    return Array.from(specialties).sort();
  }, [hospitals]);

  const filtered = useMemo(() => {
    return hospitals.filter((h) => {
      const matchesSearch = h.name.toLowerCase().includes(query.toLowerCase()) ||
        h.city.toLowerCase().includes(query.toLowerCase()) ||
        h.specialties.some((s) => s.toLowerCase().includes(query.toLowerCase()));
      
      const matchesSpecialty = filters.specialties.length === 0 || 
        h.specialties.some(s => filters.specialties.includes(s));
      
      const totalBeds = h.beds.icu.available + h.beds.general.available;
      const matchesBeds = totalBeds >= filters.minBeds;
      
      const matchesDistance = (h.distanceKm ?? 0) <= filters.maxDistance;
      
      return matchesSearch && matchesSpecialty && matchesBeds && matchesDistance;
    });
  }, [hospitals, query, filters]);

  const toggleSpecialty = (specialty: string) => {
    setFilters(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const clearFilters = () => {
    setFilters({ specialties: [], minBeds: 0, maxDistance: 50 });
    setQuery("");
  };

  const selectedHospital = hospitals.find(h => h.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      {/* Mobile Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Hospital Map</h1>
            <p className="text-xs text-gray-500">{filtered.length} hospitals • Real-time updates</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Sidebar - Enhanced */}
        <aside className={`
          flex flex-col border-r border-gray-200 bg-white transition-all duration-300
          lg:w-[420px] lg:flex
          ${showFilters ? "h-[60vh] w-full" : "hidden lg:flex"}
        `}>
          {/* Search and Filters Header */}
          <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-xl font-semibold text-gray-900">Healthcare Facilities</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-medium text-primary">{filtered.length}</span> locations found
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Data
              </Badge>
            </div>

            {/* Search Bar */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by hospital, city, or specialty..."
                className="pl-9 border-gray-200 focus:border-primary/50 bg-gray-50/50"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                    <Filter className="h-3 w-3" />
                    Specialties
                    {filters.specialties.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                        {filters.specialties.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
                  {allSpecialties.map(specialty => (
                    <DropdownMenuItem
                      key={specialty}
                      onClick={() => toggleSpecialty(specialty)}
                      className="gap-2"
                    >
                      <div className={`h-4 w-4 rounded border ${filters.specialties.includes(specialty) ? "bg-primary border-primary" : "border-gray-300"}`}>
                        {filters.specialties.includes(specialty) && (
                          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm">{specialty}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {(filters.specialties.length > 0 || query) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-red-500 hover:text-red-600">
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Hospital List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <LoadingState label="Loading hospitals..." />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-gray-100 p-4">
                  <HospitalIcon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-900">No hospitals found</p>
                <p className="mt-1 text-xs text-gray-500">Try adjusting your search or filters</p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {filtered.map((h) => (
                  <HospitalCard
                    key={h.id}
                    hospital={h}
                    active={selectedId === h.id}
                    onClick={() => setSelectedId(h.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Legend */}
          <div className="border-t border-gray-100 bg-gray-50/50 p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-gray-600">Limited</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-gray-600">Full</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedId(null)}>
                  Reset selection
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Map Container - Enhanced */}
        <div className="relative flex-1 overflow-hidden">
          {/* Map Controls Overlay */}
          <div className="absolute left-4 top-4 z-10 flex gap-2">
            <div className="rounded-lg bg-white/90 backdrop-blur-sm shadow-md p-1 flex gap-1">
              <Button
                variant={mapView === "standard" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMapView("standard")}
                className="h-8 w-8 p-0"
              >
                <MapIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={mapView === "satellite" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMapView("satellite")}
                className="h-8 w-8 p-0"
              >
                <Satellite className="h-4 w-4" />
              </Button>
              <Button
                variant={mapView === "terrain" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMapView("terrain")}
                className="h-8 w-8 p-0"
              >
                <Layers className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="absolute right-4 bottom-20 z-10 flex flex-col gap-2">
            <Button size="sm" className="h-8 w-8 rounded-lg shadow-md">
              <Plus className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 rounded-lg shadow-md">
              <Minus className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 rounded-lg shadow-md">
              <Compass className="h-4 w-4" />
            </Button>
          </div>

          {/* Map Component */}
          {mounted ? (
            <Suspense fallback={<LoadingState label="Loading map..." />}>
              <HospitalMap 
                hospitals={filtered} 
                selectedId={selectedId} 
                onSelect={(h) => setSelectedId(h.id)} 
              />
            </Suspense>
          ) : (
            <LoadingState label="Loading map..." />
          )}

          {/* Selected Hospital Info Card */}
          {selectedHospital && (
            <div className="absolute bottom-4 left-4 right-4 z-10 lg:left-auto lg:right-4 lg:bottom-4 lg:w-96">
              <SelectedHospitalCard 
                hospital={selectedHospital} 
                onClose={() => setSelectedId(null)} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Enhanced Hospital Card Component
function HospitalCard({ hospital, active, onClick }: { hospital: Hospital; active: boolean; onClick: () => void }) {
  const totalBeds = hospital.beds.icu.available + hospital.beds.general.available;
  const bedStatus = totalBeds > 20 ? "available" : totalBeds > 6 ? "limited" : "full";
  const bedColors = {
    available: "bg-green-500",
    limited: "bg-yellow-500",
    full: "bg-red-500",
  };

  return (
    <Card
      onClick={onClick}
      className={`
        cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md
        ${active ? "ring-2 ring-primary shadow-lg" : "hover:border-primary/30"}
      `}
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
              <HospitalIcon className="h-6 w-6 text-primary" />
            </div>
            <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ${bedColors[bedStatus]} ring-2 ring-white`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900 truncate">{hospital.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  <p className="text-xs text-gray-500 truncate">{hospital.address.split(',')[0]}</p>
                </div>
              </div>
              <BedStatusBadge hospital={hospital} />
            </div>
            
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Navigation className="h-3 w-3 text-primary" />
                <span>{hospital.distanceKm} km</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                <span>{hospital.travelTimeMin} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-primary" />
                <span>{totalBeds} beds</span>
              </div>
            </div>

            {/* Specialty Tags */}
            <div className="mt-2 flex flex-wrap gap-1">
              {hospital.specialties.slice(0, 3).map((specialty: string) => (
                <Badge key={specialty} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {specialty}
                </Badge>
              ))}
              {hospital.specialties.length > 3 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  +{hospital.specialties.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Selected Hospital Details Card
function SelectedHospitalCard({ hospital, onClose }: { hospital: Hospital; onClose: () => void }) {
  const totalBeds = hospital.beds.icu.available + hospital.beds.general.available;
  const icuPercent = (hospital.beds.icu.available / (hospital.beds.icu.total || 1)) * 100;
  const generalPercent = (hospital.beds.general.available / (hospital.beds.general.total || 1)) * 100;

  return (
    <Card className="overflow-hidden shadow-xl animate-in slide-in-from-bottom-2 duration-300">
      <div className="relative">
        {/* Banner Image */}
        <div className="h-32 w-full overflow-hidden">
          <img
            src={hospitalImages[hospital.name] || hospitalImages.default}
            alt={hospital.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
        >
          <X className="h-4 w-4" />
        </button>
        
        {/* Hospital Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-bold text-white">{hospital.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="h-3 w-3 text-white/80" />
            <p className="text-xs text-white/80">{hospital.address}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{hospital.distanceKm}</p>
            <p className="text-xs text-gray-500">km away</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{hospital.travelTimeMin}</p>
            <p className="text-xs text-gray-500">min drive</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalBeds}</p>
            <p className="text-xs text-gray-500">beds available</p>
          </div>
        </div>

        <Separator />

        {/* Bed Availability */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Bed Availability</h4>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">ICU Beds</span>
                <span className="font-medium">{hospital.beds.icu.available} / {hospital.beds.icu.total}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${icuPercent}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">General Wards</span>
                <span className="font-medium">{hospital.beds.general.available} / {hospital.beds.general.total}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${generalPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Specialties */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Specialties</h4>
          <div className="flex flex-wrap gap-1.5">
            {hospital.specialties.map((specialty: string) => (
              <Badge key={specialty} variant="secondary" className="text-xs">
                {specialty}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button asChild className="flex-1 gap-2">
            <Link to="/hospitals/$hospitalId" params={{ hospitalId: hospital.id }}>
              View Details
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <a href={`tel:${hospital.phone}`}>
              <Phone className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospital.address)}`} target="_blank" rel="noreferrer">
              <Navigation className="h-4 w-4" />
            </a>
          </Button>
        </div>

        <p className="text-center text-[10px] text-gray-400">
          Bed availability updates in real-time • Last updated {new Date().toLocaleTimeString()}
        </p>
      </div>
    </Card>
  );
}

// Legend Component (kept for compatibility)
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={"h-2 w-2 rounded-full " + color} /> {label}
    </span>
  );
}