import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { DentalPlanStudio, createDentalPlan } from "@/features/dentalplan";
import type { DentalPlanData, TreatmentType } from "@/features/dentalplan";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { treatmentLabel } from "@/lib/dental";
import type { ToothTreatment, TreatmentPlanItem } from "@/types/models";

type Search = {
  patientId?: string;
  treatmentPlanId?: string;
  leadId?: string;
  assessmentId?: string;
};
export const Route = createFileRoute("/dentalplan")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    patientId: typeof search.patientId === "string" ? search.patientId : undefined,
    treatmentPlanId:
      typeof search.treatmentPlanId === "string" ? search.treatmentPlanId : undefined,
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
    assessmentId: typeof search.assessmentId === "string" ? search.assessmentId : undefined,
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
  const leads = useMockStore((state) => state.leads);
  const assessments = useMockStore((state) => state.assessments);
  const roadmaps = useMockStore((state) => state.roadmaps);
  const applications = useMockStore((state) => state.applications);
  const files = useMockStore((state) => state.files);
  const users = useMockStore((state) => state.users);
  const addPlan = useMockStore((state) => state.addTreatmentPlan);
  const updatePlan = useMockStore((state) => state.updateTreatmentPlan);
  const addQuote = useMockStore((state) => state.addQuote);
  const updateQuote = useMockStore((state) => state.updateQuote);
  const addPatient = useMockStore((state) => state.addPatient);
  const updatePatient = useMockStore((state) => state.updatePatient);
  const existingPlan = plans.find(
    (item) => item.id === search.treatmentPlanId && item.clinic_id === user?.clinic_id,
  );
  const contextQuote = quotes.find(
    (quote) => quote.treatment_plan_id === existingPlan?.id && quote.clinic_id === user?.clinic_id,
  );
  const lead = leads.find(
    (item) => item.id === search.leadId && item.clinic_id === user?.clinic_id,
  );
  const application = applications.find(
    (item) => item.id === lead?.clinic_application_id && item.clinic_id === user?.clinic_id,
  );
  const patient = patients.find(
    (item) =>
      item.clinic_id === user?.clinic_id &&
      (item.id === search.patientId ||
        item.id === lead?.clinic_patient_id ||
        item.id === application?.clinic_patient_id ||
        item.id === existingPlan?.clinic_patient_id),
  );
  const assessment = assessments.find(
    (item) =>
      item.id ===
      (search.assessmentId ??
        lead?.assessment_id ??
        patient?.assessment_id ??
        application?.assessment_id),
  );
  const roadmap = roadmaps.find(
    (item) => item.id === (lead?.roadmap_id ?? patient?.roadmap_id ?? application?.roadmap_id),
  );
  const crmMode = !!user && !!user.clinic_id && !!(patient || existingPlan || lead || assessment);
  const caseFiles = useMemo(
    () =>
      [
        ...files
          .filter((file) => file.patient_user_id === (patient?.user_id ?? patient?.id))
          .map((file) => ({ kind: file.kind, name: file.name })),
        ...Object.entries(assessment?.uploads ?? {})
          .filter(([, available]) => available)
          .map(([kind]) => ({ kind, name: kind.replace(/_/g, " ") })),
      ].filter(
        (file, index, array) =>
          array.findIndex((candidate) => candidate.kind === file.kind) === index,
      ),
    [files, patient?.user_id, patient?.id, assessment?.uploads],
  );
  const importedAssessment = useMemo(
    () => ({
      medicalConditions: assessment?.medical.conditions ?? [],
      medications: assessment?.medical.medications,
      allergies: assessment?.medical.allergies,
      destinationCountry: assessment?.travel.destination_country,
      preferredCities: assessment?.travel.preferred_cities ?? [],
      preferredTimeline: assessment?.travel.treatment_timeline,
      treatmentInterest: assessment?.dental.treatment_interest,
      smoking: assessment?.medical.smoking,
      pregnancy: assessment?.medical.pregnancy,
      panoramicAvailable: assessment?.uploads.uploaded_panoramic,
      dentalPhotosAvailable: assessment?.uploads.uploaded_dental_photos,
    }),
    [assessment],
  );
  const initial = useMemo(() => {
    if (!crmMode) return undefined;
    const linkedPatient =
      patient ??
      patients.find(
        (item) => item.id === existingPlan?.clinic_patient_id && item.clinic_id === user?.clinic_id,
      );
    const embedded = existingPlan?.dental_plan_data as DentalPlanData | undefined;
    const importedCommercial = contextQuote
      ? {
          currency: contextQuote.currency,
          items: contextQuote.items.map((item, index) => ({
            treatmentId: embedded?.proposedTreatments[index]?.id ?? item.id,
            label: item.label,
            qty: item.qty,
            unitPrice: item.unit_price,
          })),
          hotelTotal: contextQuote.hotel_total,
          transferTotal: contextQuote.transfer_total,
          otherServiceTotal: 0,
          discountType: contextQuote.discount > 0 ? ("fixed" as const) : ("none" as const),
          discountValue: contextQuote.discount,
          paymentSchedule: contextQuote.payment_schedule.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
          })),
          validUntil: contextQuote.valid_until,
          commercialNotes: contextQuote.notes,
        }
      : undefined;
    if (embedded?.currentConditions)
      return createDentalPlan({
        ...embedded,
        patient: {
          ...embedded.patient,
          patientId: linkedPatient?.id,
          firstName:
            linkedPatient?.first_name ??
            assessment?.personal.first_name ??
            embedded.patient.firstName,
          lastName:
            linkedPatient?.last_name ?? assessment?.personal.last_name ?? embedded.patient.lastName,
          fullName: linkedPatient
            ? `${linkedPatient.first_name} ${linkedPatient.last_name}`
            : embedded.patient.fullName,
          country: linkedPatient?.country ?? embedded.patient.country,
          city: linkedPatient?.city ?? assessment?.personal.city ?? embedded.patient.city,
          email: linkedPatient?.email ?? embedded.patient.email,
          phone: linkedPatient?.phone ?? embedded.patient.phone,
          whatsapp:
            linkedPatient?.whatsapp ?? assessment?.personal.whatsapp ?? embedded.patient.whatsapp,
          preferredLanguage:
            linkedPatient?.language ??
            assessment?.personal.preferred_language ??
            embedded.patient.preferredLanguage,
          age: assessment?.personal.age ?? embedded.patient.age,
          source: lead?.source ?? linkedPatient?.source ?? embedded.patient.source,
          assessmentId: assessment?.id ?? embedded.patient.assessmentId,
          roadmapId: roadmap?.id ?? embedded.patient.roadmapId,
          applicationId: application?.id ?? embedded.patient.applicationId,
          leadId: lead?.id ?? embedded.patient.leadId,
          uploadedFiles: caseFiles,
          treatmentInterest:
            linkedPatient?.treatment_interest ?? embedded.patient.treatmentInterest,
          dentistId: existingPlan?.dentist_id,
          coordinatorId: existingPlan?.coordinator_id,
          planTitle: existingPlan?.title ?? embedded.patient.planTitle,
        },
        importedAssessment,
        commercial: embedded.commercial ?? importedCommercial,
      });
    return createDentalPlan({
      name: existingPlan?.title ?? "Dental treatment plan",
      patientName: linkedPatient
        ? `${linkedPatient.first_name} ${linkedPatient.last_name}`
        : `${assessment?.personal.first_name ?? ""} ${assessment?.personal.last_name ?? ""}`.trim(),
      patient: {
        patientId: linkedPatient?.id,
        firstName: linkedPatient?.first_name ?? assessment?.personal.first_name ?? "",
        lastName: linkedPatient?.last_name ?? assessment?.personal.last_name ?? "",
        fullName: linkedPatient
          ? `${linkedPatient.first_name} ${linkedPatient.last_name}`
          : `${assessment?.personal.first_name ?? ""} ${assessment?.personal.last_name ?? ""}`.trim(),
        dateOfBirth: linkedPatient?.date_of_birth,
        age: assessment?.personal.age,
        country: linkedPatient?.country ?? assessment?.personal.country,
        city: linkedPatient?.city ?? assessment?.personal.city,
        email: linkedPatient?.email ?? assessment?.personal.email,
        phone: linkedPatient?.phone ?? assessment?.personal.phone,
        whatsapp: linkedPatient?.whatsapp ?? assessment?.personal.whatsapp,
        preferredLanguage: linkedPatient?.language ?? assessment?.personal.preferred_language,
        treatmentInterest:
          linkedPatient?.treatment_interest ?? assessment?.dental.treatment_interest,
        source: lead?.source ?? linkedPatient?.source ?? "manual",
        assessmentId: assessment?.id,
        roadmapId: roadmap?.id,
        applicationId: application?.id,
        leadId: lead?.id,
        uploadedFiles: caseFiles,
        dentistId: existingPlan?.dentist_id,
        coordinatorId: existingPlan?.coordinator_id,
        planTitle: existingPlan?.title ?? "Dental treatment plan",
        preparationDate: new Date().toISOString().slice(0, 10),
        currency: "EUR",
      },
      importedAssessment,
      commercial: importedCommercial,
      travel: {
        visits: existingPlan?.visits ?? 1,
        healingWeeks: existingPlan?.healing_weeks ?? 0,
        hotelRequired: (contextQuote?.hotel_total ?? 0) > 0,
        hotelIncluded: (contextQuote?.hotel_total ?? 0) > 0,
        hotelNights: 0,
        airportTransfer: (contextQuote?.transfer_total ?? 0) > 0,
        transferIncluded: (contextQuote?.transfer_total ?? 0) > 0,
        localTransfer: false,
        includedServices: contextQuote?.included_services ?? [],
        guarantees: [],
        patientFacingNotes: existingPlan?.patient_facing_notes,
        internalNotes: existingPlan?.internal_clinical_notes,
      },
    });
  }, [
    crmMode,
    patient,
    existingPlan,
    patients,
    user?.clinic_id,
    assessment,
    roadmap,
    application,
    lead,
    caseFiles,
    importedAssessment,
    contextQuote,
  ]);
  if (
    !hydrated &&
    (search.patientId || search.treatmentPlanId || search.leadId || search.assessmentId)
  )
    return <div className="p-8">Loading CRM context…</div>;
  const finalize = async (value: DentalPlanData) => {
    if (!crmMode || !user?.clinic_id)
      throw new Error("A valid clinic patient or treatment-plan context is required.");
    let linkedPatient =
      patient ??
      patients.find(
        (item) => item.id === existingPlan?.clinic_patient_id && item.clinic_id === user.clinic_id,
      );
    if (!linkedPatient) {
      const duplicate = patients.find(
        (item) =>
          item.clinic_id === user.clinic_id &&
          item.email.toLowerCase() === value.patient.email?.toLowerCase(),
      );
      linkedPatient =
        duplicate ??
        addPatient(
          {
            clinic_id: user.clinic_id,
            first_name: value.patient.firstName,
            last_name: value.patient.lastName,
            email: value.patient.email ?? "",
            phone: value.patient.phone,
            country: value.patient.country ?? "",
            city: value.patient.city,
            date_of_birth: value.patient.dateOfBirth,
            language: value.patient.preferredLanguage,
            whatsapp: value.patient.whatsapp,
            source: "manual",
            assessment_id: value.patient.assessmentId,
            roadmap_id: value.patient.roadmapId,
            treatment_interest: value.patient.treatmentInterest,
          },
          user.id,
        );
    } else
      updatePatient(linkedPatient.id, {
        first_name: value.patient.firstName,
        last_name: value.patient.lastName,
        email: value.patient.email ?? linkedPatient.email,
        phone: value.patient.phone,
        country: value.patient.country ?? linkedPatient.country,
        city: value.patient.city,
        date_of_birth: value.patient.dateOfBirth,
        language: value.patient.preferredLanguage,
        whatsapp: value.patient.whatsapp,
      });
    const items: TreatmentPlanItem[] = value.proposedTreatments.flatMap((treatment) =>
      treatment.toothNumbers.map((tooth) => ({
        id: `dpi_${treatment.id}_${tooth}`,
        tooth,
        treatment: treatmentMap[treatment.treatmentType] ?? "crown",
        notes: treatment.notes,
        unit_price:
          value.commercial.items.find((price) => price.treatmentId === treatment.id)?.unitPrice ??
          existingPlan?.items.find(
            (item) =>
              item.tooth === tooth &&
              item.treatment === (treatmentMap[treatment.treatmentType] ?? "crown"),
          )?.unit_price ??
          0,
      })),
    );
    const patch = {
      title: value.patient.planTitle,
      summary: value.travel.patientFacingNotes ?? "Dental treatment plan",
      items,
      visits: Number(value.planningPreferences.visits.value) || value.travel.visits,
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
    if (value.commercial.otherServiceTotal > 0)
      quoteItems.push({
        id: "qi_other_services",
        label: "Other services",
        qty: 1,
        unit_price: value.commercial.otherServiceTotal,
      });
    const beforeDiscount =
      quoteItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0) +
      value.commercial.hotelTotal +
      value.commercial.transferTotal +
      0;
    const discount =
      value.commercial.discountType === "percentage"
        ? Math.min(
            beforeDiscount,
            (beforeDiscount * Math.min(100, Math.max(0, value.commercial.discountValue))) / 100,
          )
        : value.commercial.discountType === "fixed"
          ? Math.min(beforeDiscount, Math.max(0, value.commercial.discountValue))
          : 0;
    const commercialPatch = {
      items: quoteItems,
      currency: value.commercial.currency,
      hotel_total: value.travel.hotelIncluded ? value.commercial.hotelTotal : 0,
      transfer_total: value.travel.transferIncluded ? value.commercial.transferTotal : 0,
      discount,
      payment_schedule: value.commercial.paymentSchedule.map(({ label, amount, due }) => ({
        label,
        amount,
        due,
      })),
      valid_until: value.commercial.validUntil,
      included_services: value.travel.includedServices,
      notes: value.commercial.commercialNotes,
    };
    let quote;
    if (existingQuote) {
      updateQuote(
        existingQuote.id,
        {
          ...commercialPatch,
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
        ...commercialPatch,
        excluded_services: [],
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
      clinicUsers={users
        .filter((member) => member.clinic_id === user?.clinic_id)
        .map(({ id, name, role }) => ({ id, name, role }))}
      onFinalize={finalize}
    />
  );
}
