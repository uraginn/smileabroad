import { createFileRoute } from "@tanstack/react-router";
import { selectPatientApplications, useMockStore } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { useShallow } from "zustand/react/shallow";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const Route = createFileRoute("/patient/applications")({ component: Applications });

function Applications() {
  const patientUserId = useAuth((s) => (s.user?.role === "patient" ? s.user.id : undefined));
  const apps = useMockStore(useShallow(selectPatientApplications(patientUserId)));
  const clinics = useMockStore((s) => s.clinics);
  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="My applications" description="Track which clinics you've applied to and their response." />
      {apps.length === 0 ? (
        <EmptyState title="No applications yet" description="Apply to a clinic from your roadmap to get started." />
      ) : (
        <div className="space-y-3">
          {apps.map((a) => {
            const c = clinics.find((x) => x.id === a.clinic_id);
            return (
              <Card key={a.id}><CardContent className="p-5 flex items-center gap-4">
                <img src={c?.cover_image} alt="" className="size-14 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-semibold">{c?.name}</p>
                  <p className="text-sm text-muted-foreground">{c?.city}, {c?.country}</p>
                </div>
                <div className="text-right">
                  <Badge>{a.status}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), "MMM d, yyyy")}</p>
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
