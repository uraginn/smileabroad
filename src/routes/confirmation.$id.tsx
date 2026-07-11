import { createFileRoute, Link } from "@tanstack/react-router";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/confirmation/$id")({ component: Confirmation });
function Confirmation() {
  const { id } = Route.useParams();
  const hydrated = useMockStoreHydrated();
  const application = useMockStore((state) => state.applications.find((item) => item.id === id));
  const clinic = useMockStore((state) => state.clinics.find((item) => item.id === application?.clinic_id));
  if (!hydrated) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading confirmation…</div>;
  if (!application) return <main className="min-h-screen bg-surface grid place-items-center p-4"><Card className="w-full max-w-lg"><CardContent className="p-8 text-center"><h1 className="font-display text-2xl font-semibold">Confirmation unavailable</h1><p className="text-sm text-muted-foreground mt-3">This application reference is invalid or no longer available.</p><div className="mt-6 flex justify-center gap-2"><Button asChild><Link to="/">Return home</Link></Button><Button asChild variant="outline"><Link to="/assessment">Start assessment</Link></Button></div></CardContent></Card></main>;
  return <main className="min-h-screen bg-surface grid place-items-center p-4"><Card className="w-full max-w-xl"><CardContent className="p-8 sm:p-10 text-center">
    <CheckCircle2 className="size-14 mx-auto text-success" /><h1 className="font-display text-3xl font-semibold mt-5">Thank you</h1>
    <p className="text-muted-foreground mt-3">Your application has been sent successfully. The clinic will review your case and contact you shortly.</p>
    <div className="mt-6 rounded-xl bg-surface border p-4 text-sm text-left space-y-2"><p><span className="text-muted-foreground">Reference:</span> {application.id.slice(0, 12)}</p>{clinic && <><p><span className="text-muted-foreground">Clinic:</span> {clinic.name}</p><p className="flex items-center gap-1.5"><Clock className="size-4 text-muted-foreground" /> Estimated response within {clinic.response_time_hours} hours</p></>}</div>
    <div className="mt-7 flex flex-wrap justify-center gap-2"><Button asChild><Link to="/">Return home</Link></Button><Button asChild variant="outline"><Link to="/clinics">Browse clinics</Link></Button></div>
  </CardContent></Card></main>;
}
