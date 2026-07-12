import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Clock, EuroIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import {
  buildRoadmapTreatmentJourney,
  DEFAULT_ROADMAP_TREATMENT_CONTENT,
  deriveAssessmentTreatmentEstimates,
} from "@/lib/roadmap-engine";
import type { Assessment, RoadmapTreatmentEstimate } from "@/types/models";

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
  const treatmentContent = useMockStore((state) => state.roadmapTreatmentContent);
  const apply = useMockStore((state) => state.applyToClinic);
  if (!hydrated) return null;
  if (!roadmap || !assessment) throw notFound();
  const recommended = clinics.filter((clinic) =>
    roadmap.recommended_clinic_ids.includes(clinic.id),
  );
  const carePlan = mapPreliminaryRoadmap({ roadmap, assessment });
  const estimates = roadmap.treatment_estimates?.length
    ? roadmap.treatment_estimates
    : deriveAssessmentTreatmentEstimates(assessment);
  const journey = roadmap.treatment_journey?.length
    ? roadmap.treatment_journey
    : buildRoadmapTreatmentJourney(estimates);
  const platformContent = treatmentContent.filter((item) => !item.clinic_id && item.active);
  const content = platformContent.length ? platformContent : DEFAULT_ROADMAP_TREATMENT_CONTENT;
  const completePrice =
    estimates.length > 0 && !roadmap.missing_price_keys?.length && roadmap.price_max > 0;
  const legacyPrice = !roadmap.treatment_estimates?.length && roadmap.price_max > 0;
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
          title={
            assessment.personal.first_name
              ? `${assessment.personal.first_name}, your preliminary dental roadmap`
              : carePlan.title
          }
          badge="Preliminary assessment"
          description="Based on the information and files you provided, this roadmap explains treatments that may be relevant, the likely stages and an estimated price range where enough information is available."
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
                value: `${roadmap.estimated_visits}`,
                icon: <CalendarDays className="size-4" />,
              },
              {
                label: "Likely treatment period",
                value:
                  roadmap.timeline_summary ?? `${roadmap.healing_weeks} estimated healing weeks`,
                icon: <Clock className="size-4" />,
              },
              {
                label: "Estimated price range",
                value:
                  completePrice || legacyPrice
                    ? `${roadmap.currency} ${roadmap.price_min.toLocaleString()}–${roadmap.price_max.toLocaleString()}`
                    : "Available after clinical review",
                icon: <EuroIcon className="size-4" />,
              },
            ]}
          />
        </div>
        <PlanSection
          title="Your assessment summary"
          description="These details come from your answers and are not clinical findings."
          className="mb-6"
        >
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <Row label="Treatment interest" value={carePlan.treatment_overview} />
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
        {estimates.length > 0 && (
          <PlanSection
            title="Estimated treatment needs"
            description="Aggregated possibilities based on the information currently available. Quantities appear only when supported by current input."
            className="mb-6"
          >
            <div className="divide-y">
              {estimates.map((estimate) => (
                <div
                  key={estimate.treatment_key}
                  className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-start"
                >
                  <div className="flex-1">
                    <p className="font-medium">{estimate.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {estimate.patient_explanation ??
                        "Final suitability and quantity require clinical examination."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize">
                      {estimate.likelihood}
                    </Badge>
                    <Badge variant="secondary">{quantityLabel(estimate)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </PlanSection>
        )}
        {estimates.length > 0 && (
          <PlanSection
            title="Treatment-specific information"
            description="Expand a treatment to understand its purpose, usual process and important limitations."
            className="mb-6"
          >
            <Accordion type="multiple">
              {estimates.map((estimate) => {
                const detail = content.find(
                  (item) => item.treatment_key === estimate.treatment_key,
                );
                if (!detail) return null;
                return (
                  <AccordionItem key={estimate.treatment_key} value={estimate.treatment_key}>
                    <AccordionTrigger>{detail.title}</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>{detail.short_description}</p>
                        <div>
                          <p className="font-medium">Why it may be needed</p>
                          <p className="text-muted-foreground">{detail.why_it_may_be_needed}</p>
                        </div>
                        <div>
                          <p className="font-medium">How the process usually works</p>
                          <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted-foreground">
                            {detail.procedure_steps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        </div>
                        {detail.usual_visits && (
                          <Row label="Usual visits" value={detail.usual_visits} />
                        )}
                        {detail.typical_timeline && (
                          <Row label="Typical timeline" value={detail.typical_timeline} />
                        )}
                        {detail.considerations.map((item) => (
                          <p key={item} className="text-xs text-muted-foreground">
                            {item}
                          </p>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </PlanSection>
        )}
        <PlanSection
          title="Step-by-step Treatment Journey"
          description="The sequence adapts to the estimated treatment mix and remains subject to the clinic's examination."
          className="mb-6"
        >
          <div>
            {journey.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[2rem_1fr] gap-3">
                <div className="flex flex-col items-center">
                  <div className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </div>
                  {index < journey.length - 1 && (
                    <Separator orientation="vertical" className="min-h-12" />
                  )}
                </div>
                <div className="pb-5">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </PlanSection>
        <PlanSection title="Estimated visits and timeline" className="mb-6">
          <dl className="grid gap-4 sm:grid-cols-3">
            <Row label="Estimated visits" value={`${roadmap.estimated_visits}`} />
            <Row
              label="Likely treatment period"
              value={roadmap.timeline_summary ?? `${roadmap.healing_weeks} estimated healing weeks`}
            />
            <Row
              label="Expected stay"
              value={roadmap.stay_summary ?? "Confirmed by the selected clinic"}
            />
          </dl>
        </PlanSection>
        <PlanSection
          title={`Estimated price range${assessment.travel.destination_country ? ` in ${assessment.travel.destination_country}` : ""}`}
          className="mb-6"
        >
          {completePrice || legacyPrice ? (
            <>
              <p className="text-3xl font-semibold">
                {roadmap.currency} {roadmap.price_min.toLocaleString()}–
                {roadmap.price_max.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                This range uses only quantities that can currently be estimated. Final pricing may
                change after clinical examination and review of your X-ray or dental photos.
              </p>
            </>
          ) : (
            <Alert>
              <EuroIcon className="size-4" />
              <AlertTitle>Complete pricing requires clinical review</AlertTitle>
              <AlertDescription>
                The assessment does not support reliable treatment quantities, so we do not show a
                false total.
              </AlertDescription>
            </Alert>
          )}
        </PlanSection>
        <PlanSection title="What may change the plan" className="mb-8">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {changeFactors(assessment).map((factor) => (
              <p key={factor} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {factor}
              </p>
            ))}
          </div>
        </PlanSection>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              Next step: compare recommended clinics
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review clinic profiles, choose a clinic and submit this assessment for a confirmed
              clinical plan and Quote.
            </p>
          </div>
          <Button asChild>
            <a href="#recommended-clinics">Compare clinics</a>
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

function quantityLabel(estimate: RoadmapTreatmentEstimate) {
  if (estimate.estimated_quantity !== undefined) return `Estimated: ${estimate.estimated_quantity}`;
  if (estimate.minimum_quantity !== undefined && estimate.maximum_quantity !== undefined)
    return `Estimated: ${estimate.minimum_quantity}–${estimate.maximum_quantity}`;
  return "Quantity to be confirmed";
}
function changeFactors(assessment: Assessment) {
  const factors = [
    "Bone and gum condition",
    "Hidden infection or root-canal findings",
    "Final cosmetic preference",
    "Selected material or implant system",
  ];
  if (assessment.medical.conditions.length || assessment.medical.medication_groups?.length)
    factors.push("Medical history and current medication");
  if (assessment.medical.smoking) factors.push("Smoking and healing response");
  if (!assessment.uploads.uploaded_panoramic && !assessment.uploads.uploaded_dental_photos)
    factors.push("Findings from dental photographs or an X-ray not yet provided");
  return factors;
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
