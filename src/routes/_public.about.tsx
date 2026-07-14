import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, HeartHandshake, Globe2 } from "lucide-react";

export const Route = createFileRoute("/_public/about")({
  head: () => ({
    meta: [
      { title: "About — SmileAbroad" },
      {
        name: "description",
        content:
          "SmileAbroad is on a mission to make world-class dental care accessible, transparent, and stress-free.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <section className="gradient-hero py-24">
        <div className="container-app max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium">About</p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
            World-class dental care, without the borders.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            We believe great dentistry shouldn't depend on your postcode. SmileAbroad exists to
            bring transparency, trust, and human care to every step of the international dental
            journey.
          </p>
        </div>
      </section>
      <section className="container-app py-20 grid md:grid-cols-3 gap-6">
        {[
          {
            i: ShieldCheck,
            t: "Radical transparency",
            b: "Every price, guarantee and review — visible up front.",
          },
          {
            i: HeartHandshake,
            t: "Human coordination",
            b: "A dedicated coordinator, not a chatbot.",
          },
          {
            i: Globe2,
            t: "Global standard, local care",
            b: "European & US-trained dentists, worldwide.",
          },
        ].map((x) => (
          <Card key={x.t}>
            <CardContent className="p-6">
              <x.i className="size-8 text-primary" />
              <h3 className="mt-4 font-display text-xl font-semibold">{x.t}</h3>
              <p className="mt-2 text-muted-foreground">{x.b}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="container-app py-10 text-center">
        <Button asChild size="lg">
          <Link to="/assessment">Start your journey</Link>
        </Button>
      </section>
    </>
  );
}
