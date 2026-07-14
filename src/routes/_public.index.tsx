import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ShieldCheck,
  ClipboardCheck,
  Building2,
  Sparkles,
  Star,
  Globe,
  MessageCircle,
  CheckCircle2,
  Clock,
  Award,
  Plane,
} from "lucide-react";
import { seedClinics } from "@/lib/mock/seed";
import { ClinicCard } from "@/components/clinic-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_public/")({ component: Home });

function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Treatments />
      <Destinations />
      <Clinics />
      <WhyUs />
      <ForClinics />
      <FAQ />
      <FinalCTA />
    </>
  );
}

function Hero() {
  return (
    <section className="gradient-hero">
      <div className="container-app pt-20 pb-24 lg:pt-28 lg:pb-32">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Sparkles className="size-3" /> Trusted by 3,200+ patients
          </Badge>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-balance">
            Dental treatment abroad, <span className="text-primary">without the guesswork.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Get a preliminary treatment roadmap in minutes, compare verified clinics side by side,
            and travel with a coordinator by your side — from first consult to final crown.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="text-base h-12 px-6">
              <Link to="/assessment">
                Start your dental journey <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base h-12 px-6">
              <Link to="/for-clinics">Join as a dental professional</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" /> Verified clinics only
            </span>
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="size-4 text-success" /> Human coordinator
            </span>
            <span className="inline-flex items-center gap-2">
              <Award className="size-4 text-success" /> Up to 10-year guarantee
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: ClipboardCheck,
      title: "Complete your assessment",
      body: "Answer a few guided questions and upload any dental photos or X-rays you have — takes ~5 minutes.",
    },
    {
      icon: Sparkles,
      title: "Get a preliminary roadmap",
      body: "Receive an estimated treatment plan, visit count and price range — before you commit to anything.",
    },
    {
      icon: Building2,
      title: "Compare verified clinics",
      body: "Real ratings, response times, hotel & transfer details. Apply to one or many with a single click.",
    },
    {
      icon: Plane,
      title: "Travel with confidence",
      body: "Your dedicated coordinator handles the details, so you focus on your smile.",
    },
  ];
  return (
    <section id="how" className="py-24">
      <div className="container-app">
        <SectionHeading
          eyebrow="How it works"
          title="From first question to final crown, in one place."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
          {steps.map((s, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-6">
                <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <s.icon className="size-5" />
                </div>
                <p className="text-xs text-muted-foreground mt-4">Step {i + 1}</p>
                <h3 className="font-display text-lg font-semibold mt-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Treatments() {
  const items = [
    { title: "Dental Implants", from: "€400", note: "Straumann · Nobel · Osstem" },
    { title: "All-on-4 / All-on-6", from: "€3,900", note: "Full arch rehabilitation" },
    { title: "Porcelain Veneers", from: "€250", note: "Emax · Zirconia" },
    { title: "Zirconia Crowns", from: "€180", note: "Metal-free aesthetics" },
    { title: "Root Canal", from: "€90", note: "Endo microscope" },
    { title: "Teeth Whitening", from: "€120", note: "In-clinic + at-home" },
  ];
  return (
    <section className="py-24 bg-surface border-y border-border/60">
      <div className="container-app">
        <SectionHeading eyebrow="Treatments" title="Every treatment, transparently priced." />
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <Card key={t.title} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold">{t.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.note}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">from</p>
                  <p className="font-display text-lg font-semibold">{t.from}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Destinations() {
  const dests = [
    {
      name: "Istanbul",
      country: "Turkey",
      clinics: 12,
      savings: "Up to 70%",
      img: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80",
    },
    {
      name: "Budapest",
      country: "Hungary",
      clinics: 8,
      savings: "Up to 60%",
      img: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&q=80",
    },
    {
      name: "Cancún",
      country: "Mexico",
      clinics: 6,
      savings: "Up to 65%",
      img: "https://images.unsplash.com/photo-1552074283-f88c1e0ea3c9?w=800&q=80",
    },
  ];
  return (
    <section className="py-24">
      <div className="container-app">
        <SectionHeading eyebrow="Destinations" title="Top dental destinations worldwide." />
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {dests.map((d) => (
            <div key={d.name} className="relative rounded-2xl overflow-hidden group cursor-pointer">
              <img
                src={d.img}
                alt={d.name}
                className="h-72 w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-sm opacity-80">{d.country}</p>
                <h3 className="font-display text-2xl font-semibold">{d.name}</h3>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span>{d.clinics} verified clinics</span>
                  <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 font-medium">
                    {d.savings}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Clinics() {
  return (
    <section className="py-24 bg-surface border-y border-border/60">
      <div className="container-app">
        <SectionHeading
          eyebrow="Verified clinics"
          title="Each clinic vetted, rated and monitored."
        />
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seedClinics.map((c) => (
            <ClinicCard key={c.id} clinic={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Verified clinics only",
      body: "Every partner passes a strict credential, hygiene and equipment audit.",
    },
    {
      icon: Star,
      title: "Real reviews, blended",
      body: "Google & Trustpilot ratings side by side — no cherry-picking.",
    },
    {
      icon: Clock,
      title: "Fast, human coordination",
      body: "A real coordinator responds within hours, not days.",
    },
    {
      icon: Globe,
      title: "One place, every stage",
      body: "Assessment, Roadmap, Treatment Plans, travel and follow-up in a single portal.",
    },
  ];
  return (
    <section className="py-24">
      <div className="container-app">
        <SectionHeading
          eyebrow="Why SmileAbroad"
          title="Built to remove every ounce of uncertainty."
        />
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((i) => (
            <div key={i.title}>
              <div className="size-11 rounded-xl bg-accent/15 text-accent grid place-items-center">
                <i.icon className="size-5" />
              </div>
              <h3 className="font-display text-lg font-semibold mt-4">{i.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{i.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForClinics() {
  const perks = [
    "Qualified international leads",
    "Built-in CRM & pipeline",
    "Branded shared treatment plans",
    "Multi-language patient chat",
  ];
  return (
    <section className="py-24 bg-sidebar text-sidebar-foreground">
      <div className="container-app grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <Badge
            variant="secondary"
            className="bg-sidebar-accent text-sidebar-accent-foreground mb-4"
          >
            For clinics
          </Badge>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Grow your international patient base — without the ad spend.
          </h2>
          <p className="mt-4 text-sidebar-foreground/70 max-w-xl">
            Join a curated network of vetted clinics. Receive pre-qualified leads, manage them in a
            purpose-built CRM, and close with branded treatment plans your patients trust.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/for-clinics">Join the network</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Link to="/for-clinics">See how it works</Link>
            </Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {perks.map((p) => (
            <div
              key={p}
              className="p-5 rounded-xl bg-sidebar-accent/60 border border-sidebar-border"
            >
              <CheckCircle2 className="size-5 text-accent" />
              <p className="mt-3 text-sm font-medium">{p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    [
      "Is SmileAbroad a clinic?",
      "No — SmileAbroad is a platform. We connect patients with independent, vetted clinics abroad.",
    ],
    [
      "How is the price estimate calculated?",
      "The estimate uses your assessment answers and typical clinic pricing. It's a range, not a confirmed price — the clinic confirms it after a clinical exam.",
    ],
    [
      "Are the clinics verified?",
      "Yes. Every clinic passes credential checks, an equipment & hygiene audit, and is continuously monitored via patient feedback.",
    ],
    [
      "Do I have to travel to start?",
      "No. You can complete the assessment, receive your roadmap, and compare clinics entirely online.",
    ],
  ];
  return (
    <section className="py-24">
      <div className="container-app max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Answers, before you ask." />
        <Accordion type="single" collapsible className="mt-10">
          {items.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left">{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24">
      <div className="container-app">
        <div className="rounded-3xl gradient-hero p-10 md:p-16 border border-border/60 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl mx-auto">
            Your new smile could start today.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Take five minutes. Get a personal roadmap. No commitment.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link to="/assessment">
                Start your dental journey <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
              <Link to="/for-clinics">I'm a dental professional</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
        {title}
      </h2>
    </div>
  );
}
