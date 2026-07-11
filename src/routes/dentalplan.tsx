import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { DentalPlanStudio, createDentalPlan } from "@/features/dentalplan";
import type { DentalPlanData, TreatmentType } from "@/features/dentalplan";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { treatmentLabel } from "@/lib/dental";
import type { ToothTreatment, TreatmentPlanItem } from "@/types/models";

type Search = { patientId?: string; treatmentPlanId?: string };
export const Route = createFileRoute("/dentalplan")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    patientId: typeof search.patientId === "string" ? search.patientId : undefined,
    treatmentPlanId:
      typeof search.treatmentPlanId === "string" ? search.treatmentPlanId : undefined,
  }),
  head: () => ({ meta: [{ title: "DentalPlan Studio — SmileAbroad" }] }),
  component: DentalPlanRoute,
});
const treatmentMap: Partial<Record<TreatmentType, ToothTreatment>> = {
  "dental-implant": "implant",
  "implant-crown": "crown",
  "zirconium-crown": "crown",
  "emax-crown": "crown",
  "porcelain-crown": "crown",
  "temporary-crown": "crown",
  extraction: "extraction",
  bridge: "bridge",
  pontic: "pontic",
  veneer: "veneer",
  "composite-bonding": "composite",
  "composite-filling": "filling",
  "root-canal-treatment": "root_canal",
  "bone-graft": "bone_graft",
  "sinus-lift": "sinus_lift",
  whitening: "whitening",
  denture: "denture",
};
function DentalPlanRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const hydrated = useMockStoreHydrated();
  const patients = useMockStore((state) => state.patients);
  const plans = useMockStore((state) => state.treatmentPlans);
  const quotes = useMockStore((state) => state.quotes);
  const addPlan = useMockStore((state) => state.addTreatmentPlan);
  const updatePlan = useMockStore((state) => state.updateTreatmentPlan);
  const addQuote = useMockStore((state) => state.addQuote);
  const updateQuote = useMockStore((state) => state.updateQuote);
  const patient = patients.find(
    (item) => item.id === search.patientId && item.clinic_id === user?.clinic_id,
  );
  const existingPlan = plans.find(
    (item) => item.id === search.treatmentPlanId && item.clinic_id === user?.clinic_id,
  );
  const crmMode = !!user && !!user.clinic_id && !!(patient || existingPlan);
  const initial = useMemo(() => {
    if (!crmMode) return undefined;
    const linkedPatient =
      patient ??
      patients.find(
        (item) => item.id === existingPlan?.clinic_patient_id && item.clinic_id === user?.clinic_id,
      );
    const embedded = existingPlan?.dental_plan_data as DentalPlanData | undefined;
    if (embedded?.currentConditions)
      return createDentalPlan({
        ...embedded,
        patient: {
          ...embedded.patient,
          patientId: linkedPatient?.id,
          fullName: linkedPatient
            ? `${linkedPatient.first_name} ${linkedPatient.last_name}`
            : embedded.patient.fullName,
          country: linkedPatient?.country ?? embedded.patient.country,
          email: linkedPatient?.email ?? embedded.patient.email,
          phone: linkedPatient?.phone ?? embedded.patient.phone,
          treatmentInterest:
            linkedPatient?.treatment_interest ?? embedded.patient.treatmentInterest,
          dentistId: existingPlan?.dentist_id,
          coordinatorId: existingPlan?.coordinator_id,
          planTitle: existingPlan?.title ?? embedded.patient.planTitle,
        },
      });
    return createDentalPlan({
      name: existingPlan?.title ?? "Dental treatment plan",
      patientName: linkedPatient ? `${linkedPatient.first_name} ${linkedPatient.last_name}` : "",
      patient: {
        patientId: linkedPatient?.id,
        fullName: linkedPatient ? `${linkedPatient.first_name} ${linkedPatient.last_name}` : "",
        dateOfBirth: linkedPatient?.date_of_birth,
        country: linkedPatient?.country,
        email: linkedPatient?.email,
        phone: linkedPatient?.phone,
        treatmentInterest: linkedPatient?.treatment_interest,
        dentistId: existingPlan?.dentist_id,
        coordinatorId: existingPlan?.coordinator_id,
        planTitle: existingPlan?.title ?? "Dental treatment plan",
        preparationDate: new Date().toISOString().slice(0, 10),
        currency: "EUR",
      },
      travel: {
        visits: existingPlan?.visits ?? 1,
        healingWeeks: existingPlan?.healing_weeks ?? 0,
        hotelRequired: false,
        hotelNights: 0,
        airportTransfer: false,
        localTransfer: false,
        includedServices: [],
        guarantees: [],
        patientFacingNotes: existingPlan?.patient_facing_notes,
        internalNotes: existingPlan?.internal_clinical_notes,
      },
    });
  }, [crmMode, patient, existingPlan, patients, user?.clinic_id]);
  if (!hydrated && search.patientId) return <div className="p-8">Loading CRM context…</div>;
  const finalize = async (value: DentalPlanData) => {
    if (!crmMode || !user?.clinic_id)
      throw new Error("A valid clinic patient or treatment-plan context is required.");
    const linkedPatient =
      patient ??
      patients.find(
        (item) => item.id === existingPlan?.clinic_patient_id && item.clinic_id === user.clinic_id,
      );
    if (!linkedPatient) throw new Error("Clinic patient not found or belongs to another clinic.");
    const items: TreatmentPlanItem[] = value.proposedTreatments.flatMap((treatment) =>
      treatment.toothNumbers.map((tooth) => ({
        id: `dpi_${treatment.id}_${tooth}`,
        tooth,
        treatment: treatmentMap[treatment.treatmentType] ?? "crown",
        notes: treatment.notes,
        unit_price:
          existingPlan?.items.find(
            (item) =>
              item.tooth === tooth &&
              item.treatment === (treatmentMap[treatment.treatmentType] ?? "crown"),
          )?.unit_price ?? 0,
      })),
    );
    const patch = {
      title: value.patient.planTitle,
      summary: value.travel.patientFacingNotes ?? "Dental treatment plan",
      items,
      visits: value.travel.visits,
      healing_weeks: value.travel.healingWeeks,
      dentist_id: value.patient.dentistId,
      coordinator_id: value.patient.coordinatorId,
      patient_facing_notes: value.travel.patientFacingNotes,
      internal_clinical_notes: value.travel.internalNotes,
      treatment_timeline: value.travel.timelineNotes,
      dental_plan_data: value,
      treatment_groups: value.treatmentGroups.map((group) => ({
        id: group.id,
        type: group.type,
        arch: group.arch,
        affected_teeth: group.affectedTeeth,
        generated_item_ids: group.generatedTreatmentIds,
      })),
    };
    const plan = existingPlan
      ? (updatePlan(existingPlan.id, patch, user.id), { ...existingPlan, ...patch })
      : addPlan(
          {
            clinic_id: user.clinic_id,
            patient_user_id: linkedPatient.user_id ?? linkedPatient.id,
            clinic_patient_id: linkedPatient.id,
            status: "draft",
            clinical_findings: [],
            treatment_objectives: [],
            alternatives: [],
            risks: [],
            exclusions: [],
            materials: [],
            implant_systems: [],
            treatment_stages: [],
            visit_plan: [],
            ...patch,
          },
          user.id,
        );
    const existingQuote = quotes.find(
      (quote) => quote.treatment_plan_id === plan.id && quote.clinic_id === user.clinic_id,
    );
    const quoteItems = items.map((item) => ({
      id: `qi_${item.id}`,
      label: `Tooth ${item.tooth} · ${treatmentLabel(item.treatment)}`,
      qty: 1,
      unit_price: item.unit_price,
    }));
    let quote;
    if (existingQuote) {
      updateQuote(
        existingQuote.id,
        {
          items: quoteItems,
          currency: value.patient.currency,
          included_services: value.travel.includedServices,
          notes: value.travel.patientFacingNotes,
        },
        user.id,
      );
      quote = existingQuote;
    } else
      quote = addQuote({
        clinic_id: user.clinic_id,
        patient_user_id: linkedPatient.user_id ?? linkedPatient.id,
        clinic_patient_id: linkedPatient.id,
        treatment_plan_id: plan.id,
        currency: value.patient.currency,
        items: quoteItems,
        hotel_total: 0,
        transfer_total: 0,
        discount: 0,
        payment_schedule: [],
        included_services: value.travel.includedServices,
        excluded_services: [],
        notes: value.travel.patientFacingNotes,
        status: "draft",
      });
    navigate({ to: "/pro/quotes/$id", params: { id: quote.id } });
    return { treatmentPlanId: plan.id, quoteId: quote.id };
  };
  return (
    <DentalPlanStudio
      context={{
        mode: crmMode ? "crm" : "standalone",
        clinicId: user?.clinic_id,
        patientId: patient?.id,
        treatmentPlanId: existingPlan?.id,
      }}
      initialValue={initial}
      onFinalize={finalize}
    />
  );
}
