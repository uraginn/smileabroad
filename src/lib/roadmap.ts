import type { Roadmap, Assessment } from "@/types/models";
import { seedClinics } from "./mock/seed";

/** Deterministic mock roadmap generator. */
export function generateRoadmap(a: Assessment, patient_user_id: string): Omit<Roadmap, "id" | "created_at" | "updated_at" | "created_by"> {
  const treatment = a.dental.treatment_interest;
  const t = treatment.toLowerCase();
  let estimated_treatment = treatment;
  let visits = 2;
  let healing = 8;
  let min = 800;
  let max = 1500;

  if (t.includes("all-on") || t.includes("full mouth")) {
    estimated_treatment = "Full mouth rehabilitation with implants";
    visits = 2; healing = 12; min = 8000; max = 14000;
  } else if (t.includes("implant")) {
    estimated_treatment = "Dental implant + crown"; visits = 2; healing = 12; min = 900; max = 1800;
  } else if (t.includes("veneer")) {
    estimated_treatment = "Porcelain veneers"; visits = 1; healing = 2; min = 3500; max = 6500;
  } else if (t.includes("crown")) {
    estimated_treatment = "Ceramic crowns"; visits = 1; healing = 2; min = 300; max = 600;
  } else if (t.includes("whitening")) {
    estimated_treatment = "Professional whitening"; visits = 1; healing = 0; min = 250; max = 450;
  } else if (t.includes("root canal")) {
    estimated_treatment = "Root canal treatment"; visits = 1; healing = 1; min = 200; max = 400;
  }

  const preferred = seedClinics
    .filter((c) => !a.travel.destination_country || a.travel.destination_country === c.country)
    .map((c) => c.id);
  const recommended = (preferred.length ? preferred : seedClinics.map((c) => c.id)).slice(0, 3);

  return {
    patient_user_id,
    assessment_id: a.id,
    summary: `Preliminary plan for ${estimated_treatment.toLowerCase()} based on your assessment. This estimate is not a diagnosis.`,
    estimated_treatment,
    estimated_visits: visits,
    healing_weeks: healing,
    price_min: min,
    price_max: max,
    currency: "EUR",
    recommended_clinic_ids: recommended,
  };
}
