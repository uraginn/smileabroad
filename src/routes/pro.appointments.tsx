import { createFileRoute } from "@tanstack/react-router";
import { useMockStore, selectClinicAppointments } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { CalendarDays, MapPin } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/pro/appointments")({ component: Appointments });

function Appointments() {
  const clinicId = useAuth((s) => s.user?.clinic_id) ?? "clinic_istanbul";
  const appts = useMockStore(useShallow(selectClinicAppointments(clinicId)));
  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Appointments" description="Upcoming consultations and treatments." />
      {appts.length === 0 ? <EmptyState title="No appointments" /> :
        <div className="grid gap-3">
          {appts.map((a) => (
            <Card key={a.id}><CardContent className="p-5 flex items-center gap-4">
              <div className="size-12 rounded-lg bg-primary/10 text-primary grid place-items-center"><CalendarDays className="size-5" /></div>
              <div className="flex-1">
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-3">
                  <span>{format(new Date(a.starts_at), "EEE, MMM d · HH:mm")}</span>
                  <span>·</span><span>{a.duration_min} min</span>
                  {a.location && <><span>·</span><span className="inline-flex items-center gap-1"><MapPin className="size-3" />{a.location}</span></>}
                </p>
              </div>
            </CardContent></Card>
          ))}
        </div>}
    </div>
  );
}
