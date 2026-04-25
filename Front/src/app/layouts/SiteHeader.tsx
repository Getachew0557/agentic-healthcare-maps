import { Link, useLocation } from "@tanstack/react-router";
import { Activity, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/triage", label: "Symptom Search" },
  { to: "/map", label: "Hospital Map" },
  { to: "/ingestion", label: "Data Ingestion" },
  { to: "/dashboard", label: "Staff Dashboard" },
  { to: "/admin", label: "Admin" },
] as const;


export function SiteHeader() {
  const loc = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-glow-primary">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Agentic Healthcare Maps</p>
            <p className="text-[11px] text-muted-foreground">AI hospital routing</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const active =
              loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user?.email} • {user?.role}
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            <LogIn className="h-4 w-4" /> Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8 text-xs text-muted-foreground md:px-8">
        <p>
          © {new Date().getFullYear()} Agentic Healthcare Maps. Demo build with mock
          data — not for clinical use.
        </p>
      </div>
    </footer>
  );
}
