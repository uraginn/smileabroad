import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Building2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_public/start")({ component: Start });

function Start() {
  return (
    <section className="container-app py-24">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="font-display text-5xl font-semibold tracking-tight">Where would you like to start?</h1>
        <p className="mt-4 text-muted-foreground">Two paths — pick whichever feels right. You can switch any time.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6 mt-12 max-w-4xl mx-auto">
        <Link to="/assessment" className="group">
          <Card className="h-full hover:border-primary transition-colors"><CardContent className="p-8">
            <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center"><ClipboardCheck className="size-6" /></div>
            <h2 className="font-display text-2xl font-semibold mt-5">Start your assessment</h2>
            <p className="mt-2 text-muted-foreground">Answer a few questions, get a personal treatment roadmap.</p>
            <p className="mt-6 text-primary font-medium group-hover:underline">Begin →</p>
          </CardContent></Card>
        </Link>
        <Link to="/clinics" className="group">
          <Card className="h-full hover:border-primary transition-colors"><CardContent className="p-8">
            <div className="size-12 rounded-xl bg-accent/15 text-accent grid place-items-center"><Building2 className="size-6" /></div>
            <h2 className="font-display text-2xl font-semibold mt-5">Browse clinics first</h2>
            <p className="mt-2 text-muted-foreground">Compare verified clinics side by side, then start.</p>
            <p className="mt-6 text-primary font-medium group-hover:underline">Explore →</p>
          </CardContent></Card>
        </Link>
      </div>
      <div className="mt-10 text-center">
        <Button asChild variant="ghost"><Link to="/for-clinics"><Sparkles className="size-4 mr-1" /> I'm a dental professional</Link></Button>
      </div>
    </section>
  );
}
