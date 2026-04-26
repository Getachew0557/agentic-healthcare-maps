import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { 
  Send, MapPin, Loader2, AlertTriangle, Phone, Clock, BedDouble, ChevronDown, 
  Plus, MessageSquare, Menu, X, Bot, User, Calendar, CheckCircle, 
  Navigation, Hospital, Star, TrendingUp, Shield, HeartPulse, 
  Mic, Paperclip, MoreVertical, Copy, Share2, ThumbsUp, ThumbsDown, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { analyzeSymptoms, DEFAULT_MAP_ORIGIN } from "@/shared/services/hospitalService";
import type { RankedHospital, TriageResult } from "@/shared/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Location = {
  lat: number;
  lng: number;
  label?: string;
};

type DoctorCard = {
  id: string;
  name: string;
  specialty: string;
  room?: string | null;
  image?: string;
  available?: boolean;
};

type HospitalCard = {
  hospitalId: string;
  name: string;
  address: string;
  phone: string;
  etaMinutes: number;
  distanceKm: number;
  verifiedAt: string;
  loadLevel: "low" | "medium" | "high";
  explainMatch: {
    specialty: string;
    distance: string;
    beds: string;
  };
  items: {
    doctors: DoctorCard[];
  };
  specialtyContext: string;
  rating?: number;
  reviews?: number;
  image?: string;
};

type AssistantMessage = {
  id: string;
  text: string;
  lowConfidence?: boolean;
  cards: HospitalCard[];
};

type ChatResponse = {
  sessionId: string;
  assistant: AssistantMessage;
};

interface ChatTurn {
  id: string;
  role: "user" | "assistant" | "stage";
  content: string;
  data?: AssistantMessage;
  timestamp?: number;
}

type ChatSession = {
  id: string;
  title: string;
  turns: ChatTurn[];
  updatedAt: number;
};

const STAGES = [
  "Analyzing symptoms...",
  "Scanning nearby facilities...",
  "Verifying doctor availability...",
  "Calculating optimal routes...",
];

const CHAT_STORAGE_KEY = "triage.chat.sessions.v2";
const ACTIVE_CHAT_STORAGE_KEY = "triage.chat.active.v2";

export const Route = createFileRoute("/triage")({
  head: () => ({
    meta: [
      { title: "AI Symptom Triage — ChatMap" },
      {
        name: "description",
        content: "Chat-first triage flow with nearby hospital recommendations and verified details.",
      },
    ],
  }),
  component: TriagePage,
});

