import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { 
  MapPin, Shield, Sparkles, Users, HeartHandshake, Target, 
  Eye, Award, ArrowRight, CheckCircle2, Clock, BedDouble,
  Ambulance, Brain, TrendingUp, Globe, Lock, Zap, Phone,
  Mail, MessageCircle, Star, Building2, Activity, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Agentic Healthcare Maps" },
      { name: "description", content: "Our mission, scope, and how we use AI to route people to the right care during emergencies." },
    ],
  }),
  component: AboutPage,
});

const PILLARS = [
  {
    title: "Grounded Answers",
    body: "We designed the assistant to cite hospital and doctor data from the network — not to invent room numbers or names. When something is not on file, the UI says so clearly.",
    icon: Sparkles,
    gradient: "from-amber-500/20 to-orange-500/20",
    color: "amber",
    stat: "100%",
    statLabel: "Transparent Data",
  },
  {
    title: "Privacy by Design",
    body: "This hackathon build uses mock data and static auth for demos. A production system adds explicit consent, retention limits, and regional compliance.",
    icon: Shield,
    gradient: "from-blue-500/20 to-indigo-500/20",
    color: "blue",
    stat: "GDPR",
    statLabel: "Ready",
  },
  {
    title: "Built for the Golden Hour",
    body: "Our ranking blends specialty fit, available capacity, and travel time so families spend less time guessing where to go during emergencies.",
    icon: MapPin,
    gradient: "from-emerald-500/20 to-teal-500/20",
    color: "emerald",
    stat: "<30s",
    statLabel: "Response Time",
  },
];

const TEAM_MEMBERS = [
  { name: "Dr. Sarah Chen", role: "Lead AI Engineer", avatar: "SC", specialty: "Machine Learning" },
  { name: "Michael Rodriguez", role: "Product Director", avatar: "MR", specialty: "Healthcare UX" },
  { name: "Dr. Priya Sharma", role: "Medical Advisor", avatar: "PS", specialty: "Emergency Medicine" },
  { name: "Alex Thompson", role: "Full Stack Lead", avatar: "AT", specialty: "System Architecture" },
];

const MILESTONES = [
  { year: "2024", title: "Platform Launch", description: "Beta release with 8+ hospitals", icon: Rocket },
  { year: "2024", title: "AI Integration", description: "Symptom analysis & routing", icon: Brain },
  { year: "2025", title: "Network Expansion", description: "Pan-India rollout planned", icon: TrendingUp },
];

// Simple Rocket icon component
function Rocket(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.5-1 3-1 3-1s.45 2 2 3z"/>
      <path d="M12 15v5s3.03-.55 4-2c1-1.5 1-3 1-3s-2 .45-3 2z"/>
    </svg>
  );
}

