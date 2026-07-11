import type { DentalPlan } from "../types/dental-plan.types";
export type DerivedPlanDefaults = {
  recommendedVisits: number;
  visitDurationSummary: string;
  healingPeriodSummary: string;
  estimatedStaySummary?: string;
  reasons: string[];
  warnings: string[];
};
const RESTORATIVE = new Set([
  "zirconium-crown",
  "emax-crown",
  "porcelain-crown",
  "temporary-crown",
  "veneer",
  "composite-bonding",
  "composite-filling",
  "root-canal-treatment",
  "whitening",
]);
export function derivePlanDefaults(plan: DentalPlan): DerivedPlanDefaults {
  const treatments = plan.proposedTreatments.map((item) => item.treatmentType);
  const allOn4 = plan.treatmentGroups.some((group) => group.type === "all-on-4");
  const implant =
    allOn4 || treatments.some((item) => ["dental-implant", "implant-crown"].includes(item));
  const graft = treatments.some((item) => ["bone-graft", "sinus-lift"].includes(item));
  const restorative = treatments.length > 0 && treatments.every((item) => RESTORATIVE.has(item));
  const reasons: string[] = [];
  const warnings: string[] = [];
  let recommendedVisits = 1,
    visitDurationSummary = "One clinical visit; scope-dependent stay",
    healingPeriodSummary = "No staged implant-healing interval suggested",
    estimatedStaySummary = "Approximately 3–7 days; confirm clinically";
  if (implant) {
    recommendedVisits = 2;
    visitDurationSummary = "Two staged visits: surgery, then final restoration";
    healingPeriodSummary = "Approximately 4–6 months between surgical and prosthetic stages";
    estimatedStaySummary = "Each visit duration should be confirmed by the clinic";
    reasons.push("Implant-related treatment requires staged surgical and restorative planning.");
  }
  if (graft) {
    recommendedVisits = Math.max(recommendedVisits, 2);
    healingPeriodSummary = "Extended staged healing may be required after grafting or sinus lift";
    warnings.push("Grafting and sinus-lift timing must be confirmed by the treating dentist.");
  }
  if (allOn4) {
    recommendedVisits = 2;
    visitDurationSummary =
      "Surgical/immediate provisional stage followed by final prosthetic stage";
    healingPeriodSummary = "Staged healing before the final prosthesis; confirm clinically";
    reasons.push("An All-on-4 linked group is present.");
  }
  if (restorative) reasons.push("The selected plan contains restorative/cosmetic procedures only.");
  const riskText = [
    ...plan.importedAssessment.medicalConditions,
    plan.importedAssessment.medications ?? "",
  ]
    .join(" ")
    .toLowerCase();
  const riskTerms = [
    "diabetes",
    "smok",
    "osteoporosis",
    "bisphosphonate",
    "immunosuppress",
    "cancer",
    "radiotherapy",
  ];
  if (plan.importedAssessment.smoking || riskTerms.some((term) => riskText.includes(term)))
    warnings.push(
      "Medical history may affect healing; timing requires clinician review rather than automatic calculation.",
    );
  return {
    recommendedVisits,
    visitDurationSummary,
    healingPeriodSummary,
    estimatedStaySummary,
    reasons,
    warnings,
  };
}
