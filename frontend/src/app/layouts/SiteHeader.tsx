import { Link, useLocation } from "@tanstack/react-router";
import { LogIn, LogOut, Menu, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const CENTER_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

const CLIENT_LINKS = [
  { to: "/triage", label: "Triage" },
  { to: "/map", label: "Nearby Hospitals Map" },
] as const;

const STAFF_ADMIN_LINKS = [{ to: "/dashboard", label: "Dashboard" }] as const;

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function SiteHeader() {
  const loc = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const isClientUser = isAuthenticated && user?.role === "patient";
  const isStaffOrAdmin = isAuthenticated && (user?.role === "staff" || user?.role === "admin");
  const desktopCenterLinks = isClientUser
    ? CLIENT_LINKS
    : isStaffOrAdmin
      ? STAFF_ADMIN_LINKS
      : CENTER_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img
              src="/chatmap-logo.png"
              alt="ChatMap logo"
              className="h-9 w-9 shrink-0 rounded-lg object-cover shadow-glow-primary"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold tracking-tight">ChatMap</p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">Clarity in urgent moments</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <nav className="hidden items-center gap-1.5 md:flex">
            {desktopCenterLinks.map((n) => {
              const active = loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));
              return <NavLink key={n.to} to={n.to} label={n.label} active={active} />;
            })}
          </nav>
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="hidden max-w-[160px] truncate text-xs text-muted-foreground md:inline" title={user?.email ?? ""}>
                {user?.email} · {user?.role}
              </span>
              <Button variant="outline" size="sm" onClick={logout} className="h-9 gap-1.5 font-medium">
                <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden h-9 sm:inline-flex">
                <Link to="/login" search={{ redirect: undefined }} className="gap-1.5">
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm" className="hidden h-9 shadow-glow-primary sm:inline-flex">
                <Link to="/signup" className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  Create account
                </Link>
              </Button>
            </>
          )}

          {/* Mobile / tablet sheet */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 lg:hidden" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,22rem)]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-1">
                {(isClientUser ? CLIENT_LINKS : isStaffOrAdmin ? STAFF_ADMIN_LINKS : CENTER_LINKS).map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    {n.label}
                  </Link>
                ))}
                {isAuthenticated && !isClientUser && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setOpen(false);
                      }}
                      className="mt-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/5"
                    >
                      Sign out
                    </button>
                  </>
                )}
                {!isAuthenticated && (
                  <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                    <Button asChild variant="outline" className="w-full" onClick={() => setOpen(false)}>
                      <Link to="/login" search={{ redirect: undefined }}>
                        Sign in
                      </Link>
                    </Button>
                    <Button asChild className="w-full shadow-glow-primary" onClick={() => setOpen(false)}>
                      <Link to="/signup">Create account</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/90">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
        <p>© {new Date().getFullYear()} ChatMap. Hacka-Nation</p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
