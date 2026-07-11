import { createFileRoute, Link } from "@tanstack/react-router";
import {
  selectPatientApplications,
  selectPatientQuotes,
  selectPatientRoadmaps,
  useMockStore,
} from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { useShallow } from "zustand/react/shallow";
import { StatCard, EmptyState, PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileHeart, Inbox, Map, MessageSquare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/patient/dashboard")({ component: PatientDashboard });

function PatientDashboard() {
  const patientUserId = useAuth((s) => (s.user?.role === "patient" ? s.user.id : undefined));
  const applications = useMockStore(useShallow(selectPatientApplications(patientUserId)));
  const roadmaps = useMockStore(useShallow(selectPatientRoadmaps(patientUserId)));
  const offers = useMockStore(useShallow(selectPatientQuotes(patientUserId)));
  const clinics = useMockStore((s) => s.clinics);
  return (
    <div className="p-6 max-w-6xl">
      <PageHeader title="Welcome back 👋" description="Your dental journey at a glance." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileHeart} label="Applications" value={applications.length} tone="accent" />
        <StatCard icon={Map} label="Roadmaps" value={roadmaps.length} />
        <StatCard icon={Inbox} label="Offers received" value={offers.length} tone="success" />
        <StatCard icon={MessageSquare} label="Unread messages" value={0} />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2"><CardContent className="p-6">
          <h2 className="font-display text-xl font-semibold">Continue your journey</h2>
          <p className="text-sm text-muted-foreground mt-1">Pick up where you left off.</p>
          {roadmaps.length === 0 ? (
            <EmptyState title="No roadmap yet"
              description="Take the assessment to generate your first preliminary roadmap."
              action={<Button asChild><Link to="/assessment">Start assessment</Link></Button>} />
          ) : (
            <div className="mt-4 space-y-2">
              {roadmaps.map((r) => (
                <Link key={r.id} to="/roadmap/$id" params={{ id: r.id }}
                  className="flex items-center justify-between p-4 rounded-lg border hover:border-primary transition">
                  <div>
                    <p className="font-medium">{r.estimated_treatment}</p>
                    <p className="text-sm text-muted-foreground">€{r.price_min.toLocaleString()} – €{r.price_max.toLocaleString()}</p>
                  </div>
                  <Badge variant="secondary">View</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-accent" /><h3 className="font-display font-semibold">Explore clinics</h3></div>
          <p className="text-sm text-muted-foreground mt-2">Discover new destinations & clinics.</p>
          <div className="mt-4 space-y-2">
            {clinics.slice(0, 3).map((c) => (
              <Link key={c.id} to="/clinics/$slug" params={{ slug: c.slug }} className="flex items-center gap-3 hover:bg-secondary p-2 rounded-lg">
                <img src={c.cover_image} alt="" className="size-10 rounded object-cover" />
                <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.city}</p></div>
              </Link>
            ))}
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
