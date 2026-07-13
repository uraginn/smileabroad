import type {
  Assessment,
  Clinic,
  ClinicBranding,
  ClinicTreatmentDefinition,
  Patient,
  PlanCurrency,
  Roadmap,
  TreatmentPlan,
  TreatmentPlanPayment,
  ToothTreatment,
  User,
} from "@/types/models";
import type { DentalPlanData } from "@/features/dentalplan";
import { calculateTreatmentPlanTotals } from "@/lib/treatment-plan-commercial";
import { treatmentLabel } from "@/lib/dental";
import {
  patientTreatmentCategory,
  treatmentByType,
} from "@/features/dentalplan/data/treatmentDefinitions";
import type { TreatmentType } from "@/features/dentalplan/types/dental-plan.types";

export interface CarePlanPricePresentation {
  currency: PlanCurrency;
  minimum?: number;
  maximum?: number;
  subtotal?: number;
  total?: number;
  hotel_total?: number;
  transfer_total?: number;
  optional_service_total?: number;
  discount?: number;
  items?: { label: string; quantity: number; unit_price: number; total: number }[];
  payment_schedule?: TreatmentPlanPayment[];
  payment_schedule_valid?: boolean;
  valid_until?: string;
}
export interface CarePlanClinicPresentation {
  name: string;
  city?: string;
  country?: string;
  logo_url?: string;
  banner_url?: string;
  tagline?: string;
  introduction?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  phone?: string;
  email?: string;
  website?: string;
}
export interface CarePlanPresentation {
  kind: "preliminary_roadmap" | "clinic_treatment_plan";
  title: string;
  summary: string;
  patient_name?: string;
  treatment_overview: string;
  destination?: { country?: string; cities: string[] };
  preferred_timeline?: string;
  visit_information?: string;
  healing_information?: string;
  price: CarePlanPricePresentation;
  clinic?: CarePlanClinicPresentation;
  disclaimer: string;
}
export interface PatientTreatmentGroup {
  id: string;
  treatment?: ToothTreatment;
  treatment_key?: string;
  label: string;
  category: string;
  patient_description?: string;
  quantity: number;
  unit_price: number;
  total: number;
  teeth: number[];
  patient_notes: string[];
}
export interface PatientTreatmentExplanation {
  id: string;
  title: string;
  what_it_is: string;
  plan_context: string;
  how_performed: string;
  important_to_know: string;
}
export interface PatientJourneyStep {
  id: string;
  title: string;
  description?: string;
  stay?: string;
  healing?: string;
  instructions?: string;
}
export interface PatientTravelSummary {
  hotel?: { name: string; room_type?: string; board_type?: string; website?: string };
  nights?: number;
  services: string[];
}
export interface PatientTreatmentDocument extends CarePlanPresentation {
  kind: "clinic_treatment_plan";
  reference: string;
  prepared_at: string;
  status_label: string;
  treatment_groups: PatientTreatmentGroup[];
  treatment_explanations: PatientTreatmentExplanation[];
  journey: PatientJourneyStep[];
  travel?: PatientTravelSummary;
  included_services: string[];
  patient_notes: string[];
  diagrams?: Pick<DentalPlanData, "currentConditions" | "proposedTreatments">;
  coordinator?: { name: string; title?: string; avatar_url?: string };
}

export function mapPreliminaryRoadmap(input: {
  roadmap: Roadmap;
  assessment: Assessment;
}): CarePlanPresentation {
  const { roadmap, assessment } = input;
  return {
    kind: "preliminary_roadmap",
    title: "Your preliminary roadmap",
    summary: roadmap.summary,
    treatment_overview: assessment.dental.treatment_interest || roadmap.estimated_treatment,
    destination: {
      country: assessment.travel.destination_country || undefined,
      cities: assessment.travel.preferred_cities ?? [],
    },
    preferred_timeline: assessment.travel.treatment_timeline,
    visit_information: `${roadmap.estimated_visits} estimated visit${roadmap.estimated_visits === 1 ? "" : "s"}`,
    healing_information: `${roadmap.healing_weeks} estimated healing week${roadmap.healing_weeks === 1 ? "" : "s"}`,
    price: {
      currency: roadmap.currency as PlanCurrency,
      minimum: roadmap.price_min,
      maximum: roadmap.price_max,
    },
    disclaimer:
      "This preliminary roadmap is based only on information provided in the assessment. It is not a diagnosis, treatment plan, or final quotation.",
  };
}

