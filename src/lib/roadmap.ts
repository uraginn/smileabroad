import type { Roadmap, Assessment } from "@/types/models";
import { seedClinics } from "./mock/seed";
import {
  buildRoadmapTreatmentJourney,
  calculateRoadmapPriceRange,
  DEFAULT_ROADMAP_COUNTRY_PRICES,
  deriveAssessmentTreatmentEstimates,
  deriveRoadmapTiming,
} from "./roadmap-engine";

/** Deterministic mock roadmap generator. */
export function generateRoadmap(
  a: Assessment,
  patient_user_id: string,
  configuredPrices = DEFAULT_ROADMAP_COUNTRY_PRICES,
): Omit<Roadmap, "id" | "created_at" | "updated_at" | "created_by"> {
  const treatment = a.dental.treatment_interest;
  const estimates = deriveAssessmentTreatmentEstimates(a);
  const timing = deriveRoadmapTiming(estimates);
  const price = calculateRoadmapPriceRange({
    country: a.travel.destination_country,
    treatmentEstimates: estimates,
    configuredPrices: configuredPrices.filter((item) => !item.clinic_id),
  });

  const preferred = seedClinics
    .filter((c) => !a.travel.destination_country || a.travel.destination_country === c.country)
    .map((c) => c.id);
  const recommended = (preferred.length ? preferred : seedClinics.map((c) => c.id)).slice(0, 3);

  return {
    patient_user_id,
    assessment_id: a.id,
    summary: `Preliminary roadmap for ${treatment.toLowerCase()} based on the information currently available. This estimate is not a diagnosis.`,
    estimated_treatment: treatment,
    estimated_visits: timing.visits,
    healing_weeks: timing.healingWeeks,
    price_min: price.minimum,
    price_max: price.maximum,
    currency: price.currency,
    treatment_estimates: estimates,
    treatment_journey: buildRoadmapTreatmentJourney(estimates),
    timeline_summary: timing.timeline,
    stay_summary: timing.stay,
    missing_price_keys: price.missingPriceKeys,
    recommended_clinic_ids: recommended,
  };
}
