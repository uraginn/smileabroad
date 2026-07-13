import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { DentalPlanStudio, createDentalPlan } from "@/features/dentalplan";
import type { DentalPlanData, TreatmentType } from "@/features/dentalplan";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { treatmentLabel } from "@/lib/dental";
import { derivePlanDefaults } from "@/features/dentalplan/utils/derivePlanDefaults";
import { calculateCommercial } from "@/features/dentalplan/utils/commercial";
import { UnifiedPlanShareSection } from "@/features/dentalplan/components/UnifiedPlanShareSection";
import type { ToothTreatment, TreatmentPlanItem } from "@/types/models";

type Search = {
  patientId?: string;
  treatmentPlanId?: string;
  leadId?: string;
  assessmentId?: string;
  mode?: "template";
  templateId?: string;
};
export const Route = createFileRoute("/dentalplan")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    patientId: typeof search.patientId === "string" ? search.patientId : undefined,
    treatmentPlanId:
      typeof search.treatmentPlanId === "string" ? search.treatmentPlanId : undefined,
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
    assessmentId: typeof search.assessmentId === "string" ? search.assessmentId : undefined,
    mode: search.mode === "template" ? "template" : undefined,
    templateId: typeof search.templateId === "string" ? search.templateId : undefined,
  }),
  head: () => ({ meta: [{ title: "DentalPlan Studio â€” SmileAbroad" }] }),
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
  const leads = useMockStore((state) => state.leads);
  const assessments = useMockStore((state) => state.assessments);
  const roadmaps = useMockStore((state) => state.roadmaps);
  const applications = useMockStore((state) => state.applications);
  const files = useMockStore((state) => state.files);
  const users = useMockStore((state) => state.users);
  const treatmentDefinitions = useMockStore((state) => state.clinicTreatmentDefinitions);
  const hotels = useMockStore((state) => state.clinicHotels);
  const clinic = useMockStore((state) => state.clinics.find((item) => item.id === user?.clinic_id));
  const branding = useMockStore((state) =>
    state.branding.find((item) => item.clinic_id === user?.clinic_id),
  );
  const templates = useMockStore((state) => state.dentalPlanTemplates);
  const addPlan = useMockStore((state) => state.addTreatmentPlan);
  const updatePlan = useMockStore((state) => state.updateTreatmentPlan);
  const addPatient = useMockStore((state) => state.addPatient);
  const updatePatient = useMockStore((state) => state.updatePatient);
  const saveTemplate = useMockStore((state) => state.saveDentalPlanTemplate);
  const templateMode = search.mode === "template";
  const activeTemplate = templates.find(
    (item) => item.id === search.templateId && item.clinic_id === user?.clinic_id,
  );
  const existingPlan = plans.find(
    (item) => item.id === search.treatmentPlanId && item.clinic_id === user?.clinic_id,
  );
  const lead = leads.find(
    (item) => item.id === search.leadId && item.clinic_id === user?.clinic_id,
  );
  const application = applications.find(
    (item) =>
      item.clinic_id === user?.clinic_id &&
      (item.id === lead?.clinic_application_id ||
        (!!search.assessmentId && item.assessment_id === search.assessmentId)),
  );
  const patient = patients.find(
    (item) =>
      item.clinic_id === user?.clinic_id &&
      (item.id === search.patientId ||
        item.id === lead?.clinic_patient_id ||
        item.id === application?.clinic_patient_id ||
        item.id === existingPlan?.clinic_patient_id),
  );
  const authorizedAssessmentId =
    lead?.assessment_id ?? patient?.assessment_id ?? application?.assessment_id;
  const assessment = assessments.find((item) => item.id === authorizedAssessmentId);
  const roadmap = roadmaps.find(
    (item) => item.id === (lead?.roadmap_id ?? patient?.roadmap_id ?? application?.roadmap_id),
  );
  const crmMode = !!user && !!user.clinic_id && !!(patient || existingPlan || lead || assessment);
  const defaultDentist = users.find(
    (member) =>
      member.clinic_id === user?.clinic_id &&
      member.role === "dentist" &&
      member.active !== false &&
      member.default_planner_dentist,
  );
  const requestedCrmContext = !!(
    search.patientId ||
    search.treatmentPlanId ||
    search.leadId ||
    search.assessmentId
  );
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
    if (templateMode && activeTemplate)
      return createDentalPlan({
        ...(activeTemplate.plan_data as Partial<DentalPlanData>),
        draftStep: 1,
      });
    if (!crmMode) return undefined;
    const linkedPatient =
      patient ??
      patients.find(
        (item) => item.id === existingPlan?.clinic_patient_id && item.clinic_id === user?.clinic_id,
      );
    const embedded = existingPlan?.dental_plan_data as DentalPlanData | undefined;
    const importedCommercial = existingPlan?.currency
      ? {
          currency: existingPlan.currency,
          items: (embedded?.proposedTreatments ?? []).map((treatment) => {
            const matchingItem = existingPlan.price_items?.find(
              (item) =>
                item.id === `price_${treatment.id}` ||
                item.treatment_key === treatment.treatmentType,
            );
            const fallback = embedded?.commercial?.items.find(
              (item) => item.treatmentId === treatment.id,
            );
            return {
              treatmentId: treatment.id,
              label: fallback?.label ?? matchingItem?.label ?? treatment.treatmentType,
              qty: Math.max(1, treatment.toothNumbers.length),
              unitPrice: matchingItem?.unit_price ?? fallback?.unitPrice ?? 0,
            };
          }),
          hotelTotal: existingPlan.hotel_total ?? 0,
          transferTotal: existingPlan.transfer_total ?? 0,
          otherServiceTotal: existingPlan.optional_service_total ?? 0,
          discountType: existingPlan.discount_type ?? ("none" as const),
          discountValue: existingPlan.discount_value ?? 0,
          paymentSchedule: (existingPlan.payment_schedule ?? []).map((item) => ({
            ...item,
            id: item.id ?? crypto.randomUUID(),
          })),
          validUntil: existingPlan.valid_until,
          commercialNotes: existingPlan.patient_message,
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
          dentistId: existingPlan?.dentist_id ?? embedded.patient.dentistId ?? defaultDentist?.id,
          coordinatorId: existingPlan?.coordinator_id,
          planTitle: existingPlan?.title ?? embedded.patient.planTitle,
        },
        importedAssessment,
        commercial: importedCommercial
          ? { ...embedded.commercial, ...importedCommercial }
          : embedded.commercial,
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
        dentistId: existingPlan?.dentist_id ?? defaultDentist?.id,
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
        hotelRequired: (existingPlan?.hotel_total ?? 0) > 0,
        hotelIncluded: (existingPlan?.hotel_total ?? 0) > 0,
        hotelNights: existingPlan?.hotel_nights ?? 0,
        airportTransfer: existingPlan?.transfers_included ?? false,
        transferIncluded: existingPlan?.transfers_included ?? false,
        localTransfer: false,
        includedServices: existingPlan?.included_services ?? [],
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
    defaultDentist?.id,
    templateMode,
    activeTemplate,
  ]);
  if (hydrated && templateMode && !activeTemplate)
    return <div className="p-8">Template unavailable for the active clinic.</div>;
  if (!hydrated && requestedCrmContext) return <div className="p-8">Loading CRM contextâ€¦</div>;
  if (hydrated && requestedCrmContext && !crmMode)
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold">Planner context unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This patient, lead, assessment, or treatment plan is unavailable for the active clinic.
        </p>
      </div>
    );
  const saveDraft = (value: DentalPlanData) => {
    if (!existingPlan || !user?.clinic_id) return;
    const draftItems: TreatmentPlanItem[] = value.proposedTreatments.flatMap((treatment) =>
      treatment.toothNumbers.map((tooth) => ({
        id: `dpi_${treatment.id}_${tooth}`,
        tooth,
        treatment: treatmentMap[treatment.treatmentType] ?? "crown",
        notes: treatment.notes,
        unit_price:
          value.commercial.items.find((item) => item.treatmentId === treatment.id)?.unitPrice ?? 0,
      })),
    );
    const totals = calculateCommercial(value.commercial);
    updatePlan(
      existingPlan.id,
      {
        title: value.patient.planTitle,
        items: draftItems,
        dentist_id: value.patient.dentistId,
        coordinator_id: value.patient.coordinatorId,
        patient_facing_notes: value.travel.patientFacingNotes,
        internal_clinical_notes: value.travel.internalNotes,
        dental_plan_data: value,
        currency: value.commercial.currency,
        price_items: value.commercial.items.map((item) => {
          const treatment = value.proposedTreatments.find(
            (candidate) => candidate.id === item.treatmentId,
          );
          return {
            id: `price_${item.treatmentId}`,
            label: item.label,
            quantity: item.qty,
            unit_price: item.unitPrice,
            treatment_key: treatment?.treatmentType,
            treatment_group_id: treatment?.treatmentGroupId,
            manually_overridden: item.priceOverridden,
          };
        }),
        hotel_total: value.commercial.hotelTotal,
        transfer_total: value.commercial.transferTotal,
        optional_service_total: value.commercial.otherServiceTotal,
        discount_type: value.commercial.discountType,
        discount_value: value.commercial.discountValue,
        calculated_discount: totals.discount,
        payment_schedule: value.commercial.paymentSchedule,
        valid_until: value.commercial.validUntil,
        included_services: value.travel.includedServices,
        hotel_nights: value.travel.hotelIncluded ? value.travel.hotelNights : 0,
        transfers_included: value.travel.airportTransfer || value.travel.localTransfer,
        flight_included: value.travel.flightIncluded,
      },
      user.id,
    );
  };
  const finalize = async (value: DentalPlanData) => {
    if (!crmMode || !user?.clinic_id)
      throw new Error("A valid clinic patient or treatment-plan context is required.");
    let linkedPatient =
      patient ??
      patients.find(
        (item) => item.id === existingPlan?.clinic_patient_id && item.clinic_id === user.clinic_id,
      );
    if (!linkedPatient) {
      const normalizedEmail = value.patient.email?.trim().toLowerCase();
      const duplicate = patients.find(
        (item) =>
          !!normalizedEmail &&
          item.clinic_id === user.clinic_id &&
          item.email.trim().toLowerCase() === normalizedEmail,
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
    const defaults = derivePlanDefaults(value);
    const patch = {
      title: value.patient.planTitle,
      summary: value.travel.patientFacingNotes ?? "Dental treatment plan",
      items,
      visits: defaults.recommendedVisits,
      healing_weeks: defaults.recommendedHealingWeeks,
      dentist_id: value.patient.dentistId,
      coordinator_id: value.patient.coordinatorId,
      patient_facing_notes: value.travel.patientFacingNotes,
      internal_clinical_notes: value.travel.internalNotes,
      treatment_timeline: `${defaults.visitDurationSummary}. ${defaults.healingPeriodSummary}.`,
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
            lead_id: value.patient.leadId,
            clinic_application_id: value.patient.applicationId,
            assessment_id: value.patient.assessmentId,
            roadmap_id: value.patient.roadmapId,
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
    const priceItems = items.map((item) => {
      const customTreatment = value.proposedTreatments.find((treatment) =>
        item.id.startsWith(`dpi_${treatment.id}_`),
      );
      return {
        id: `qi_${item.id}`,
        label: `Tooth ${item.tooth} · ${customTreatment?.displayName ?? treatmentLabel(item.treatment)}`,
        qty: 1,
        unit_price: item.unit_price,
      };
    });
    if (value.commercial.otherServiceTotal > 0)
      priceItems.push({
        id: "qi_other_services",
        label: "Other services",
        qty: 1,
        unit_price: value.commercial.otherServiceTotal,
      });
    const beforeDiscount =
      priceItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0) +
      (value.travel.hotelIncluded ? value.commercial.hotelTotal : 0) +
      (value.travel.includedServices.includes("Airport Transfer") ||
      value.travel.includedServices.includes("Hotel Transfer")
        ? value.commercial.transferTotal
        : 0) +
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
    const hotelSummary = value.travel.hotelIncluded
      ? `Hotel: ${value.travel.hotelName || "To be confirmed"} Â· ${value.travel.hotelNights} nights${value.travel.roomType ? ` Â· ${value.travel.roomType}` : ""}${value.travel.boardType ? ` Â· ${value.travel.boardType}` : ""}`
      : undefined;
    const includedServices = [
      ...value.travel.includedServices.filter((service) => !service.startsWith("Hotel: ")),
      ...(hotelSummary ? [hotelSummary] : []),
    ].filter((service, index, services) => services.indexOf(service) === index);
    const commercialPatch = {
      items: priceItems,
      currency: value.commercial.currency,
      hotel_total: value.travel.hotelIncluded ? value.commercial.hotelTotal : 0,
      transfer_total:
        value.travel.includedServices.includes("Airport Transfer") ||
        value.travel.includedServices.includes("Hotel Transfer")
          ? value.commercial.transferTotal
          : 0,
      discount,
      payment_schedule: value.commercial.paymentSchedule.map(({ label, amount, due }) => ({
        label,
        amount,
        due,
      })),
      valid_until: value.commercial.validUntil,
      included_services: includedServices,
    };
    updatePlan(
      plan.id,
      {
        currency: commercialPatch.currency,
        price_items: value.commercial.items.map((item) => {
          const treatment = value.proposedTreatments.find(
            (candidate) => candidate.id === item.treatmentId,
          );
          return {
            id: `price_${item.treatmentId}`,
            label: item.label,
            quantity: item.qty,
            unit_price: item.unitPrice,
            treatment_group_id: treatment?.treatmentGroupId,
            treatment_key: treatment?.treatmentType,
            manually_overridden: item.priceOverridden,
          };
        }),
        hotel_total: commercialPatch.hotel_total,
        transfer_total: commercialPatch.transfer_total,
        optional_service_total: value.commercial.otherServiceTotal,
        discount_type: value.commercial.discountType,
        discount_value: value.commercial.discountValue,
        calculated_discount: discount,
        payment_schedule: commercialPatch.payment_schedule,
        valid_until: commercialPatch.valid_until,
        included_services: commercialPatch.included_services,
        excluded_services: existingPlan?.excluded_services ?? [],
        hotel_nights: value.travel.hotelIncluded ? value.travel.hotelNights : 0,
        transfers_included:
          value.travel.includedServices.includes("Airport Transfer") ||
          value.travel.includedServices.includes("Hotel Transfer"),
        flight_included: value.travel.includedServices.includes("Flight Included"),
        prepared_at: existingPlan?.prepared_at ?? new Date().toISOString(),
        patient_document_version: existingPlan?.patient_document_version ?? 1,
      },
      user.id,
    );
    navigate({ to: "/dentalplan", search: { treatmentPlanId: plan.id }, replace: true });
    return { treatmentPlanId: plan.id };
  };
  return (
    <DentalPlanStudio
      readOnly={user?.role === "viewer"}
      context={{
        mode: templateMode ? "template" : crmMode ? "crm" : "standalone",
        clinicId: user?.clinic_id,
        patientId: patient?.id,
        treatmentPlanId: existingPlan?.id,
      }}
      initialValue={initial}
      preliminarySuggestions={(roadmap?.treatment_estimates ?? []).map((item) => ({
        key: item.treatment_key,
        label: item.label,
        quantity: item.estimated_quantity,
      }))}
      shareSection={
        existingPlan ? (
          <UnifiedPlanShareSection
            plan={existingPlan}
            clinic={clinic}
            branding={branding}
            patient={patient}
            actorId={user?.id}
            role={user?.role}
          />
        ) : undefined
      }
      clinicUsers={users
        .filter(
          (member) =>
            member.clinic_id === user?.clinic_id &&
            (member.active !== false || member.id === initial?.patient.dentistId),
        )
        .map(({ id, name, role, title, specialty }) => ({
          id,
          name: [name, title, specialty].filter(Boolean).join(" Â· "),
          role,
        }))}
      treatmentDefaults={treatmentDefinitions
        .filter((item) => item.clinic_id === user?.clinic_id)
        .map((item) => ({
          id: item.id,
          treatmentKey: item.treatment_key,
          displayName: item.display_name,
          active: item.active,
          system: item.system,
          category: item.category,
          baseTreatmentKey: item.base_treatment_key as TreatmentType,
          visualKey: item.visual_key as TreatmentType,
          perTooth: item.unit_type === "tooth",
          prices: item.prices,
        }))}
      templates={templates
        .filter((item) => item.clinic_id === user?.clinic_id && item.active)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          planData: createDentalPlan(item.plan_data as Partial<DentalPlanData>),
        }))}
      hotels={hotels
        .filter(
          (item) =>
            item.clinic_id === user?.clinic_id &&
            (item.active || item.id === initial?.travel.selectedHotelId),
        )
        .map((item) => ({
          id: item.id,
          name: item.name,
          categories: item.categories,
          website: item.website,
          description: item.description,
          roomTypes: item.room_types,
          boardTypes: item.board_types,
          defaultNights: item.default_nights,
          pricePerNight: item.price_per_night,
          currency: item.currency,
          companionPolicy: item.companion_policy,
          isDefault: item.is_default,
          images: item.images.map((image) => ({
            id: image.id,
            name: image.name,
            dataUrl: image.data_url,
          })),
        }))}
      onFinalize={finalize}
      onSaveAsTemplate={(value, name) => {
        if (!user?.clinic_id) return;
        saveTemplate(
          {
            id: crypto.randomUUID(),
            clinic_id: user.clinic_id,
            name,
            description: "Saved from a clinic treatment plan",
            category: "Custom",
            active: true,
            default_dentist_id: value.patient.dentistId,
            plan_data: sanitizeTemplatePlan(value),
          },
          user.id,
        );
      }}
      onSave={
        templateMode && activeTemplate
          ? (value) =>
              saveTemplate(
                {
                  ...activeTemplate,
                  plan_data: sanitizeTemplatePlan(value),
                },
                user?.id,
              )
          : saveDraft
      }
    />
  );
}

function sanitizeTemplatePlan(value: DentalPlanData): DentalPlanData {
  const clean = createDentalPlan({
    ...value,
    id: crypto.randomUUID(),
    patientName: "",
    patient: {
      firstName: "",
      lastName: "",
      fullName: "",
      uploadedFiles: [],
      planTitle: value.patient.planTitle || "Template",
      preparationDate: "",
      currency: value.commercial.currency,
      dentistId: value.patient.dentistId,
    },
    importedAssessment: { medicalConditions: [], preferredCities: [] },
    travel: {
      ...value.travel,
      firstVisitDate: undefined,
      secondVisitDate: undefined,
      timelineNotes: undefined,
      internalNotes: undefined,
      patientFacingNotes: undefined,
    },
    finalized: false,
    draftStep: 0,
  });
  return clean;
}
