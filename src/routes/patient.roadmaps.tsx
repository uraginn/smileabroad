import { createFileRoute, Link } from "@tanstack/react-router";
import { selectPatientRoadmaps, useMockStore } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { useShallow } from "zustand/react/shallow";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/patient/roadmaps")({ component: Roadmaps });

function Roadmaps() {
  const patientUserId = useAuth((s) => (s.user?.role === "patient" ? s.user.id : undefined));
  const roadmaps = useMockStore(useShallow(selectPatientRoadmaps(patientUserId)));
  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="My roadmaps" description="Every preliminary roadmap generated from your assessments." />
      {roadmaps.length === 0 ? (
        <EmptyState title="No roadmaps yet" action={<Button asChild><Link to="/assessment">Start assessment</Link></Button>} />
      ) : (
        <div className="grid gap-3">
          {roadmaps.map((r) => (
            <Link key={r.id} to="/roadmap/$id" params={{ id: r.id }}>
              <Card className="hover:border-primary transition"><CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{r.estimated_treatment}</p>
                  <p className="text-sm text-muted-foreground">{r.estimated_visits} visits • {r.healing_weeks}w healing</p>
                </div>
                <Badge>€{r.price_min}–€{r.price_max}</Badge>
              </CardContent></Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
