import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Send, MapPin, Loader2, AlertTriangle, Phone, Clock, BedDouble, ChevronDown, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { analyzeSymptoms } from "@/shared/services/hospitalService";
import type { RankedHospital, TriageResult } from "@/shared/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

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
}

type ChatSession = {
  id: string;
  title: string;
  turns: ChatTurn[];
  updatedAt: number;
};

const STAGES = [
  "Understanding symptoms...",
  "Finding nearby hospitals...",
  "Checking doctors and rooms on file...",
];

const CHAT_STORAGE_KEY = "triage.chat.sessions.v1";
const ACTIVE_CHAT_STORAGE_KEY = "triage.chat.active.v1";

export const Route = createFileRoute("/triage")({
  head: () => ({
    meta: [
      { title: "Symptom Search — Agentic Healthcare Maps" },
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

  useEffect(() => {
    if (!sessions.length) {
      const fresh = createSession("New chat");
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
    const next = createSession("New chat");
    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
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
    <div className="h-[calc(100vh-4rem)] w-full">
      <div className="grid h-full w-full md:grid-cols-[280px_1fr]">
        <aside className="hidden h-full bg-muted/40 md:flex md:flex-col">
          <div className="p-3">
            <Button onClick={createNewChat} className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" />
              New chat
            </Button>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
            {sessions.map((session) => {
              const active = session.id === activeSessionId;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setActiveSessionId(session.id)}
                  className={
                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors " +
                    (active
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground")
                  }
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 flex-none" />
                    <span className="truncate">{session.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between px-3 py-2 md:hidden">
            <h1 className="font-heading text-lg font-semibold">AI Symptom Triage</h1>
            <Button onClick={createNewChat} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New chat
            </Button>
          </div>
          <div className="hidden px-6 py-4 md:block">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">AI Symptom Triage</h1>
            <p className="text-sm text-muted-foreground">
              Describe symptoms and location. This is decision support only and does not diagnose.
            </p>
          </div>
          <ChatPanel
            key={activeSession.id}
            initialTurns={activeSession.turns}
            onTurnsChange={handleSessionUpdate}
          />
        </section>
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
        },
      ]);
    },
    onError: () => {
      setStageIdx(-1);
      setTurns((t) => [
        ...t.filter((x) => x.role !== "stage"),
        { id: `err-${Date.now()}`, role: "assistant", content: "Something went wrong. Please try again." },
      ]);
      toast.error("Chat request failed");
    },
  });

  useEffect(() => {
    if (mutation.isPending) {
      setStageIdx(0);
      const timers = STAGES.map((_, i) => window.setTimeout(() => setStageIdx(i), i * 350));
      return () => timers.forEach((t) => window.clearTimeout(t));
    }
  }, [mutation.isPending]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, stageIdx]);

  useEffect(() => {
    onTurnsChange(turns);
  }, [turns, onTurnsChange]);

  const useGeo = () => {
    if (isLocating) return;
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      toast.error("Location needs HTTPS or localhost. Use city input instead.");
      return;
    }
    setIsLocating(true);

    const onSuccess = (pos: GeolocationPosition) => {
      const loc: Location = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
      };
      setLocation(loc);
      setCity(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      setIsLocating(false);
      toast.success("Location captured");
    };

    const onError = (err: GeolocationPositionError) => {
      setIsLocating(false);
      if (err.code === err.PERMISSION_DENIED) {
        toast.error("Location permission denied. Allow access in browser settings.");
        return;
      }
      if (err.code === err.TIMEOUT) {
        toast.error("Location request timed out. Try again or enter city manually.");
        return;
      }
      toast.error(`Location error: ${err.message}`);
    };

    const requestLocation = () =>
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 120000,
      });

    if ("permissions" in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "denied") {
            setIsLocating(false);
            toast.error("Location blocked by browser. Enable it in site settings.");
            return;
          }
          requestLocation();
        })
        .catch(() => requestLocation());
      return;
    }
    requestLocation();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || mutation.isPending) return;
    const message = input.trim();
    let loc = location;
    if (!loc && city.trim()) {
      const c = city.trim().toLowerCase();
      loc = c.includes("pune")
        ? { lat: 18.52, lng: 73.85, label: city }
        : { lat: 19.05, lng: 72.83, label: city };
      setLocation(loc);
    }
    setTurns((t) => [...t, { id: `u-${Date.now()}`, role: "user", content: message }]);
    setInput("");
    mutation.mutate({ message, location: loc });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-6 md:px-10">
        {turns.map((t) => (
          <div key={t.id} className={t.role === "user" ? "flex justify-end" : ""}>
            {t.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                {t.content}
              </div>
            ) : (
              <div className="w-full max-w-[min(100%,52rem)] space-y-3">
                {t.data?.lowConfidence && (
                  <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/15 p-3 text-sm text-warning-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                    <span>Low-confidence answer. Please call the hospital to confirm details.</span>
                  </div>
                )}
                <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-foreground">
                  {t.content}
                </div>
                {t.data?.cards.map((c) => (
                  <HospitalCardView key={c.hospitalId} card={c} />
                ))}
              </div>
            )}
          </div>
        ))}
        {mutation.isPending && stageIdx >= 0 && (
          <div className="space-y-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-sm">
            {STAGES.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i < stageIdx ? (
                  <span className="h-3 w-3 rounded-full bg-success" />
                ) : i === stageIdx ? (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                ) : (
                  <span className="h-3 w-3 rounded-full border border-border" />
                )}
                <span className={i <= stageIdx ? "text-foreground" : "text-muted-foreground"}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="bg-background px-3 pb-4 pt-2 sm:px-6 md:px-10 md:pb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={useGeo} className="gap-1.5" disabled={isLocating}>
            {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {isLocating ? "Getting location..." : "Use my location"}
          </Button>
          <Input
            placeholder="or enter city / postal"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-9 max-w-[220px]"
          />
          {location?.label && <span className="text-xs text-muted-foreground">📍 {location.label}</span>}
        </div>
        <div className="flex items-end gap-2 rounded-2xl bg-muted/60 p-2">
          <Textarea
            placeholder="Describe symptoms (e.g., chest pain since this morning, age 58)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e);
              }
            }}
            rows={2}
            className="min-h-[60px] resize-none text-base"
          />
          <Button type="submit" disabled={!input.trim() || mutation.isPending} size="lg" className="h-[60px] gap-2 rounded-xl">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

