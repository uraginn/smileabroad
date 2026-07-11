import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClinicCard } from "@/components/clinic-card";
import { PageHeader } from "@/components/ui-bits";
import { AlertTriangle, CalendarDays, Clock, EuroIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/mock-auth";

export const Route = createFileRoute("/roadmap/$id")({ component: RoadmapPage });

function RoadmapPage() {
  const { id } = Route.useParams();
  const hydrated = useMockStoreHydrated();
  const roadmap = useMockStore((s) => s.roadmaps.find((r) => r.id === id));
  const clinics = useMockStore((s) => s.clinics);
  const assessment = useMockStore((s) => s.assessments.find((a) => a.id === roadmap?.assessment_id));
  const apply = useMockStore((s) => s.applyToClinic);
  const { user, loginAs } = useAuth();

  if (!hydrated) return null;
  if (!roadmap || !assessment) throw notFound();

  const recommended = clinics.filter((c) => roadmap.recommended_clinic_ids.includes(c.id));

  const onApply = (clinicId: string) => {
    if (!user || user.role !== "patient") loginAs("patient");
    const uid = useAuth.getState().user!.id;
    apply({
      clinic_id: clinicId, patient_user_id: uid,
      assessment_id: assessment.id, roadmap_id: roadmap.id,
      patient_name: `${assessment.personal.first_name} ${assessment.personal.last_name ?? ""}`.trim() || "New Patient",
      patient_country: assessment.personal.country || assessment.travel.travel_from || "Unknown",
      treatment: assessment.dental.treatment_interest,
    });
    toast.success("Application sent — the clinic will be in touch.");
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-app py-10 max-w-5xl">
        <PageHeader title="Your preliminary roadmap"
          description="Based on your assessment. This is an estimate, not a diagnosis. A qualified dentist will confirm after a clinical exam."
          actions={<Button asChild variant="outline"><Link to="/patient/dashboard">My dashboard</Link></Button>} />

        <Card className="border-warning/40 bg-warning/5 mb-6">
          <CardContent className="p-4 flex gap-3 items-start">
            <AlertTriangle className="size-5 text-warning-foreground mt-0.5" />
            <p className="text-sm text-warning-foreground/90">This roadmap is generated from your answers only. It does not constitute a medical diagnosis or a final quotation.</p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Info icon={CalendarDays} label="Estimated visits" value={String(roadmap.estimated_visits)} />
          <Info icon={Clock} label="Healing period" value={`${roadmap.healing_weeks} weeks`} />
          <Info icon={EuroIcon} label="Price range" value={`€${roadmap.price_min.toLocaleString()} – €${roadmap.price_max.toLocaleString()}`} />
        </div>

        <Card className="mb-8"><CardContent className="p-6">
          <h2 className="font-display text-2xl font-semibold">Patient summary</h2>
          <dl className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Row k="Interested in" v={assessment.dental.treatment_interest} />
            <Row k="Estimated treatment" v={roadmap.estimated_treatment} />
            <Row k="Countries" v={assessment.travel.destination_country || "Any"} />
            <Row k="Cities" v={assessment.travel.preferred_cities.join(", ") || "Any"} />
            <Row k="Chief complaint" v={assessment.dental.concerns || "—"} />
            <Row k="Budget" v={assessment.travel.budget || "—"} />
          </dl>
          <p className="mt-6 text-sm text-muted-foreground">{roadmap.summary}</p>
        </CardContent></Card>

        <h2 className="font-display text-2xl font-semibold mb-4">Recommended clinics</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommended.map((c) => <ClinicCard key={c.id} clinic={c} onApply={onApply} />)}
        </div>
      </div>
    </div>
  );
}

function Info({ icon: I, label, value }: { icon: any; label: string; value: string }) {
  return <Card><CardContent className="p-5 flex items-center gap-3"><div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><I className="size-5" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-display text-lg font-semibold">{value}</p></div></CardContent></Card>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex flex-col"><dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="mt-0.5">{v}</dd></div>;
}