export function buildPatientTreatmentTable(
  plan: TreatmentPlan,
  treatmentDefinitions: ClinicTreatmentDefinition[] = [],
): PatientTreatmentGroup[] {
  const embedded = isDentalPlanData(plan.dental_plan_data) ? plan.dental_plan_data : undefined;
  if (embedded?.proposedTreatments.length) {
    const groups = new Map<string, PatientTreatmentGroup>();
    const consumedPrices = new Set<string>();
    for (const treatment of embedded.proposedTreatments) {
      const definition = treatmentDefinitions.find(
        (item) =>
          item.id === treatment.treatmentDefinitionId ||
          item.treatment_key === treatment.treatmentKey,
      );
      const price = (plan.price_items ?? []).find(
        (item) =>
          !consumedPrices.has(item.id) &&
          (item.id === `price_${treatment.id}` ||
            item.treatment_definition_id === treatment.treatmentDefinitionId),
      );
      const embeddedPrice = embedded.commercial.items.find(
        (item) => item.treatmentId === treatment.id,
      );
      const treatmentKey =
        treatment.treatmentKey ?? definition?.treatment_key ?? treatment.treatmentType;
      const visualKey = (definition?.visual_key ??
        treatment.visualKey ??
        treatment.treatmentType) as TreatmentType;
      const unitPrice = price?.unit_price ?? embeddedPrice?.unitPrice ?? 0;
      const quantity =
        price?.quantity ?? embeddedPrice?.qty ?? Math.max(1, treatment.toothNumbers.length);
      const category = resolvePatientCategory(price?.category, definition, visualKey);
      const label =
        definition?.patient_label ??
        definition?.display_name ??
        treatment.displayName ??
        treatmentByType(treatment.treatmentType).label;
      const groupKey = `${definition?.id ?? treatmentKey}|${unitPrice}|${category}`;
      const current = groups.get(groupKey);
      if (current) {
        current.quantity += quantity;
        current.total += quantity * unitPrice;
        treatment.toothNumbers.forEach((tooth) => {
          if (!current.teeth.includes(tooth)) current.teeth.push(tooth);
        });
      } else {
        groups.set(groupKey, {
          id: groupKey,
          treatment: legacyTreatmentForKey(visualKey),
          treatment_key: treatmentKey,
          label,
          category,
          patient_description: definition?.description,
          quantity,
          unit_price: unitPrice,
          total: quantity * unitPrice,
          teeth: [...new Set(treatment.toothNumbers)],
          patient_notes: [],
        });
      }
      if (price) consumedPrices.add(price.id);
    }
    appendUnmatchedPrices(groups, plan, consumedPrices, treatmentDefinitions);
    return [...groups.values()].filter((group) => group.quantity > 0);
  }

  const prices = plan.price_items ?? [];
  const byTreatment = new Map<ToothTreatment, PatientTreatmentGroup>();
  const consumedPrices = new Set<string>();
  for (const item of plan.items ?? []) {
    const current = byTreatment.get(item.treatment);
    const label = treatmentLabel(item.treatment);
    if (current) {
      current.quantity += 1;
      if (!current.teeth.includes(item.tooth)) current.teeth.push(item.tooth);
      if (item.patient_facing_note && !current.patient_notes.includes(item.patient_facing_note))
        current.patient_notes.push(item.patient_facing_note);
    } else
      byTreatment.set(item.treatment, {
        id: item.treatment,
        treatment: item.treatment,
        treatment_key: item.treatment,
        label,
        category: patientCategoryForLegacy(item.treatment),
        quantity: 1,
        unit_price: 0,
        total: 0,
        teeth: [item.tooth],
        patient_notes: item.patient_facing_note ? [item.patient_facing_note] : [],
      });
  }
  const groups = [...byTreatment.values()];
  for (const group of groups) {
    const matches = prices.filter(
      (price) =>
        !consumedPrices.has(price.id) &&
        (price.treatment_key === group.treatment_key ||
          normalize(price.label).includes(normalize(group.label)) ||
          normalize(group.label).includes(normalize(price.label))),
    );
    if (matches.length) {
      matches.forEach((match) => consumedPrices.add(match.id));
      group.quantity = matches.reduce((sum, x) => sum + x.quantity, 0);
      group.total = matches.reduce((sum, x) => sum + x.quantity * x.unit_price, 0);
      group.unit_price = group.quantity ? group.total / group.quantity : 0;
    } else {
      const itemPrices = (plan.items ?? []).filter((x) => x.treatment === group.treatment);
      group.total = itemPrices.reduce((sum, x) => sum + x.unit_price, 0);
      group.unit_price = group.quantity ? group.total / group.quantity : 0;
    }
  }
  for (const price of prices) {
    if (consumedPrices.has(price.id)) continue;
    const definition = treatmentDefinitions.find(
      (item) =>
        item.id === price.treatment_definition_id || item.treatment_key === price.treatment_key,
    );
    const visualKey = (definition?.visual_key ?? price.treatment_key ?? "other") as TreatmentType;
    groups.push({
      id: `price_${price.id}`,
      treatment: legacyTreatmentForKey(visualKey),
      treatment_key: price.treatment_key,
      label: definition?.patient_label ?? definition?.display_name ?? cleanPriceLabel(price.label),
      category: resolvePatientCategory(price.category, definition, visualKey),
      patient_description: definition?.description,
      quantity: price.quantity,
      unit_price: price.unit_price,
      total: price.quantity * price.unit_price,
      teeth: [],
      patient_notes: [],
    });
  }
  return groups.filter((group) => group.quantity > 0);
}

