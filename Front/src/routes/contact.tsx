import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Phone, Send, MessageCircle, HelpCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { contactSchema, type ContactInput } from "@/lib/schemas";
import { apiClient } from "@/lib/apiClient";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact us — Agentic Healthcare Maps" },
      { name: "description", content: "Reach out for hackathon, partnerships, and questions — form is static in the demo build." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  async function onSubmit(values: ContactInput) {
    try {
      await apiClient.post("/contacts", values);
      toast.success("Message sent to backend successfully.", { icon: "📬", duration: 3500 });
      form.reset();
    } catch {
      localStorage.setItem("ahm.contact.submitted", new Date().toISOString());
      toast.warning("Backend contact endpoint unavailable. Saved in static mode.", {
        duration: 4000,
      });
      form.reset();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-20">
        {/* Header with gradient underline */}
        <div className="mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <MessageCircle className="h-3.5 w-3.5" />
            Get in touch
          </div>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Contact the team
          </h1>
          <div className="mt-3 h-1 w-20 bg-gradient-to-r from-primary to-primary/40 rounded-full" />
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            This page posts to backend contact endpoints when available, and falls back to static local mode for demos.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Contact info card - redesigned with better visual hierarchy */}
          <Card className="relative overflow-hidden border-border/80 p-6 shadow-elevated md:p-7">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
              <span className="inline-block h-6 w-1 rounded-full bg-primary" />
              Ways to reach
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Demo contact methods — replace with real data in production</p>
            
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li className="group flex gap-4 rounded-xl p-3 transition-all hover:bg-muted/30">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary transition-all group-hover:scale-105">
                  <Mail className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Email</p>
                  <a href="mailto:hello@example.org" className="text-primary underline-offset-4 transition hover:underline">
                    hello@example.org
                  </a>
                </div>
              </li>
              <li className="group flex gap-4 rounded-xl p-3 transition-all hover:bg-muted/30">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary transition-all group-hover:scale-105">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Region</p>
                  <p>Mumbai & Pune (demo data focus — replace with your locale)</p>
                </div>
              </li>
              <li className="group flex gap-4 rounded-xl p-3 transition-all hover:bg-muted/30">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary transition-all group-hover:scale-105">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Phone (optional)</p>
                  <p>+1 (555) 000-0000</p>
                </div>
              </li>
            </ul>
            
            <div className="mt-6 rounded-lg bg-amber-50/50 p-3 text-xs text-amber-700 dark:bg-amber-950/20">
              <HelpCircle className="mb-1 inline-block h-3 w-3 mr-1" />
              For production: wire this form to Resend, SendGrid, or your helpdesk webhook.
            </div>
            
            <Button asChild variant="outline" className="mt-6 w-full gap-2 sm:w-auto">
              <Link to="/">
                Back to home
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Card>

          {/* Form card - redesigned with better spacing */}
          <Card className="border-border/80 p-6 shadow-elevated md:p-7">
            <h2 className="font-heading text-xl font-semibold">Send a message</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll use your feedback to refine routing and the hospital portal.
            </p>

            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider">
                  Full name <span className="text-primary">*</span>
                </Label>
                <Input
                  className="mt-1.5 border-muted/60 bg-background/50 transition-all focus:border-primary/50"
                  autoComplete="name"
                  placeholder="Aisha K."
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                    <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider">
                  Email <span className="text-primary">*</span>
                </Label>
                <Input
                  className="mt-1.5 border-muted/60 bg-background/50 transition-all focus:border-primary/50"
                  type="email"
                  autoComplete="email"
                  placeholder="you@team.org"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                    <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider">
                  Message <span className="text-primary">*</span>
                </Label>
                <Textarea
                  className="mt-1.5 min-h-[140px] resize-y border-muted/60 bg-background/50 transition-all focus:border-primary/50"
                  placeholder="Partnerships, data questions, or demo feedback…"
                  aria-invalid={!!form.formState.errors.message}
                  {...form.register("message")}
                />
                {form.formState.errors.message && (
                  <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                    <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                    {form.formState.errors.message.message}
                  </p>
                )}
              </div>
              
              <Button 
                type="submit" 
                size="lg" 
                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg transition-all hover:shadow-primary/25 sm:w-auto"
                disabled={form.formState.isSubmitting}
              >
                <Send className="h-4 w-4" />
                {form.formState.isSubmitting ? "Sending..." : "Submit"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}