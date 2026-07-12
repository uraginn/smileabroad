import type {
  Assessment,
  Clinic,
  ClinicBranding,
  Patient,
  Quote,
  Roadmap,
  TreatmentPlan,
  TreatmentStage,
  TreatmentVisit,
  ToothTreatment,
} from "@/types/models";
import { calculateTreatmentPlanTotals } from "@/lib/treatment-plan-commercial";
import { mergeLegacyQuoteIntoTreatmentPlan } from "@/lib/legacy-quote-compat";

export interface CarePlanPricePresentation {
  currency: string;
  minimum?: number;
  maximum?: number;
  subtotal?: number;
  total?: number;
  hotel_total?: number;
  transfer_total?: number;
  discount?: number;
  items?: { label: string; quantity: number; unit_price: number; total: number }[];
  payment_schedule?: Quote["payment_schedule"];
  valid_until?: string;
}

export interface CarePlanClinicPresentation {
  name: string;
  city?: string;
  country?: string;
  logo_url?: string;
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

export interface PublicClinicPlanDetails {
  clinical_summary?: string;
  clinical_findings: string[];
  treatment_objectives: string[];
  patient_facing_notes?: string;
  alternatives: string[];
  risks: string[];
  exclusions: string[];
  materials: string[];
  implant_systems: string[];
  temporary_solution?: string;
  estimated_stay?: string;
  treatment_timeline?: string;
  treatment_stages: TreatmentStage[];
  visit_plan: TreatmentVisit[];
  procedures: {
    id: string;
    tooth: number;
    treatment: ToothTreatment;
    material?: string;
    patient_facing_note?: string;
  }[];
}

export interface PublicClinicQuoteDetails {
  included_services: string[];
  excluded_services: string[];
  patient_message?: string;
  hotel_information?: string;
  transfer_information?: string;
  guarantees: string[];
  terms?: string;
}

export interface ClinicCarePlanPresentation extends CarePlanPresentation {
  kind: "clinic_treatment_plan";
  plan: PublicClinicPlanDetails;
  quote: PublicClinicQuoteDetails;
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
      currency: roadmap.currency,
      minimum: roadmap.price_min,
      maximum: roadmap.price_max,
    },
    disclaimer:
      "This preliminary roadmap is based only on information provided in the assessment. It is not a diagnosis, treatment plan, or final quotation.",
  };
}

export function mapClinicQuoteCarePlan(input: {
  plan: TreatmentPlan;
  quote: Quote;
  clinic?: Clinic;
  branding?: ClinicBranding;
  patient?: Patient;
}): ClinicCarePlanPresentation {
  const { plan, quote, clinic, branding, patient } = input;
  return mapTreatmentPlanToPatientDocument(
    mergeLegacyQuoteIntoTreatmentPlan(plan, quote),
    clinic,
    patient,
    branding,
  );
}

export function mapTreatmentPlanToPatientDocument(
  plan: TreatmentPlan,
  clinic?: Clinic,
  patient?: Patient,
  branding?: ClinicBranding,
): ClinicCarePlanPresentation {
  const totals = calculateTreatmentPlanTotals(plan);
  return {
    kind: "clinic_treatment_plan",
    title: plan.title,
    summary: plan.clinical_summary || plan.summary,
    patient_name: patient ? `${patient.first_name} ${patient.last_name}`.trim() : undefined,
    treatment_overview: plan.summary,
    visit_information: `${plan.visits} planned visit${plan.visits === 1 ? "" : "s"}`,
    healing_information: `${plan.healing_weeks} planned healing week${plan.healing_weeks === 1 ? "" : "s"}`,
    price: {
      currency: plan.currency ?? "EUR",
      subtotal: totals.subtotal,
      total: totals.total,
      hotel_total: plan.hotel_total ?? 0,
      transfer_total: plan.transfer_total ?? 0,
      discount: totals.discount,
      items: (plan.price_items ?? []).map((item) => ({
        label: item.label,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      })),
      payment_schedule: plan.payment_schedule,
      valid_until: plan.valid_until,
    },
    clinic: clinic
      ? {
          name: clinic.name,
          city: clinic.city,
          country: clinic.country,
          logo_url: branding?.logo_url,
          phone: branding?.phone,
          email: branding?.email,
          website: branding?.website,
        }
      : undefined,
    plan: selectPatientFacingPlan(plan),
    quote: {
      included_services: plan.included_services ?? [],
      excluded_services: plan.excluded_services ?? [],
      patient_message: plan.patient_message,
      hotel_information: branding?.hotel_info,
      transfer_information: branding?.transfer_info,
      guarantees: branding?.guarantees ?? [],
      terms: branding?.terms,
    },
    disclaimer:
      "This clinic treatment plan and quotation are prepared by the selected clinic and remain subject to clinical confirmation and the clinic's terms.",
  };
}

export function selectPatientFacingPlan(plan: TreatmentPlan): PublicClinicPlanDetails {
  return {
    clinical_summary: plan.clinical_summary || plan.summary,
    clinical_findings: plan.clinical_findings ?? [],
    treatment_objectives: plan.treatment_objectives ?? [],
    patient_facing_notes: plan.patient_facing_notes,
    alternatives: plan.alternatives ?? [],
    risks: plan.risks ?? [],
    exclusions: plan.exclusions ?? [],
    materials: plan.materials ?? [],
    implant_systems: plan.implant_systems ?? [],
    temporary_solution: plan.temporary_solution,
    estimated_stay: plan.estimated_stay,
    treatment_timeline: plan.treatment_timeline,
    treatment_stages: plan.treatment_stages ?? [],
    visit_plan: plan.visit_plan ?? [],
    procedures: plan.items.map((item) => ({
      id: item.id,
      tooth: item.tooth,
      treatment: item.treatment,
      material: item.material,
      patient_facing_note: item.patient_facing_note,
    })),
  };
}
