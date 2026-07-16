import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { DentalPlanStudio, createDentalPlan } from "@/features/dentalplan";
import type { DentalPlanData, TreatmentType } from "@/features/dentalplan";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { useAuth, useAuthHydrated } from "@/lib/auth/mock-auth";
import { canUser } from "@/lib/auth/permissions";
import { treatmentLabel } from "@/lib/dental";
import { derivePlanDefaults } from "@/features/dentalplan/utils/derivePlanDefaults";
import { calculateCommercial, priceForTreatment } from "@/features/dentalplan/utils/commercial";
import { UnifiedPlanShareSection } from "@/features/dentalplan/components/UnifiedPlanShareSection";
import { DEFAULT_CLINICAL_SERVICES } from "@/features/dentalplan/data/serviceDefinitions";
import { usePlannerAssetUrlMap } from "@/features/dentalplan/adapters/plannerAssetStorage";
import type { ToothTreatment, TreatmentPlanItem } from "@/types/models";
import { PageLoading } from "@/components/ui-bits";

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
  "implant-abutment": "implant",
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
  "post-core": "root_canal",
  "bone-graft": "bone_graft",
  "sinus-lift": "sinus_lift",
  whitening: "whitening",
  denture: "denture",
};
function DentalPlanRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const authHydrated = useAuthHydrated();
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
  const ensureShareToken = useMockStore((state) => state.ensureTreatmentPlanShareToken);
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
        item.id === existingPlan?.clinic_patient_id ||
        (!!existingPlan?.patient_user_id && item.user_id === existingPlan.patient_user_id)),
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
  const canViewPlans = canUser(user, "treatment_plans.view");
  const canEditClinical = canUser(user, "treatment_plans.edit_clinical");
  const canEditCommercial = canUser(user, "treatment_plans.edit_commercial");
  const canCreatePlans = canUser(user, "treatment_plans.create");
  const canManageTemplates = canUser(user, "settings.dental_planner");
  const canManagePatients = canUser(user, "patients.manage");
  const canSharePlans = canUser(user, "treatment_plans.share");
  const hotelAssets = useMemo(
    () => hotels.flatMap((hotel) => (Array.isArray(hotel.images) ? hotel.images : [])),
    [hotels],
  );
  const hotelAssetUrls = usePlannerAssetUrlMap(hotelAssets);
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
      medicalConditions: assessment?.medical?.conditions ?? [],
      medications: assessment?.medical?.medications,
      allergies: assessment?.medical?.allergies,
      destinationCountry: assessment?.travel?.destination_country,
      preferredCities: assessment?.travel?.preferred_cities ?? [],
      preferredTimeline: assessment?.travel?.treatment_timeline,
      treatmentInterest: assessment?.dental?.treatment_interest,
      smoking: assessment?.medical?.smoking,
      pregnancy: assessment?.medical?.pregnancy,
      panoramicAvailable: assessment?.uploads?.uploaded_panoramic,
      dentalPhotosAvailable: assessment?.uploads?.uploaded_dental_photos,
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
        (item) =>
          item.clinic_id === user?.clinic_id &&
          (item.id === existingPlan?.clinic_patient_id ||
            (!!existingPlan?.patient_user_id && item.user_id === existingPlan.patient_user_id)),
      );
    const embedded =
      existingPlan?.dental_plan_data && typeof existingPlan.dental_plan_data === "object"
        ? createDentalPlan(existingPlan.dental_plan_data as Partial<DentalPlanData>)
        : undefined;
    const importedCommercial = existingPlan?.currency
      ? {
          currency: existingPlan.currency,
          items: (embedded?.proposedTreatments ?? []).map((treatment) => {
            const matchingItem = existingPlan.price_items?.find(
              (item) =>
                item.id === `price_${treatment.id}` ||
                item.treatment_key === (treatment.treatmentKey ?? treatment.treatmentType),
            );
            const fallback = embedded?.commercial?.items.find(
              (item) =>
                item.treatmentId === treatment.id ||
                item.treatmentDefinitionId === treatment.treatmentDefinitionId ||
                item.treatmentKey === (treatment.treatmentKey ?? treatment.treatmentType),
            );
            return {
              treatmentId: treatment.id,
              treatmentKey: treatment.treatmentKey ?? treatment.treatmentType,
              treatmentDefinitionId: treatment.treatmentDefinitionId,
              label: fallback?.label ?? matchingItem?.label ?? treatment.treatmentType,
              qty: Math.max(1, treatment.toothNumbers.length),
              unitPrice: matchingItem?.unit_price ?? fallback?.unitPrice ?? 0,
              priceOverridden:
                matchingItem?.manually_overridden ?? fallback?.priceOverridden ?? false,
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
    if (embedded)
      return createDentalPlan({
        ...embedded,
        patient: {
          ...embedded.patient,
          patientId: linkedPatient?.id,
          firstName:
            linkedPatient?.first_name ??
            assessment?.personal?.first_name ??
            embedded.patient.firstName,
          lastName:
            linkedPatient?.last_name ??
            assessment?.personal?.last_name ??
            embedded.patient.lastName,
          fullName: linkedPatient
            ? `${linkedPatient.first_name} ${linkedPatient.last_name}`
            : embedded.patient.fullName,
          country: linkedPatient?.country ?? embedded.patient.country,
          city: linkedPatient?.city ?? assessment?.personal?.city ?? embedded.patient.city,
          email: linkedPatient?.email ?? embedded.patient.email,
          phone: linkedPatient?.phone ?? embedded.patient.phone,
          whatsapp:
            linkedPatient?.whatsapp ?? assessment?.personal?.whatsapp ?? embedded.patient.whatsapp,
          preferredLanguage:
            linkedPatient?.language ??
            assessment?.personal?.preferred_language ??
            embedded.patient.preferredLanguage,
          age: assessment?.personal?.age ?? embedded.patient.age,
          source: lead?.source ?? linkedPatient?.source ?? embedded.patient.source,
          assessmentId: assessment?.id ?? embedded.patient.assessmentId,
          roadmapId: roadmap?.id ?? embedded.patient.roadmapId,
          applicationId: application?.id ?? embedded.patient.applicationId,
          leadId: lead?.id ?? embedded.patient.leadId,
          uploadedFiles: caseFiles,
          treatmentInterest:
            linkedPatient?.treatment_interest ?? embedded.patient.treatmentInterest,
          dentistId:
            existingPlan?.dentist_id ??
            embedded.patient.dentistId ??
            linkedPatient?.dentist_id ??
            defaultDentist?.id,
          coordinatorId:
            existingPlan?.coordinator_id ??
            embedded.patient.coordinatorId ??
            lead?.assigned_to ??
            linkedPatient?.coordinator_id ??
            (user?.role === "coordinator" ? user.id : undefined),
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
        : `${assessment?.personal?.first_name ?? ""} ${assessment?.personal?.last_name ?? ""}`.trim(),
      patient: {
        patientId: linkedPatient?.id,
        firstName: linkedPatient?.first_name ?? assessment?.personal?.first_name ?? "",
        lastName: linkedPatient?.last_name ?? assessment?.personal?.last_name ?? "",
        fullName: linkedPatient
          ? `${linkedPatient.first_name} ${linkedPatient.last_name}`
          : `${assessment?.personal?.first_name ?? ""} ${assessment?.personal?.last_name ?? ""}`.trim(),
        dateOfBirth: linkedPatient?.date_of_birth,
        age: assessment?.personal?.age,
        country: linkedPatient?.country ?? assessment?.personal?.country,
        city: linkedPatient?.city ?? assessment?.personal?.city,
        email: linkedPatient?.email ?? assessment?.personal?.email,
        phone: linkedPatient?.phone ?? assessment?.personal?.phone,
        whatsapp: linkedPatient?.whatsapp ?? assessment?.personal?.whatsapp,
        preferredLanguage: linkedPatient?.language ?? assessment?.personal?.preferred_language,
        treatmentInterest:
          linkedPatient?.treatment_interest ?? assessment?.dental?.treatment_interest,
        source: lead?.source ?? linkedPatient?.source ?? "manual",
        assessmentId: assessment?.id,
        roadmapId: roadmap?.id,
        applicationId: application?.id,
        leadId: lead?.id,
        uploadedFiles: caseFiles,
        dentistId: existingPlan?.dentist_id ?? linkedPatient?.dentist_id ?? defaultDentist?.id,
        coordinatorId:
          existingPlan?.coordinator_id ??
          lead?.assigned_to ??
          linkedPatient?.coordinator_id ??
          (user?.role === "coordinator" ? user.id : undefined),
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
    user?.id,
    user?.role,
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
  const plannerClinicUsers = useMemo(
    () =>
      users
        .filter(
          (member) =>
            member.clinic_id === user?.clinic_id &&
            (member.active !== false ||
              member.id === initial?.patient.dentistId ||
              member.id === initial?.patient.coordinatorId),
        )
        .map(({ id, name, role, title, specialty }) => ({
          id,
          name: [name, title, specialty].filter(Boolean).join(" Â· "),
          role,
        })),
    [users, user?.clinic_id, initial?.patient.dentistId, initial?.patient.coordinatorId],
  );
  const plannerTreatmentDefaults = useMemo(
    () =>
      treatmentDefinitions
        .filter((item) => item.clinic_id === user?.clinic_id)
        .map((item) => ({
          id: item.id,
          treatmentKey: item.treatment_key,
          displayName: item.display_name,
          active: item.active !== false,
          system: item.system,
          category: item.category,
          baseTreatmentKey: item.base_treatment_key as TreatmentType,
          visualKey: item.visual_key as TreatmentType,
          perTooth: item.unit_type === "tooth",
          clinicalBehavior: item.clinical_behavior,
          defaultMaterial:
            item.default_material as DentalPlanData["proposedTreatments"][number]["material"],
          implantBrand: item.implant_brand,
          prices: item.prices ?? {},
        })),
    [treatmentDefinitions, user?.clinic_id],
  );
  const plannerHotels = useMemo(
    () =>
      hotels
        .filter(
          (item) =>
            item.clinic_id === user?.clinic_id &&
            (item.active !== false || item.id === initial?.travel.selectedHotelId),
        )
        .map((item) => ({
          id: item.id,
          name: item.name,
          categories: Array.isArray(item.categories) ? item.categories : [],
          website: item.website,
          description: item.description,
          roomTypes: Array.isArray(item.room_types) ? item.room_types : [],
          boardTypes: Array.isArray(item.board_types) ? item.board_types : [],
          defaultNights: Number.isFinite(item.default_nights) ? item.default_nights : 0,
          pricePerNight: Number.isFinite(item.price_per_night) ? item.price_per_night : 0,
          currency: ["GBP", "EUR", "USD", "TRY"].includes(item.currency) ? item.currency : "EUR",
          companionPolicy: item.companion_policy,
          isDefault: !!item.is_default,
          images: (Array.isArray(item.images) ? item.images : [])
            .filter((image) => image && typeof image === "object")
            .map((image) => ({
              id: image.id,
              name: image.name,
              dataUrl: image.data_url ?? hotelAssetUrls[image.id],
            })),
        })),
    [hotels, user?.clinic_id, initial?.travel.selectedHotelId, hotelAssetUrls],
  );
  const preliminarySuggestions = useMemo(
    () =>
      (Array.isArray(roadmap?.treatment_estimates) ? roadmap.treatment_estimates : []).map(
        (item) => ({
          key: item.treatment_key,
          label: item.label,
          quantity: item.estimated_quantity,
        }),
      ),
    [roadmap?.treatment_estimates],
  );
  const plannerServiceOptions = Array.isArray(clinic?.planner_included_services)
    ? clinic.planner_included_services.filter(
        (service): service is string => typeof service === "string",
      )
    : DEFAULT_CLINICAL_SERVICES;
  if (!hydrated || !authHydrated) return <PageLoading label="Loading Treatment Plan" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "platform_admin" || !user.clinic_id)
    return <Navigate to="/admin/dashboard" replace />;
  if (!templateMode && !requestedCrmContext) return <Navigate to="/pro/treatment-plans" replace />;
  if (templateMode && !canManageTemplates)
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold">Template access unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your clinic role does not include Dental Planner settings access.
        </p>
      </div>
    );
  if (templateMode && !activeTemplate)
    return <div className="p-8">Template unavailable for the active clinic.</div>;
  if (requestedCrmContext && !canViewPlans)
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold">Planner access unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your clinic role does not include access to Treatment Plans.
        </p>
      </div>
    );
  if (requestedCrmContext && !crmMode)
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold">Planner context unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This patient, lead, assessment, or treatment plan is unavailable for the active clinic.
        </p>
      </div>
    );
  const saveDraft = (value: DentalPlanData) => {
    if (!existingPlan || !user?.clinic_id || !canEditClinical) return;
    if (patient && canManagePatients)
      updatePatient(
        patient.id,
        {
          first_name: value.patient.firstName,
          last_name: value.patient.lastName,
          email: value.patient.email || undefined,
          country: value.patient.country || undefined,
          language: value.patient.preferredLanguage || undefined,
        },
        user.id,
      );
    const draftItems: TreatmentPlanItem[] = value.proposedTreatments.flatMap((treatment) =>
      treatment.toothNumbers.map((tooth) => ({
        id: `dpi_${treatment.id}_${tooth}`,
        tooth,
        treatment: treatmentMap[treatment.treatmentType] ?? "crown",
        material: treatment.material,
        notes: treatment.notes,
        unit_price: priceForTreatment(treatment, value.commercial.items),
      })),
    );
    const totals = calculateCommercial(value.commercial);
    const persistedData = existingPlan.dental_plan_data as DentalPlanData | undefined;
    const safePlanData: DentalPlanData = {
      ...value,
      patient: canManagePatients ? value.patient : (persistedData?.patient ?? value.patient),
      patientName: canManagePatients
        ? value.patientName
        : (persistedData?.patientName ?? value.patientName),
      commercial: canEditCommercial
        ? value.commercial
        : (persistedData?.commercial ?? value.commercial),
      travel: canEditCommercial
        ? value.travel
        : {
            ...(persistedData?.travel ?? value.travel),
            internalNotes: value.travel.internalNotes,
          },
    };
    updatePlan(
      existingPlan.id,
      {
        ...(canManagePatients
          ? {
              title: value.patient.planTitle,
              dentist_id: value.patient.dentistId,
              coordinator_id: value.patient.coordinatorId,
            }
          : {}),
        items: draftItems,
        internal_clinical_notes: value.travel.internalNotes,
        dental_plan_data: safePlanData,
        ...(canEditCommercial
          ? {
              patient_facing_notes: value.travel.patientFacingNotes,
              currency: value.commercial.currency,
              price_items: value.commercial.items.map((item) => {
                const treatment = value.proposedTreatments.find(
                  (candidate) =>
                    candidate.treatmentDefinitionId === item.treatmentDefinitionId ||
                    candidate.treatmentKey === item.treatmentKey ||
                    candidate.id === item.treatmentId,
                );
                return {
                  id: `price_${item.treatmentId}`,
                  label: item.label,
                  quantity: item.qty,
                  unit_price: item.unitPrice,
                  treatment_key: item.treatmentKey,
                  treatment_definition_id: item.treatmentDefinitionId,
                  treatment_group_id: treatment?.treatmentGroupId,
                  category: item.category,
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
            }
          : {}),
      },
      user.id,
    );
  };
  const finalize = async (value: DentalPlanData) => {
    if (!canEditClinical) throw new Error("Your clinic role cannot modify Treatment Plans.");
    if (!existingPlan && !canCreatePlans)
      throw new Error("Your clinic role cannot create Treatment Plans.");
    if (!crmMode || !user?.clinic_id)
      throw new Error("A valid clinic patient or treatment-plan context is required.");
    let linkedPatient =
      patient ??
      patients.find(
        (item) =>
          item.clinic_id === user.clinic_id &&
          (item.id === existingPlan?.clinic_patient_id ||
            (!!existingPlan?.patient_user_id && item.user_id === existingPlan.patient_user_id)),
      );
    if (!linkedPatient) {
      if (!canManagePatients)
        throw new Error("The linked clinic patient is unavailable for this Treatment Plan.");
      const normalizedEmail = value.patient.email?.trim().toLowerCase();
      const duplicate = patients.find(
        (item) =>
          !!normalizedEmail &&
          item.clinic_id === user.clinic_id &&
          item.email?.trim().toLowerCase() === normalizedEmail,
      );
      linkedPatient =
        duplicate ??
        addPatient(
          {
            clinic_id: user.clinic_id,
            first_name: value.patient.firstName,
            last_name: value.patient.lastName,
            email: value.patient.email || undefined,
            phone: value.patient.phone,
            country: value.patient.country || undefined,
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
    } else if (canManagePatients)
      updatePatient(
        linkedPatient.id,
        {
          first_name: value.patient.firstName,
          last_name: value.patient.lastName,
          email: value.patient.email ?? linkedPatient.email,
          phone: value.patient.phone,
          country: value.patient.country ?? linkedPatient.country,
          city: value.patient.city,
          date_of_birth: value.patient.dateOfBirth,
          language: value.patient.preferredLanguage,
          whatsapp: value.patient.whatsapp,
        },
        user.id,
      );
    const persistedData = existingPlan?.dental_plan_data as DentalPlanData | undefined;
    const finalValue: DentalPlanData = {
      ...value,
      patient: canManagePatients ? value.patient : (persistedData?.patient ?? value.patient),
      patientName: canManagePatients
        ? value.patientName
        : (persistedData?.patientName ?? value.patientName),
      commercial: canEditCommercial
        ? value.commercial
        : (persistedData?.commercial ?? value.commercial),
      travel: canEditCommercial
        ? value.travel
        : {
            ...(persistedData?.travel ?? value.travel),
            internalNotes: value.travel.internalNotes,
          },
    };
    const items: TreatmentPlanItem[] = finalValue.proposedTreatments.flatMap((treatment) =>
      treatment.toothNumbers.map((tooth) => ({
        id: `dpi_${treatment.id}_${tooth}`,
        tooth,
        treatment: treatmentMap[treatment.treatmentType] ?? "crown",
        material: treatment.material,
        notes: treatment.notes,
        unit_price: priceForTreatment(treatment, finalValue.commercial.items),
      })),
    );
    const defaults = derivePlanDefaults(finalValue);
    const patch = {
      ...(canManagePatients
        ? {
            title: finalValue.patient.planTitle,
            dentist_id: finalValue.patient.dentistId,
            coordinator_id: finalValue.patient.coordinatorId,
          }
        : {}),
      summary: finalValue.travel.patientFacingNotes ?? "Dental treatment plan",
      items,
      visits: defaults.recommendedVisits,
      healing_weeks: defaults.recommendedHealingWeeks,
      ...(canEditCommercial ? { patient_facing_notes: finalValue.travel.patientFacingNotes } : {}),
      internal_clinical_notes: finalValue.travel.internalNotes,
      treatment_timeline: `${defaults.visitDurationSummary}. ${defaults.healingPeriodSummary}.`,
      dental_plan_data: finalValue,
      treatment_groups: finalValue.treatmentGroups.map((group) => ({
        id: group.id,
        type: group.type,
        arch: group.arch,
        affected_teeth: group.affectedTeeth,
        generated_item_ids: group.generatedTreatmentIds,
        bridge_type: group.bridgeType,
        support_type: group.supportType,
        material: group.material,
        abutments: group.abutments,
        pontics: group.pontics,
        implant_positions: group.implantPositions,
      })),
    };
    const plan = existingPlan
      ? (updatePlan(existingPlan.id, patch, user.id), { ...existingPlan, ...patch })
      : addPlan(
          {
            clinic_id: user.clinic_id,
            patient_user_id: linkedPatient.user_id ?? linkedPatient.id,
            clinic_patient_id: linkedPatient.id,
            lead_id: finalValue.patient.leadId,
            clinic_application_id: finalValue.patient.applicationId,
            assessment_id: finalValue.patient.assessmentId,
            roadmap_id: finalValue.patient.roadmapId,
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
            title: finalValue.patient.planTitle || "Dental treatment plan",
          },
          user.id,
        );
    const priceItems = items.map((item) => {
      const customTreatment = finalValue.proposedTreatments.find((treatment) =>
        item.id.startsWith(`dpi_${treatment.id}_`),
      );
      return {
        id: `qi_${item.id}`,
        label: `Tooth ${item.tooth} · ${customTreatment?.displayName ?? treatmentLabel(item.treatment)}`,
        qty: 1,
        unit_price: item.unit_price,
      };
    });
    if (finalValue.commercial.otherServiceTotal > 0)
      priceItems.push({
        id: "qi_other_services",
        label: "Other services",
        qty: 1,
        unit_price: finalValue.commercial.otherServiceTotal,
      });
    const beforeDiscount =
      priceItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0) +
      (finalValue.travel.hotelIncluded ? finalValue.commercial.hotelTotal : 0) +
      (finalValue.travel.includedServices.includes("Airport Transfer") ||
      finalValue.travel.includedServices.includes("Hotel Transfer")
        ? finalValue.commercial.transferTotal
        : 0) +
      0;
    const discount =
      finalValue.commercial.discountType === "percentage"
        ? Math.min(
            beforeDiscount,
            (beforeDiscount * Math.min(100, Math.max(0, finalValue.commercial.discountValue))) /
              100,
          )
        : finalValue.commercial.discountType === "fixed"
          ? Math.min(beforeDiscount, Math.max(0, finalValue.commercial.discountValue))
          : 0;
    const hotelSummary = finalValue.travel.hotelIncluded
      ? `Hotel: ${finalValue.travel.hotelName || "To be confirmed"} Â· ${finalValue.travel.hotelNights} nights${finalValue.travel.roomType ? ` Â· ${finalValue.travel.roomType}` : ""}${finalValue.travel.boardType ? ` Â· ${finalValue.travel.boardType}` : ""}`
      : undefined;
    const includedServices = [
      ...finalValue.travel.includedServices.filter((service) => !service.startsWith("Hotel: ")),
      ...(hotelSummary ? [hotelSummary] : []),
    ].filter((service, index, services) => services.indexOf(service) === index);
    const commercialPatch = {
      items: priceItems,
      currency: finalValue.commercial.currency,
      hotel_total: finalValue.travel.hotelIncluded ? finalValue.commercial.hotelTotal : 0,
      transfer_total:
        finalValue.travel.includedServices.includes("Airport Transfer") ||
        finalValue.travel.includedServices.includes("Hotel Transfer")
          ? finalValue.commercial.transferTotal
          : 0,
      discount,
      payment_schedule: finalValue.commercial.paymentSchedule.map(({ label, amount, due }) => ({
        label,
        amount,
        due,
      })),
      valid_until: finalValue.commercial.validUntil,
      included_services: includedServices,
    };
    if (canEditCommercial)
      updatePlan(
        plan.id,
        {
          currency: commercialPatch.currency,
          price_items: finalValue.commercial.items.map((item) => {
            const treatment = finalValue.proposedTreatments.find(
              (candidate) =>
                candidate.treatmentDefinitionId === item.treatmentDefinitionId ||
                candidate.treatmentKey === item.treatmentKey ||
                candidate.id === item.treatmentId,
            );
            return {
              id: `price_${item.treatmentId}`,
              label: item.label,
              quantity: item.qty,
              unit_price: item.unitPrice,
              treatment_key: item.treatmentKey,
              treatment_definition_id: item.treatmentDefinitionId,
              treatment_group_id: treatment?.treatmentGroupId,
              category: item.category,
              manually_overridden: item.priceOverridden,
            };
          }),
          hotel_total: commercialPatch.hotel_total,
          transfer_total: commercialPatch.transfer_total,
          optional_service_total: finalValue.commercial.otherServiceTotal,
          discount_type: finalValue.commercial.discountType,
          discount_value: finalValue.commercial.discountValue,
          calculated_discount: discount,
          payment_schedule: commercialPatch.payment_schedule,
          valid_until: commercialPatch.valid_until,
          included_services: commercialPatch.included_services,
          excluded_services: existingPlan?.excluded_services ?? [],
          hotel_nights: finalValue.travel.hotelIncluded ? finalValue.travel.hotelNights : 0,
          transfers_included:
            finalValue.travel.includedServices.includes("Airport Transfer") ||
            finalValue.travel.includedServices.includes("Hotel Transfer"),
          flight_included: finalValue.travel.includedServices.includes("Flight Included"),
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
      readOnly={(requestedCrmContext && !canEditClinical) || (!existingPlan && !canCreatePlans)}
      commercialReadOnly={!canEditCommercial}
      caseReadOnly={!canManagePatients}
      context={{
        mode: templateMode ? "template" : crmMode ? "crm" : "standalone",
        clinicId: user?.clinic_id,
        patientId: patient?.id,
        treatmentPlanId: existingPlan?.id,
      }}
      initialValue={initial}
      documentStatus={existingPlan?.status}
      onPreview={
        existingPlan && (existingPlan.share_token || canSharePlans)
          ? () => {
              const token =
                existingPlan.share_token ??
                ensureShareToken(existingPlan.id, existingPlan.clinic_id, user.id);
              if (token)
                window.open(
                  `/shared/treatment-plan/${token}?preview=true`,
                  "_blank",
                  "noopener,noreferrer",
                );
            }
          : undefined
      }
      preliminarySuggestions={preliminarySuggestions}
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
      clinicUsers={plannerClinicUsers}
      treatmentDefaults={plannerTreatmentDefaults}
      hotels={plannerHotels}
      serviceOptions={plannerServiceOptions}
      onFinalize={finalize}
      onChange={crmMode ? saveDraft : undefined}
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
