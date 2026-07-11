import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Kanban, MessageSquareHeart, Palette } from "lucide-react";

export const Route = createFileRoute("/_public/for-clinics")({
  head: () => ({ meta: [{ title: "For clinics — SmileAbroad" }, { name: "description", content: "Grow your international patient base with a purpose-built CRM." }] }),
  component: ForClinics,
});

function ForClinics() {
  return (
    <>
      <section className="gradient-hero py-24">
        <div className="container-app max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium">For clinics</p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">Turn international interest into booked treatments.</h1>
          <p className="mt-5 text-lg text-muted-foreground">Join a curated network of verified clinics. Receive pre-qualified leads, close them in your own CRM, and delight patients with branded plans.</p>
          <div className="mt-6 flex gap-3"><Button asChild size="lg"><Link to="/register">Apply to join</Link></Button><Button asChild size="lg" variant="outline"><Link to="/login">Clinic login</Link></Button></div>
        </div>
      </section>
      <section className="container-app py-20 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { i: Kanban, t: "Purpose-built CRM", b: "Pipeline, patient profiles, tasks — designed for dental treatment planning." },
          { i: MessageSquareHeart, t: "Qualified leads", b: "Patients arrive with an assessment, X-rays and a preliminary roadmap." },
          { i: Palette, t: "Branded plans", b: "Send treatment plans and quotes with your logo, colours and terms." },
          { i: CheckCircle2, t: "Simple onboarding", b: "Verification in days, not months. Live in one week." },
        ].map((f) => (
          <Card key={f.t}><CardContent className="p-6">
            <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center"><f.i className="size-5" /></div>
            <h3 className="font-display text-lg font-semibold mt-4">{f.t}</h3>
            <p className="text-sm text-muted-foreground mt-2">{f.b}</p>
          </CardContent></Card>
        ))}
      </section>
    </>
  );
}
