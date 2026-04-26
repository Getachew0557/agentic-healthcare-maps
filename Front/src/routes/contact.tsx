import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Mail, MapPin, Phone, Send, MessageCircle, HelpCircle, 
  ArrowRight, CheckCircle2, Clock, Users, Heart, Globe,
  Twitter, Linkedin, Github, Facebook, Instagram, Sparkles,
  Shield, Award, Calendar, Building2, Activity, Brain
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { contactSchema, type ContactInput } from "@/lib/schemas";
import { apiClient } from "@/lib/apiClient";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Agentic Healthcare Maps" },
      { name: "description", content: "Reach out for partnerships, support, or questions about our AI-powered healthcare routing platform." },
    ],
  }),
  component: ContactPage,
});

const FAQS = [
  { q: "Is this platform free to use?", a: "Yes, during the demo phase. Contact us for enterprise pricing." },
  { q: "How accurate is the AI triage?", a: "Our AI achieves 94.5% accuracy in specialty matching with continuous improvement." },
  { q: "Can hospitals integrate their existing systems?", a: "Yes, we offer API integration with major hospital management systems." },
  { q: "What regions do you cover?", a: "Currently demo focuses on Mumbai & Pune, with planned pan-India expansion." },
];

const SUPPORT_HOURS = [
  { day: "Monday - Friday", hours: "8:00 AM - 8:00 PM" },
  { day: "Saturday", hours: "9:00 AM - 6:00 PM" },
  { day: "Sunday", hours: "10:00 AM - 4:00 PM" },
];

function ContactPage() {
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  async function onSubmit(values: ContactInput) {
    try {
      await apiClient.post("/contact", {
        ...values,
        subject: "General enquiry",
      });
      toast.success("Message sent successfully!", { 
        icon: "✅", 
        duration: 3500,
        description: "We'll get back to you within 24 hours."
      });
      form.reset();
    } catch {
      localStorage.setItem("ahm.contact.submitted", new Date().toISOString());
      toast.success("Message received (Demo Mode)", {
        icon: "📬",
        duration: 4000,
        description: "In production, this would be sent to our team."
      });
      form.reset();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      {/* Hero Section with Background Image */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1920&h=400&fit=crop')",
          }}
        />
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-blue-900/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent" />
        
        {/* Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: "40px 40px",
          }}
        />
        
        {/* Hero Content */}
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center md:px-8 md:py-24">
          <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
            <MessageCircle className="mr-1 h-3 w-3" />
            Get in Touch
          </Badge>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            Let's Connect
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/90 md:text-lg">
            Have questions about our platform? Want to partner with us? 
            We'd love to hear from you and explore how we can work together.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
        {/* Main Grid */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* Contact Info Column */}
          <div className="space-y-6">
            {/* Contact Cards */}
            <Card className="relative overflow-hidden border-0 shadow-xl bg-white">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-1 rounded-full bg-primary" />
                  <h2 className="text-xl font-bold text-gray-900">Contact Information</h2>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Reach out through any of these channels and our team will respond promptly.
                </p>
                
                <div className="space-y-4">
                  <div className="group flex items-start gap-4 rounded-xl p-3 transition-all hover:bg-gray-50">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Email Us</p>
                      <a href="mailto:hello@agentichealth.com" className="text-sm text-primary hover:underline">
                        hello@agentichealth.com
                      </a>
                      <p className="text-xs text-gray-500 mt-1">For general inquiries & support</p>
                    </div>
                  </div>
                  
                  <div className="group flex items-start gap-4 rounded-xl p-3 transition-all hover:bg-gray-50">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Call Us</p>
                      <a href="tel:+15550000000" className="text-sm text-primary hover:underline">
                        +1 (555) 000-0000
                      </a>
                      <p className="text-xs text-gray-500 mt-1">Emergency support available 24/7</p>
                    </div>
                  </div>
                  
                  <div className="group flex items-start gap-4 rounded-xl p-3 transition-all hover:bg-gray-50">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Visit Us</p>
                      <p className="text-sm text-gray-600">Healthcare Innovation Hub</p>
                      <p className="text-xs text-gray-500 mt-1">Mumbai, India (Demo Location)</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Support Hours */}
            <Card className="border-0 shadow-xl bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-primary/5 to-transparent p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-gray-900">Support Hours</h3>
                </div>
                <div className="space-y-2">
                  {SUPPORT_HOURS.map((schedule) => (
                    <div key={schedule.day} className="flex justify-between text-sm">
                      <span className="text-gray-600">{schedule.day}</span>
                      <span className="font-medium text-gray-900">{schedule.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Social Links */}
            <Card className="border-0 shadow-xl bg-white">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Follow Us</h3>
                <div className="flex gap-3">
                  <SocialIcon icon={Twitter} href="#" />
                  <SocialIcon icon={Linkedin} href="#" />
                  <SocialIcon icon={Github} href="#" />
                  <SocialIcon icon={Facebook} href="#" />
                </div>
              </div>
            </Card>
          </div>

          {/* Form Column */}
          <div className="space-y-6">
            {/* Contact Form */}
            <Card className="border-0 shadow-xl bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-primary/5 to-transparent p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Send us a message</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Fill out the form and we'll get back to you within 24 hours.
                </p>
              </div>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    Full Name <span className="text-primary">*</span>
                  </Label>
                  <Input
                    className="mt-1.5 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-primary/50 transition-all"
                    autoComplete="name"
                    placeholder="Dr. Sarah Johnson"
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
                  <Label className="text-sm font-semibold text-gray-700">
                    Email Address <span className="text-primary">*</span>
                  </Label>
                  <Input
                    className="mt-1.5 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-primary/50 transition-all"
                    type="email"
                    autoComplete="email"
                    placeholder="hello@example.com"
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
                  <Label className="text-sm font-semibold text-gray-700">
                    Message <span className="text-primary">*</span>
                  </Label>
                  <Textarea
                    className="mt-1.5 min-h-[150px] resize-y border-gray-200 bg-gray-50/50 focus:bg-white focus:border-primary/50 transition-all"
                    placeholder="Tell us about your inquiry, partnership opportunity, or feedback..."
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
                  className="w-full gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg transition-all hover:shadow-primary/25 hover:scale-[1.02]"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </Card>

            {/* Response Time Guarantee */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Typically responds within 4 hours</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <Shield className="h-4 w-4 text-primary" />
              <span>100% confidential</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <Badge className="mb-3 bg-primary/10 text-primary">FAQ</Badge>
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Frequently Asked Questions
            </h2>
            <div className="mt-2 h-1 w-20 bg-gradient-to-r from-primary to-primary/40 rounded-full mx-auto" />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {FAQS.map((faq, idx) => (
              <Card key={idx} className="border-0 shadow-md hover:shadow-lg transition-all">
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                      <HelpCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{faq.q}</h3>
                      <p className="mt-1 text-sm text-gray-600">{faq.a}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Partnership CTA */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 text-center">
          <div className="inline-flex rounded-full bg-primary/20 p-3 mb-4">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Interested in Partnering?</h3>
          <p className="mt-2 text-gray-600 max-w-md mx-auto">
            Let's work together to revolutionize emergency healthcare routing.
          </p>
          <Button variant="link" className="mt-3 text-primary gap-1">
            Learn about partnerships
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Social Icon Component
function SocialIcon({ icon: Icon, href }: { icon: any; href: string }) {
  return (
    <a
      href={href}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all hover:bg-primary hover:text-white hover:scale-110"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Icon className="h-4 w-4" />
    </a>
  );
}