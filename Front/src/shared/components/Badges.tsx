import { Badge } from "@/components/ui/badge";
import type { Hospital, Urgency } from "@/shared/types";
import { cn } from "@/lib/utils";

export function bedStatusOf(h: Pick<Hospital, "beds">): "available" | "low" | "full" | "unknown" {
  const total = h.beds.icu.available + h.beds.general.available;
  if (Number.isNaN(total)) return "unknown";
  if (total === 0) return "full";
  if (total < 20) return "low";
  return "available";
}

export function BedStatusBadge({ hospital }: { hospital: Pick<Hospital, "beds"> }) {
  const status = bedStatusOf(hospital);
  const cfg = {
    available: { label: "Beds available", cls: "bg-success/10 text-success border-success/20" },
    low: { label: "Low availability", cls: "bg-warning/15 text-warning-foreground border-warning/30" },
    full: { label: "No beds", cls: "bg-emergency/10 text-emergency border-emergency/20" },
    unknown: { label: "Unknown", cls: "bg-muted text-muted-foreground border-border" },
  }[status];
  return <Badge variant="outline" className={cn("font-medium", cfg.cls)}>{cfg.label}</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const cfg = {
    critical: { label: "Critical", cls: "bg-emergency text-emergency-foreground border-transparent" },
    urgent: { label: "Urgent", cls: "bg-warning text-warning-foreground border-transparent" },
    moderate: { label: "Moderate", cls: "bg-primary/10 text-primary border-primary/20" },
    routine: { label: "Routine", cls: "bg-muted text-muted-foreground border-border" },
  }[urgency];
  return <Badge variant="outline" className={cn("font-semibold uppercase tracking-wider text-[10px]", cfg.cls)}>{cfg.label}</Badge>;
}
