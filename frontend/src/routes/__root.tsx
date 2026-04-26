import { Outlet, createRootRoute, useLocation } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/app/layouts/SiteHeader";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-7xl font-bold tracking-tight text-primary">404</p>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or was moved.</p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  const loc = useLocation();
  const isFullBleed = loc.pathname.startsWith("/map");
  return (
    <QueryClientProvider client={client}>
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className={isFullBleed ? "flex-1" : "flex-1"}>
          <Outlet />
        </main>
        {!isFullBleed && <SiteFooter />}
        <Toaster richColors position="top-right" />
      </div>
    </QueryClientProvider>
  );
}
