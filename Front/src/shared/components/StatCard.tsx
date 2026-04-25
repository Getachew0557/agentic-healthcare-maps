import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "emergency" | "primary";
  className?: string;
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-card",
  success: "bg-card border-l-4 border-l-success",
  warning: "bg-card border-l-4 border-l-warning",
  emergency: "bg-card border-l-4 border-l-emergency",
  primary: "bg-card border-l-4 border-l-primary",
};

const iconBg: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  emergency: "bg-emergency/10 text-emergency",
  primary: "bg-primary/10 text-primary",
};

export function StatCard({ label, value, hint, icon, tone = "default", className }: StatCardProps) {
  return (
    <Card className={cn("p-5 shadow-soft transition-shadow hover:shadow-elevated", toneStyles[tone], className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg[tone])}>{icon}</div>}
      </div>
    </Card>
  );
}