export const groupTreatmentPlanItemsForPatient = buildPatientTreatmentTable;

function appendUnmatchedPrices(
  groups: Map<string, PatientTreatmentGroup>,
  plan: TreatmentPlan,
  consumedPrices: Set<string>,
  definitions: ClinicTreatmentDefinition[],
) {
  for (const price of plan.price_items ?? []) {
    if (consumedPrices.has(price.id)) continue;
    const definition = definitions.find(
      (item) =>
        item.id === price.treatment_definition_id || item.treatment_key === price.treatment_key,
    );
    const visualKey = (definition?.visual_key ?? price.treatment_key ?? "other") as TreatmentType;
    const category = resolvePatientCategory(price.category, definition, visualKey);
    const label =
      definition?.patient_label ?? definition?.display_name ?? cleanPriceLabel(price.label);
    const groupKey = `${definition?.id ?? price.treatment_key ?? price.id}|${price.unit_price}|${category}`;
    const current = groups.get(groupKey);
    if (current) {
      current.quantity += price.quantity;
      current.total += price.quantity * price.unit_price;
    } else {
      groups.set(groupKey, {
        id: groupKey,
        treatment: legacyTreatmentForKey(visualKey),
        treatment_key: price.treatment_key,
        label,
        category,
        patient_description: definition?.description,
        quantity: price.quantity,
        unit_price: price.unit_price,
        total: price.quantity * price.unit_price,
        teeth: [],
        patient_notes: [],
      });
    }
  }
}

function cleanPriceLabel(label: string) {
  return label
    .split("·")[0]
    .replace(/\s*\([^)]*units?\)\s*$/i, "")
    .trim();
}

function resolvePatientCategory(
  priceCategory: string | undefined,
  definition: ClinicTreatmentDefinition | undefined,
  visualKey: TreatmentType,
) {
  if (priceCategory?.trim()) return priceCategory;
  if (definition && !definition.system && definition.category.trim()) return definition.category;
  return patientTreatmentCategory(visualKey);
}

function legacyTreatmentForKey(key: string): ToothTreatment | undefined {
  const matches: Partial<Record<TreatmentType, ToothTreatment>> = {
    "dental-implant": "implant",
    "implant-crown": "crown",
    "zirconium-crown": "crown",
    "emax-crown": "crown",
    "porcelain-crown": "crown",
    "temporary-crown": "crown",
    "root-canal-treatment": "root_canal",
    "composite-bonding": "composite",
    "composite-filling": "filling",
    "bone-graft": "bone_graft",
    "sinus-lift": "sinus_lift",
    "all-on-4": "implant",
    "all-on-6": "implant",
    extraction: "extraction",
    bridge: "bridge",
    pontic: "pontic",
    veneer: "veneer",
    whitening: "whitening",
    denture: "denture",
  };
  return matches[key as TreatmentType];
}

function patientCategoryForLegacy(treatment: ToothTreatment) {
  const keys: Record<ToothTreatment, TreatmentType> = {
    implant: "dental-implant",
    crown: "zirconium-crown",
    extraction: "extraction",
    bridge: "bridge",
    pontic: "pontic",
    veneer: "veneer",
    composite: "composite-bonding",
    filling: "composite-filling",
    root_canal: "root-canal-treatment",
    bone_graft: "bone-graft",
    sinus_lift: "sinus-lift",
    whitening: "whitening",
    denture: "denture",
  };
  return patientTreatmentCategory(keys[treatment]);
}