function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      
      {/* Hero Section with Video/Image Background */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1920&h=600&fit=crop')",
          }}
        />
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-blue-900/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent" />
        
        {/* Animated Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: "40px 40px",
          }}
        />
        
        {/* Hero Content */}
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center md:px-8 md:py-28">
          <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
            <Target className="mr-1 h-3 w-3" />
            Our Mission
          </Badge>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Revolutionizing Emergency
            <span className="block text-cyan-300">Healthcare Routing</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90 md:text-xl">
            We're on a mission to ensure every patient reaches the right care, 
            at the right time, through intelligent AI-powered routing.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="gap-2 bg-white text-primary hover:bg-white/90">
              <Link to="/login">
                Start Your Journey
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/30 text-black hover:bg-white/10">
              <Link to="/contact">
                Contact Us
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Mission & Demo Section */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <div className="grid items-start gap-8 lg:grid-cols-2">
          {/* Mission Card with Image Background */}
          <div className="relative overflow-hidden rounded-2xl shadow-xl">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=600&fit=crop')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
            
            <div className="relative p-8 text-white">
              <Badge className="mb-4 bg-white/20 text-white border-0">
                <Eye className="mr-1 h-3 w-3" />
                Why We Exist
              </Badge>
              <h2 className="text-3xl font-bold leading-tight md:text-4xl">
                Solving the 
                <span className="block text-cyan-200">Uncertainty Problem</span>
              </h2>
              <p className="mt-4 text-white/90 leading-relaxed">
                In many places, the hardest part of an emergency is not lack of hospital lists — 
                it's the uncertainty: who has a bed, who is truly qualified for this case, 
                and what is the fastest path there.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm backdrop-blur-sm">
                  <Users className="h-4 w-4" />
                  Patients & Families
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm backdrop-blur-sm">
                  <Building2 className="h-4 w-4" />
                  Hospitals
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm backdrop-blur-sm">
                  <Ambulance className="h-4 w-4" />
                  EMS Providers
                </div>
              </div>
            </div>
          </div>

          {/* Demo Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            <div className="p-8">
              <Badge className="mb-3 bg-primary/10 text-primary border-0">
                <Sparkles className="mr-1 h-3 w-3" />
                Current Scope
              </Badge>
              <h3 className="text-2xl font-bold text-gray-900">Hackathon Demo</h3>
              <p className="mt-2 text-gray-600">
                Explore our platform with mock data and static authentication
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "AI-powered symptom triage & hospital matching",
                  "Interactive map with real-time bed availability",
                  "Hospital staff dashboard for capacity management",
                  "Admin trace view for governance demonstration",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
              <Button asChild className="mt-8 w-full gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg">
                <Link to="/login">
                  Try the Demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard value="8+" label="Partner Hospitals" icon={Building2} />
          <StatCard value="24/7" label="Emergency Support" icon={Clock} />
          <StatCard value="100%" label="Data Transparency" icon={Shield} />
          <StatCard value="<30s" label="Average Response" icon={Zap} />
        </div>
      </section>

      {/* Three Commitments */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-12 text-center">
            <Badge className="mb-3 bg-primary/10 text-primary">Core Values</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              Our Commitments
            </h2>
            <div className="mt-2 h-1 w-20 bg-gradient-to-r from-primary to-primary/40 rounded-full mx-auto" />
            <p className="mt-4 max-w-2xl mx-auto text-gray-600">
              Principles that guide every decision we make
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <Card
                key={pillar.title}
                className="group relative overflow-hidden border-0 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${pillar.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <div className="relative p-6">
                  <div className={`inline-flex rounded-xl bg-${pillar.color}-100 p-3 text-${pillar.color}-600 transition-all duration-300 group-hover:scale-110`}>
                    <pillar.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-gray-900">{pillar.title}</h3>
                  <p className="mt-2 text-gray-600 leading-relaxed">{pillar.body}</p>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">{pillar.stat}</span>
                      <span className="text-xs text-gray-500">{pillar.statLabel}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Badge className="mb-3 bg-primary/10 text-primary">Technology</Badge>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                Powered by Advanced AI
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                We combine cutting-edge artificial intelligence with real-time healthcare data 
                to provide accurate, actionable routing recommendations during critical moments.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Natural language processing for symptom analysis",
                  "Real-time hospital capacity tracking",
                  "Intelligent specialty matching algorithms",
                  "Dynamic routing with traffic consideration",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl blur-3xl" />
              <Card className="relative border-0 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-br from-primary/5 to-blue-500/5 p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="h-8 w-8 text-primary" />
                    <h3 className="text-xl font-bold text-gray-900">System Status</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">API Response Time</span>
                        <span className="text-green-600">Excellent</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full w-[98%] bg-green-500 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Database Uptime</span>
                        <span className="text-green-600">99.99%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full w-[99.99%] bg-green-500 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">AI Model Accuracy</span>
                        <span className="text-blue-600">94.5%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full w-[94.5%] bg-blue-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-12 text-center">
            <Badge className="mb-3 bg-primary/10 text-primary">The Team</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              Meet the Minds Behind the Mission
            </h2>
            <div className="mt-2 h-1 w-20 bg-gradient-to-r from-primary to-primary/40 rounded-full mx-auto" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM_MEMBERS.map((member) => (
              <Card key={member.name} className="group text-center p-6 transition-all hover:-translate-y-1 hover:shadow-xl">
                <Avatar className="mx-auto h-20 w-20">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xl">
                    {member.avatar}
                  </AvatarFallback>
                </Avatar>
                <h3 className="mt-4 font-bold text-gray-900">{member.name}</h3>
                <p className="text-sm text-primary">{member.role}</p>
                <p className="mt-1 text-xs text-gray-500">{member.specialty}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-12 text-center">
            <Badge className="mb-3 bg-primary/10 text-primary">Roadmap</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              What's Next?
            </h2>
            <div className="mt-2 h-1 w-20 bg-gradient-to-r from-primary to-primary/40 rounded-full mx-auto" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {MILESTONES.map((milestone, idx) => (
              <Card key={idx} className="relative p-6 text-center overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full" />
                <div className="relative">
                  <div className="inline-flex rounded-full bg-primary/10 p-3 text-primary">
                    <milestone.icon className="h-6 w-6" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-primary">{milestone.year}</div>
                  <h3 className="mt-2 font-bold text-gray-900">{milestone.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{milestone.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary to-primary/80 py-16">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1920&h=400&fit=crop')",
            backgroundSize: "cover",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 text-center text-white">
          <Heart className="mx-auto mb-4 h-12 w-12 text-white/80" />
          <h2 className="text-3xl font-bold md:text-4xl">
            Ready to Transform Emergency Care?
          </h2>
          <p className="mt-4 text-white/90">
            Join us in our mission to ensure no patient ever wonders where to go in an emergency.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link to="/login">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
              <Link to="/contact">
                Contact Us
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Stat Card Component
function StatCard({ value, label, icon: Icon }: { value: string; label: string; icon: any }) {
  return (
    <Card className="p-6 text-center transition-all hover:shadow-lg">
      <div className="inline-flex rounded-full bg-primary/10 p-3 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </Card>
  );
}