import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_public/treatments")({
  head: () => ({ meta: [{ title: "Treatments — SmileAbroad" }, { name: "description", content: "Explore treatments — from implants and All-on-4 to veneers, crowns, and whitening." }] }),
  component: Treatments,
});

const treatments = [
  { t: "Dental Implants", from: "€400", d: "Single implants with premium brands (Straumann, Nobel, Osstem)." },
  { t: "All-on-4 / All-on-6", from: "€3,900 / arch", d: "Full arch fixed rehabilitation on 4 or 6 implants." },
  { t: "Porcelain Veneers", from: "€250", d: "Emax and Zirconia veneers for a natural aesthetic result." },
  { t: "Zirconia Crowns", from: "€180", d: "Full-ceramic crowns for a metal-free, natural look." },
  { t: "Root Canal", from: "€90", d: "Endodontic treatment under microscope." },
  { t: "Teeth Whitening", from: "€120", d: "In-clinic bleaching + take-home trays." },
  { t: "Composite Bonding", from: "€90", d: "Minimally invasive aesthetic improvements." },
  { t: "Full Mouth Rehabilitation", from: "€8,000+", d: "Complex multi-disciplinary cases, planned end to end." },
];

function Treatments() {
  return (
    <>
      <section className="gradient-hero py-20"><div className="container-app max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium">Treatments</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">Every treatment, transparently priced.</h1>
      </div></section>
      <section className="container-app py-20 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {treatments.map((t) => (
          <Card key={t.t}><CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-display text-lg font-semibold">{t.t}</h3>
              <div className="text-right shrink-0"><p className="text-xs text-muted-foreground">from</p><p className="font-display font-semibold">{t.from}</p></div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 flex-1">{t.d}</p>
            <Button asChild size="sm" variant="outline" className="mt-4 self-start"><Link to="/assessment">Get estimate</Link></Button>
          </CardContent></Card>
        ))}
      </section>
    </>
  );
}