export function buildPatientTreatmentExplanations(
  groups: PatientTreatmentGroup[],
  journey: PatientJourneyStep[],
): PatientTreatmentExplanation[] {
  return groups.map((group) => {
    const content = (group.treatment ? EXPLANATIONS[group.treatment] : undefined) ?? {
      what:
        group.patient_description ??
        `${group.label} is part of the dentist-confirmed Treatment Plan.`,
      context: "Your dentist included this treatment as part of your confirmed clinical plan.",
    };
    return {
      id: group.id,
      title: group.label,
      what_it_is: content.what,
      plan_context: content.context.replace("{quantity}", String(group.quantity)),
      how_performed:
        journey.find((step) => step.description?.toLowerCase().includes(group.label.toLowerCase()))
          ?.description ??
        `Your clinic will complete the planned ${group.label.toLowerCase()} within your confirmed treatment sequence and review your progress before the next stage.`,
      important_to_know:
        group.patient_notes.join(" ") ||
        "Your dentist will confirm the final clinical details with you before this part of your treatment begins.",
    };
  });
}

export function mapTreatmentPlanToPatientDocument(
  plan: TreatmentPlan,
  clinic: Clinic,
  patient?: Patient,
  branding?: ClinicBranding,
  coordinator?: User,
  treatmentDefinitions: ClinicTreatmentDefinition[] = [],
): PatientTreatmentDocument {
  const totals = calculateTreatmentPlanTotals(plan);
  const treatment_groups = buildPatientTreatmentTable(plan, treatmentDefinitions);
  const journey = buildJourney(plan);
  const embedded = isDentalPlanData(plan.dental_plan_data) ? plan.dental_plan_data : undefined;
  const travel = buildTravel(plan, branding);
  const statusLabel: { [key: string]: string } = {
    draft: "Clinic preview",
    doctor_review: "Under clinical review",
    approved: "Approved",
    sent: "Sent to patient",
    viewed: "Reviewed by patient",
    accepted: "Accepted",
    declined: "Declined",
    expired: "Expired",
  };
  return {
    kind: "clinic_treatment_plan",
    title: plan.title,
    summary: plan.summary,
    patient_name: patient ? `${patient.first_name} ${patient.last_name}`.trim() : undefined,
    treatment_overview: plan.summary,
    visit_information: plan.visits
      ? `${plan.visits} planned visit${plan.visits === 1 ? "" : "s"}`
      : undefined,
    healing_information: plan.healing_weeks
      ? `${plan.healing_weeks} planned healing week${plan.healing_weeks === 1 ? "" : "s"}`
      : undefined,
    reference: plan.id,
    prepared_at: plan.prepared_at ?? plan.created_at,
    status_label: statusLabel[plan.status ?? "draft"] ?? "Treatment Plan",
    clinic: {
      name: clinic.name,
      city: clinic.city,
      country: clinic.country,
      logo_url: svgLogoUrl(branding?.logo_url ?? branding?.shared_view_logo_url),
      banner_url: clinic.cover_image || branding?.shared_view_banner_url,
      tagline: branding?.shared_view_tagline ?? clinic.short_description,
      introduction: branding?.shared_view_introduction,
      primary_color: branding?.primary_color,
      secondary_color: branding?.secondary_color,
      accent_color: branding?.shared_view_accent_color ?? branding?.primary_color,
      phone: branding?.phone,
      email: branding?.email,
      website: branding?.website ?? clinic.website,
    },
    coordinator: coordinator
      ? { name: coordinator.name, title: coordinator.title, avatar_url: coordinator.avatar_url }
      : undefined,
    price: {
      currency: plan.currency ?? "EUR",
      subtotal: totals.subtotal,
      total: totals.total,
      hotel_total: plan.hotel_total ?? 0,
      transfer_total: plan.transfer_total ?? 0,
      optional_service_total: plan.optional_service_total ?? 0,
      discount: totals.discount,
      items: treatment_groups.map(({ label, quantity, unit_price, total }) => ({
        label,
        quantity,
        unit_price,
        total,
      })),
      payment_schedule: totals.paymentScheduleMatches
        ? normalizeSchedule(plan.payment_schedule ?? [], plan.visits)
        : undefined,
      payment_schedule_valid: totals.paymentScheduleMatches,
      valid_until: plan.valid_until,
    },
    treatment_groups,
    treatment_explanations: buildPatientTreatmentExplanations(treatment_groups, journey),
    journey,
    travel,
    included_services: [...new Set(plan.included_services ?? [])],
    patient_notes: [
      ...new Set(
        [plan.patient_facing_notes, plan.patient_message].filter((value): value is string =>
          Boolean(value?.trim()),
        ),
      ),
    ],
    diagrams: embedded
      ? {
          currentConditions: embedded.currentConditions,
          proposedTreatments: embedded.proposedTreatments,
        }
      : undefined,
    disclaimer:
      "This Treatment Plan and cost estimate were prepared by the clinic and remain subject to clinical confirmation and the clinic's patient terms.",
  };
}