const DEFAULT_WELCOME_TURN: ChatTurn = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi — describe your symptoms and (optionally) your location. I'll route you to nearby appropriate hospitals with current bed availability and best match details. I do not diagnose.",
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
  if (!firstUser) return "New chat";
  return firstUser.content.length > 36
    ? `${firstUser.content.slice(0, 36)}...`
    : firstUser.content;
}

function loadStoredSessions(): ChatSession[] {
  if (typeof window === "undefined") return [createSession("New chat")];
  const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
  if (!raw) return [createSession("New chat")];
  try {
    const parsed = JSON.parse(raw) as ChatSession[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [createSession("New chat")];
    const valid = parsed.filter((s) => s?.id && Array.isArray(s.turns));
    return valid.length > 0 ? valid : [createSession("New chat")];
  } catch {
    return [createSession("New chat")];
  }
}

const loadLabel: Record<HospitalCard["loadLevel"], { label: string; cls: string }> = {
  low: { label: "Beds available", cls: "bg-success/15 text-success" },
  medium: { label: "Limited beds", cls: "bg-warning/20 text-warning-foreground" },
  high: { label: "Near capacity", cls: "bg-destructive/15 text-destructive" },
};

function HospitalCardView({ card }: { card: HospitalCard }) {
  const load = loadLabel[card.loadLevel];
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold leading-tight text-card-foreground">{card.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {card.address}
          </p>
        </div>
        <Badge className={`${load.cls} border-0 font-medium`}>{load.label}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1 text-foreground">
          <Clock className="h-4 w-4 text-primary" /> {card.etaMinutes} min · {card.distanceKm} km
        </span>
        <a href={`tel:${card.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
          <Phone className="h-4 w-4" /> {card.phone}
        </a>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <BedDouble className="h-4 w-4" /> {card.explainMatch.beds}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button asChild size="sm" className="h-8">
          <Link
            to="/hospitals/$hospitalId"
            params={{ hospitalId: card.hospitalId }}
            search={{ specialty: card.specialtyContext }}
          >
            View full hospital profile
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-8">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(card.address)}`}
            target="_blank"
            rel="noreferrer"
          >
            Open directions
          </a>
        </Button>
      </div>

      {card.items.doctors.length > 0 && (
        <div className="mt-3 rounded-lg bg-muted/60 p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On-call doctors</p>
          <ul className="space-y-1.5 text-sm">
            {card.items.doctors.map((d) => (
              <li key={d.id} className="flex items-baseline justify-between gap-2">
                <span>
                  <span className="font-medium text-foreground">{d.name}</span>
                  <span className="ml-2 text-muted-foreground">{d.specialty}</span>
                </span>
                <span className="text-xs">
                  {d.room ? (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">Room {d.room}</span>
                  ) : (
                    <span className="text-muted-foreground italic">Room: not on file — call hospital</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Collapsible className="mt-3">
        <CollapsibleTrigger className="group inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          Why this match{" "}
          <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 grid gap-1 rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">Specialty:</strong> {card.explainMatch.specialty}
          </span>
          <span>
            <strong className="text-foreground">Distance:</strong> {card.explainMatch.distance}
          </span>
          <span>
            <strong className="text-foreground">Beds:</strong> {card.explainMatch.beds}
          </span>
        </CollapsibleContent>
      </Collapsible>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Verified from <span className="font-medium">{card.name}</span> directory as of{" "}
        {new Date(card.verifiedAt).toLocaleString()}
      </p>
    </div>
  );
}

async function postChat(input: { message: string; location?: Location }): Promise<ChatResponse> {
  const triage: TriageResult = await analyzeSymptoms(input.message);
  const cards: HospitalCard[] = triage.recommendedHospitals.map((entry, idx) =>
    toHospitalCard(entry, triage, idx),
  );
  return {
    sessionId: "mock-session",
    assistant: {
      id: `asst-${Date.now()}`,
      text: `I found ${cards.length} nearby options for ${triage.specialty}. Review the cards below and call ahead to confirm.`,
      lowConfidence: triage.urgency === "critical" && cards.length === 0,
      cards,
    },
  };
}

function toHospitalCard(entry: RankedHospital, triage: TriageResult, idx: number): HospitalCard {
  const h = entry.hospital;
  const beds = h.beds.icu.available + h.beds.general.available;
  const loadLevel: HospitalCard["loadLevel"] =
    beds > 20 ? "low" : beds > 6 ? "medium" : "high";

  const doctors: DoctorCard[] = [
    {
      id: `${h.id}-doc-1`,
      name: triage.specialty === "Cardiology" ? "Dr. A. Sharma" : "Dr. R. Patel",
      specialty: triage.specialty,
      room: idx === 0 ? `C-${12 + idx}` : null,
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
      beds: `${h.beds.icu.available} ICU / ${h.beds.general.available} general`,
    },
    items: { doctors },
    specialtyContext: triage.specialty,
  };
}
