import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, Sparkles, Building2, Plane, MessageCircle, Award } from "lucide-react";

export const Route = createFileRoute("/_public/how-it-works")({
  head: () => ({ meta: [{ title: "How it works — SmileAbroad" }, { name: "description", content: "From your first question to your final crown — see how SmileAbroad works." }] }),
  component: HowItWorks,
});

const steps = [
  { i: ClipboardCheck, t: "1. Complete your assessment", b: "Guided questions + optional photos or X-rays. Takes ~5 minutes." },
  { i: Sparkles, t: "2. Preliminary roadmap", b: "Estimated treatment, visits, healing time & price range — instantly." },
  { i: Building2, t: "3. Compare verified clinics", b: "Real ratings, response times & languages. Apply to one or many." },
  { i: MessageCircle, t: "4. Talk to your coordinator", b: "A real person, in your language, guiding you through every step." },
  { i: Plane, t: "5. Travel with confidence", b: "Hotel, transfers and appointments coordinated end to end." },
  { i: Award, t: "6. Follow-up & guarantee", b: "Up to 10-year guarantee on implants, ongoing check-ins after." },
];

function HowItWorks() {
  return (
    <>
      <section className="gradient-hero py-20"><div className="container-app max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium">How it works</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">Six steps to a new smile.</h1>
      </div></section>
      <section className="container-app py-20 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((s) => (
          <Card key={s.t}><CardContent className="p-6">
            <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center"><s.i className="size-5" /></div>
            <h3 className="font-display text-lg font-semibold mt-4">{s.t}</h3>
            <p className="text-muted-foreground mt-2 text-sm">{s.b}</p>
          </CardContent></Card>
        ))}
      </section>
      <section className="container-app py-10 text-center">
        <Button asChild size="lg"><Link to="/assessment">Start assessment</Link></Button>
      </section>
    </>
  );
}
