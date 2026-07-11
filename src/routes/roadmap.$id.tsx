import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock, EuroIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClinicCard } from "@/components/clinic-card";
import {
  PlanDisclaimer,
  PlanDocumentHeader,
  PlanDocumentShell,
  PlanSection,
  PlanSummaryGrid,
} from "@/components/care-plan/document";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { mapPreliminaryRoadmap } from "@/lib/care-plan";

export const Route = createFileRoute("/roadmap/$id")({ component: RoadmapPage });

function RoadmapPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useMockStoreHydrated();
  const roadmap = useMockStore((state) => state.roadmaps.find((item) => item.id === id));
  const clinics = useMockStore((state) => state.clinics);
  const assessment = useMockStore((state) =>
    state.assessments.find((item) => item.id === roadmap?.assessment_id),
  );
  const apply = useMockStore((state) => state.applyToClinic);

  if (!hydrated) return null;
  if (!roadmap || !assessment) throw notFound();

  const recommended = clinics.filter((clinic) =>
    roadmap.recommended_clinic_ids.includes(clinic.id),
  );
  const carePlan = mapPreliminaryRoadmap({ roadmap, assessment });

  const onApply = (clinicId: string) => {
    const application = apply({
      clinic_id: clinicId,
      patient_user_id: assessment.patient_user_id,
      assessment_id: assessment.id,
      roadmap_id: roadmap.id,
      patient_name:
        `${assessment.personal.first_name} ${assessment.personal.last_name ?? ""}`.trim() ||
        "New Patient",
      patient_country: assessment.personal.country || assessment.travel.travel_from || "Unknown",
      treatment: assessment.dental.treatment_interest,
    });
    window.localStorage.removeItem("smileabroad-active-journey-v1");
    window.localStorage.removeItem("smileabroad-assessment-draft-v1");
    navigate({ to: "/confirmation/$id", params: { id: application.id } });
    toast.success("Application sent — the clinic will be in touch.");
  };

  return (
    <PlanDocumentShell variant="preliminary">
      <div className="container-app max-w-5xl py-8 sm:py-10">
        <PlanDocumentHeader
          variant="preliminary"
          eyebrow="SmileAbroad care planning"
          title={carePlan.title}
          badge="Preliminary assessment"
          description="A simple, assessment-based planning guide before a clinic reviews your case."
          actions={
            <Button asChild variant="outline">
              <Link to="/assessment">Start a new assessment</Link>
            </Button>
          }
        />
        <PlanDisclaimer preliminary>{carePlan.disclaimer}</PlanDisclaimer>
        <div className="my-6">
          <PlanSummaryGrid
            items={[
              {
                label: "Estimated visits",
                value: carePlan.visit_information ?? "Not available",
                icon: <CalendarDays className="size-4" />,
              },
              {
                label: "Healing period",
                value: carePlan.healing_information ?? "Not available",
                icon: <Clock className="size-4" />,
              },
              {
                label: "Estimated price range",
                value: `${carePlan.price.currency} ${carePlan.price.minimum?.toLocaleString()} – ${carePlan.price.maximum?.toLocaleString()}`,
                icon: <EuroIcon className="size-4" />,
              },
            ]}
          />
        </div>
        <PlanSection
          title="Your assessment summary"
          description="These details come from your answers and are not clinical findings."
          className="mb-8"
        >
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <Row label="Treatment interest" value={carePlan.treatment_overview} />
            <Row label="Preliminary treatment summary" value={roadmap.estimated_treatment} />
            <Row label="Destination" value={carePlan.destination?.country || "Any"} />
            <Row
              label="Preferred cities"
              value={carePlan.destination?.cities.join(", ") || "Any"}
            />
            <Row
              label="Preferred timeline"
              value={carePlan.preferred_timeline || "Not specified"}
            />
          </dl>
          <p className="mt-5 text-sm text-muted-foreground">{carePlan.summary}</p>
        </PlanSection>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">Recommended clinics</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a clinic to continue from this preliminary roadmap.
            </p>
          </div>
          <Button asChild>
            <a href="#recommended-clinics">Choose a clinic</a>
          </Button>
        </div>
        <div id="recommended-clinics" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recommended.map((clinic) => (
            <ClinicCard key={clinic.id} clinic={clinic} onApply={onApply} roadmapId={roadmap.id} />
          ))}
        </div>
      </div>
    </PlanDocumentShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