function TriagePage() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadStoredSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (typeof window === "undefined") return "bootstrap";
    const stored = window.localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);
    return stored ?? "bootstrap";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sessions.length) {
      const fresh = createSession("New conversation");
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      return;
    }
    if (!sessions.some((s) => s.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, activeSessionId);
  }, [activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  const createNewChat = () => {
    const next = createSession("New conversation");
    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
    setSidebarOpen(false);
  };

  const handleSessionUpdate = useCallback(
    (turns: ChatTurn[]) => {
      setSessions((prev) =>
        prev
          .map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  turns,
                  title: inferTitle(turns),
                  updatedAt: Date.now(),
                }
              : s,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
    },
    [activeSessionId],
  );

  return (
    <div className="h-[calc(100vh-4rem)] w-full bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
      <div className="relative flex h-full w-full">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-4 top-4 z-20 rounded-lg bg-white p-2 shadow-md md:hidden"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Sidebar */}
        <aside
          className={`
            absolute inset-y-0 left-0 z-10 w-80 transform bg-white shadow-xl transition-transform duration-300 md:relative md:translate-x-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-gray-100 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <HeartPulse className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-gray-900">Conversations</h2>
                  <p className="text-xs text-gray-500">Your triage history</p>
                </div>
              </div>
              <Button 
                onClick={createNewChat} 
                className="mt-4 w-full gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-md"
              >
                <Plus className="h-4 w-4" />
                New conversation
              </Button>
            </div>
            
            <ScrollArea className="flex-1 px-2 py-4">
              <div className="space-y-1">
                {sessions.map((session) => {
                  const active = session.id === activeSessionId;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        setActiveSessionId(session.id);
                        setSidebarOpen(false);
                      }}
                      className={`
                        w-full rounded-lg px-3 py-3 text-left transition-all duration-200
                        ${active
                          ? "bg-gradient-to-r from-primary/10 to-primary/5 text-foreground shadow-sm"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          rounded-lg p-1.5 transition-all
                          ${active ? "bg-primary/20" : "bg-gray-100"}
                        `}>
                          <MessageSquare className={`h-4 w-4 ${active ? "text-primary" : "text-gray-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{session.title}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(session.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-t border-gray-100 p-4">
              <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium text-gray-700">AI-powered triage</p>
                </div>
                <p className="mt-1 text-xs text-gray-500">Not for emergencies • Always verify with hospitals</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-h-0">
          <ChatPanel
            key={activeSession.id}
            initialTurns={activeSession.turns}
            onTurnsChange={handleSessionUpdate}
          />
        </main>
      </div>
    </div>
  );
}

// Welcome message component
function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-4 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 p-4">
        <Bot className="h-12 w-12 text-primary" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900">How can I help you today?</h3>
      <p className="mt-2 max-w-md text-gray-500">
        Describe your symptoms and location, and I'll help find the right care for you.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {[
          "Chest pain and difficulty breathing",
          "Fever with severe headache",
          "Broken arm after a fall",
          "Severe abdominal pain",
        ].map((suggestion) => (
          <button
            key={suggestion}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatPanel({
  initialTurns,
  onTurnsChange,
}: {
  initialTurns: ChatTurn[];
  onTurnsChange: (turns: ChatTurn[]) => void;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>(initialTurns);
  const [input, setInput] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState<Location | undefined>();
  const [isLocating, setIsLocating] = useState(false);
  const [stageIdx, setStageIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useMutation({
    mutationFn: postChat,
    onSuccess: (res) => {
      setStageIdx(-1);
      setTurns((t) => [
        ...t.filter((x) => x.role !== "stage"),
        {
          id: res.assistant.id,
          role: "assistant",
          content: res.assistant.text,
          data: res.assistant,
          timestamp: Date.now(),
        },
      ]);
    },
    onError: () => {
      setStageIdx(-1);
      setTurns((t) => [
        ...t.filter((x) => x.role !== "stage"),
        { 
          id: `err-${Date.now()}`, 
          role: "assistant", 
          content: "I'm having trouble processing your request. Please try again.",
          timestamp: Date.now(),
        },
      ]);
      toast.error("Unable to process your request. Please try again.");
    },
  });

  useEffect(() => {
    if (mutation.isPending) {
      setStageIdx(0);
      const timers = STAGES.map((_, i) => window.setTimeout(() => setStageIdx(i), i * 400));
      return () => timers.forEach((t) => window.clearTimeout(t));
    }
  }, [mutation.isPending]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [turns, stageIdx]);

  useEffect(() => {
    onTurnsChange(turns);
  }, [turns, onTurnsChange]);

  const useGeo = () => {
    if (isLocating) return;
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported on this device");
      return;
    }
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: Location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        };
        setLocation(loc);
        setCity(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setIsLocating(false);
        toast.success("Location detected successfully");
      },
      () => {
        setIsLocating(false);
        toast.error("Unable to get your location. Please enter city manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || mutation.isPending) return;
    const message = input.trim();
    let loc = location;
    if (!loc && city.trim()) {
      const c = city.trim().toLowerCase();
      if (c.includes("pune")) {
        loc = { lat: 18.52, lng: 73.85, label: city };
      } else if (c.includes("mumbai")) {
        loc = { lat: 19.05, lng: 72.83, label: city };
      } else if (c.includes("casablanca") || c === "casa" || c.includes("الدار")) {
        loc = { lat: 33.5883, lng: -7.6114, label: city };
      } else if (c.includes("rabat")) {
        loc = { lat: 34.0209, lng: -6.8416, label: city };
      } else if (c.includes("marrakech") || c.includes("marrakesh")) {
        loc = { lat: 31.6295, lng: -7.9811, label: city };
      } else if (c.includes("fes") || c.includes("fès") || c.includes("fez")) {
        loc = { lat: 34.0181, lng: -5.0078, label: city };
      } else {
        loc = { lat: DEFAULT_MAP_ORIGIN.lat, lng: DEFAULT_MAP_ORIGIN.lng, label: city };
      }
      setLocation(loc);
    }
    setTurns((t) => [...t, { 
      id: `u-${Date.now()}`, 
      role: "user", 
      content: message,
      timestamp: Date.now(),
    }]);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    mutation.mutate({ message, location: loc });
  };

  const hasMessages = turns.length > 1 || (turns.length === 1 && turns[0].role !== "assistant");

  return (
    <>
      {/* Chat Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm px-4 py-3 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <h1 className="font-heading text-xl font-semibold text-gray-900">AI Symptom Triage</h1>
              <p className="text-xs text-gray-500">Powered by Agentic AI • Real-time hospital matching</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-6 md:px-8" ref={scrollRef}>
        {!hasMessages ? (
          <WelcomeMessage />
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
            {turns.map((t) => (
              <div key={t.id} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                {t.role === "user" ? (
                  <div className="group flex max-w-[85%] gap-3">
                    <div className="flex-1">
                      <div className="rounded-2xl rounded-br-md bg-gradient-to-r from-primary to-primary/90 px-4 py-3 text-white shadow-md">
                        <p className="text-sm leading-relaxed">{t.content}</p>
                      </div>
                      {t.timestamp && (
                        <p className="mt-1 text-right text-xs text-gray-400">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">U</AvatarFallback>
                    </Avatar>
                  </div>
                ) : (
                  <div className="group flex max-w-[85%] gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      {t.data?.lowConfidence && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                          <div>
                            <p className="text-sm font-medium">Limited data available</p>
                            <p className="text-xs">Please call the hospital to verify bed availability and doctor schedules.</p>
                          </div>
                        </div>
                      )}
                      <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                        <p className="text-sm leading-relaxed text-gray-800">{t.content}</p>
                      </div>
                      {t.data?.cards.map((c) => (
                        <HospitalCardView key={c.hospitalId} card={c} />
                      ))}
                      {t.timestamp && (
                        <p className="text-xs text-gray-400">{new Date(t.timestamp).toLocaleTimeString()}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {mutation.isPending && stageIdx >= 0 && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%]">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-r from-primary/20 to-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                    <div className="space-y-2">
                      {STAGES.map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                          {i < stageIdx ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : i === stageIdx ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border border-gray-300" />
                          )}
                          <span className={`text-xs ${i <= stageIdx ? "text-gray-700" : "text-gray-400"}`}>
                            {s}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm p-4 md:p-6">
        <form onSubmit={submit} className="mx-auto max-w-4xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" size="sm" onClick={useGeo} disabled={isLocating} className="gap-1.5">
                    {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    {isLocating ? "Detecting..." : "Location"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Use your current location</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Input
              placeholder="Or enter city (e.g. Casablanca, Rabat, Mumbai)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 max-w-[200px]"
            />
            
            {location?.label && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Location set
              </Badge>
            )}
          </div>
          
          <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
            <Textarea
              ref={inputRef}
              placeholder="Describe your symptoms... (e.g., 'Chest pain and shortness of breath for 30 minutes')"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(e);
                }
              }}
              rows={1}
              className="min-h-[44px] max-h-32 resize-none border-0 p-3 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || mutation.isPending} 
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-r from-primary to-primary/90 shadow-md"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          
          <p className="mt-2 text-center text-xs text-gray-400">
            AI-powered recommendations • Always verify with hospitals before visiting
          </p>
        </form>
      </div>
    </>
  );
}

const DEFAULT_WELCOME_TURN: ChatTurn = {
  id: "welcome",
  role: "assistant",
  content: "Hello! I'm your AI healthcare assistant. Describe your symptoms and location, and I'll help find the most suitable hospitals near you with real-time availability.",
  timestamp: Date.now(),
};

function createSession(title: string): ChatSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    turns: [DEFAULT_WELCOME_TURN],
    updatedAt: Date.now(),
  };
}

function inferTitle(turns: ChatTurn[]): string {
  const firstUser = turns.find((t) => t.role === "user");
  if (!firstUser) return "New conversation";
  return firstUser.content.length > 40
    ? `${firstUser.content.slice(0, 40)}...`
    : firstUser.content;
}

function loadStoredSessions(): ChatSession[] {
  if (typeof window === "undefined") return [createSession("New conversation")];
  const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
  if (!raw) return [createSession("New conversation")];
  try {
    const parsed = JSON.parse(raw) as ChatSession[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [createSession("New conversation")];
    return parsed.filter((s) => s?.id && Array.isArray(s.turns));
  } catch {
    return [createSession("New conversation")];
  }
}

const loadLabel: Record<HospitalCard["loadLevel"], { label: string; cls: string; icon: any }> = {
  low: { label: "Available", cls: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
  medium: { label: "Limited", cls: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock },
  high: { label: "Near Capacity", cls: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle },
};

function HospitalCardView({ card }: { card: HospitalCard }) {
  const load = loadLabel[card.loadLevel];
  const LoadIcon = load.icon;
  
  return (
    <div className="group rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/30">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Hospital className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-gray-900">{card.name}</h3>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="h-3 w-3" />
              {card.address}
            </div>
          </div>
          <Badge className={`${load.cls} border px-2 py-1 font-medium gap-1`}>
            <LoadIcon className="h-3 w-3" />
            {load.label}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Clock className="h-4 w-4 text-primary" />
            <span>{card.etaMinutes} min</span>
            <span className="text-gray-400">•</span>
            <span>{card.distanceKm} km</span>
          </div>
          <a href={`tel:${card.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
            <Phone className="h-4 w-4" />
            {card.phone}
          </a>
          <div className="flex items-center gap-1.5 text-gray-600">
            <BedDouble className="h-4 w-4 text-primary" />
            {card.explainMatch.beds}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" className="h-8 gap-1">
            <Link to="/hospitals/$hospitalId" params={{ hospitalId: card.hospitalId }} search={{ specialty: card.specialtyContext }}>
              View Details
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(card.address)}`} target="_blank" rel="noreferrer">
              <Navigation className="h-3 w-3" />
              Directions
            </a>
          </Button>
        </div>

        {card.items.doctors.length > 0 && (
          <div className="mt-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100/50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">On-Call Physicians</p>
            <div className="space-y-2">
              {card.items.doctors.map((d) => (
                <div key={d.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {d.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.name}</p>
                      <p className="text-xs text-gray-500">{d.specialty}</p>
                    </div>
                  </div>
                  {d.room ? (
                    <Badge variant="secondary" className="gap-1">
                      Room {d.room}
                    </Badge>
                  ) : (
                    <span className="text-xs italic text-gray-400">Call to confirm</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Collapsible className="mt-3">
          <CollapsibleTrigger className="group inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            Why this match?
            <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-lg border border-dashed border-gray-200 p-3">
            <div className="grid gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Specialty match:</span>
                <span className="font-medium text-gray-700">{card.explainMatch.specialty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Distance:</span>
                <span className="font-medium text-gray-700">{card.explainMatch.distance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bed availability:</span>
                <span className="font-medium text-gray-700">{card.explainMatch.beds}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <p className="mt-3 text-[10px] text-gray-400">
          Verified {new Date(card.verifiedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

async function postChat(input: { message: string; location?: Location }): Promise<ChatResponse> {
  const triage: TriageResult = await analyzeSymptoms(
    input.message,
    input.location
      ? { lat: input.location.lat, lng: input.location.lng, radius_km: 40 }
      : undefined,
  );
  const cards: HospitalCard[] = triage.recommendedHospitals.map((entry, idx) =>
    toHospitalCard(entry, triage, idx),
  );
  return {
    sessionId: "mock-session",
    assistant: {
      id: `asst-${Date.now()}`,
      text: cards.length > 0
        ? `Based on your symptoms, I've found ${cards.length} hospital${cards.length > 1 ? 's' : ''} that can help with ${triage.specialty}. Here are the best matches:`
        : `I couldn't find hospitals specifically matching your needs. Please call emergency services if this is urgent.`,
      lowConfidence: triage.urgency === "critical" && cards.length === 0,
      cards,
    },
  };
}

function toHospitalCard(entry: RankedHospital, triage: TriageResult, idx: number): HospitalCard {
  const h = entry.hospital;
  const beds = h.beds.icu.available + h.beds.general.available;
  const loadLevel: HospitalCard["loadLevel"] = beds > 20 ? "low" : beds > 6 ? "medium" : "high";

  const doctors: DoctorCard[] = [
    {
      id: `${h.id}-doc-1`,
      name: triage.specialty === "Cardiology" ? "Dr. Bennani (demo)" : "Dr. Tazi (demo)",
      specialty: triage.specialty,
      room: idx === 0 ? `Suite ${12 + idx}` : null,
      available: true,
    },
  ];

  return {
    hospitalId: h.id,
    name: h.name,
    address: `${h.address}, ${h.city}`,
    phone: h.phone,
    etaMinutes: h.travelTimeMin ?? 15,
    distanceKm: h.distanceKm ?? 5,
    verifiedAt: new Date().toISOString(),
    loadLevel,
    explainMatch: {
      specialty: triage.specialty,
      distance: `${h.distanceKm ?? 5} km`,
      beds: `${h.beds.icu.available} ICU • ${h.beds.general.available} General`,
    },
    items: { doctors },
    specialtyContext: triage.specialty,
    rating: 4.5,
    reviews: 128,
  };
}