function buildJourney(plan: TreatmentPlan): PatientJourneyStep[] {
  const stages = (plan.treatment_stages ?? []).map((stage) => ({
    id: `stage_${stage.stage_number}`,
    title: stage.title,
    description:
      stage.description ??
      "During this stage, your clinic completes the planned care and checks your progress before the next step.",
    stay: stage.duration_or_stay,
    healing: stage.healing_period_after,
    instructions: stage.patient_instructions,
  }));
  if (stages.length) return stages;
  const visits = (plan.visit_plan ?? []).map((visit) => ({
    id: `visit_${visit.visit_number}`,
    title: visit.title || `${ordinal(visit.visit_number)} Visit`,
    description:
      visit.description ??
      "During this visit, your clinic completes the planned stage and prepares you for what comes next.",
    stay: visit.expected_stay,
    healing: visit.healing_period_after,
    instructions: visit.patient_instructions,
  }));
  if (visits.length) return visits;
  const result: PatientJourneyStep[] = [
    {
      id: "checks",
      title: "Clinical examination and final checks",
      description: "The clinic confirms the Treatment Plan before treatment begins.",
    },
    {
      id: "visit_1",
      title: "1st Visit",
      description: "The first planned stage of your treatment is completed.",
    },
  ];
  if (plan.healing_weeks > 0)
    result.push({
      id: "healing",
      title: "Healing period",
      description: `Allow approximately ${plan.healing_weeks} week${plan.healing_weeks === 1 ? "" : "s"} for healing.`,
    });
  if (plan.visits > 1)
    result.push({
      id: "visit_2",
      title: "2nd Visit",
      description: "Final treatment and restorations are completed.",
    });
  result.push({
    id: "aftercare",
    title: "Aftercare",
    description: "The clinic provides the relevant aftercare guidance.",
  });
  return result;
}
function buildTravel(
  plan: TreatmentPlan,
  branding?: ClinicBranding,
): PatientTravelSummary | undefined {
  const services = [
    plan.transfers_included ? "Airport and clinic transfers" : undefined,
    plan.flight_included ? "Flight included" : undefined,
  ].filter((x): x is string => Boolean(x));
  if (!plan.hotel_snapshot && !plan.hotel_nights && !services.length) return undefined;
  return {
    hotel: plan.hotel_snapshot
      ? {
          name: plan.hotel_snapshot.name,
          room_type: plan.hotel_snapshot.room_type,
          board_type: plan.hotel_snapshot.board_type,
        }
      : undefined,
    nights: plan.hotel_nights || undefined,
    services,
  };
}
function normalizeSchedule(rows: TreatmentPlanPayment[], visits: number) {
  return rows.slice(0, Math.max(1, visits)).map((row, index) => ({
    ...row,
    label: index === 0 ? "1st Visit" : index === 1 ? "2nd Visit" : `${ordinal(index + 1)} Visit`,
  }));
}
function ordinal(value: number) {
  if (value === 1) return "1st";
  if (value === 2) return "2nd";
  if (value === 3) return "3rd";
  return `${value}th`;
}
function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function isDentalPlanData(value: unknown): value is DentalPlanData {
  return Boolean(
    value &&
    typeof value === "object" &&
    Array.isArray((value as DentalPlanData).proposedTreatments) &&
    (value as DentalPlanData).currentConditions &&
    typeof (value as DentalPlanData).currentConditions === "object",
  );
}
function svgLogoUrl(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("data:image/svg+xml") || /\.svg(?:[?#].*)?$/.test(normalized)
    ? value
    : undefined;
}
const EXPLANATIONS: Partial<Record<ToothTreatment, { what: string; context: string }>> = {
  implant: {
    what: "A dental implant replaces the root of a missing tooth and supports a fixed restoration.",
    context:
      "This treatment is included to replace missing tooth support and create a stable foundation for the planned restoration.",
  },
  crown: {
    what: "A crown is a strong tooth-coloured restoration placed over a prepared tooth.",
    context:
      "This treatment is included to protect and restore the selected teeth as part of your final result.",
  },
  root_canal: {
    what: "Root canal treatment removes infected or damaged tissue from inside a tooth.",
    context:
      "This treatment is included to help preserve an affected tooth before its planned restoration.",
  },
  extraction: {
    what: "An extraction removes a tooth that cannot be predictably retained.",
    context:
      "This treatment is included where a tooth cannot be predictably retained within the confirmed plan.",
  },
  veneer: {
    what: "A veneer is a thin tooth-coloured restoration fitted to the front surface of a tooth.",
    context:
      "This treatment is included to support the shape and appearance planned for your smile.",
  },
};
