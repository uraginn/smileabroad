import type { DentalPlan, ToothNumber, TreatmentType } from "../types/dental-plan.types";
import {
  getArch,
  isContiguousInArch,
  sameArch,
  UPPER_TEETH,
  LOWER_TEETH,
} from "../utils/toothNumbers";
export type DentalRuleResult = {
  allowed: boolean;
  severity: "block" | "warning";
  code: string;
  message: string;
  affectedTeeth?: number[];
  conflictingTreatmentIds?: string[];
};
const surfaceTreatments: TreatmentType[] = [
  "composite-bonding",
  "veneer",
  "composite-filling",
  "root-canal-treatment",
  "whitening",
];
const crowns: TreatmentType[] = [
  "zirconium-crown",
  "emax-crown",
  "porcelain-crown",
  "temporary-crown",
];
export const ALL_ON_4_PRESETS = {
  upper: { implantPositions: [15, 12, 22, 25] as ToothNumber[], prostheticRange: UPPER_TEETH },
  lower: { implantPositions: [45, 42, 32, 35] as ToothNumber[], prostheticRange: LOWER_TEETH },
};
export function validateClinicalTreatment(
  plan: DentalPlan,
  treatment: TreatmentType,
  teeth: ToothNumber[],
): DentalRuleResult[] {
  const results: DentalRuleResult[] = [];
  for (const tooth of teeth) {
    const current = plan.currentConditions[tooth]?.conditions ?? [];
    const existing = plan.proposedTreatments.filter((item) => item.toothNumbers.includes(tooth));
    const types = existing.map((item) => item.treatmentType);
    const missing = current.includes("missing");
    const extracted = current.includes("extraction-required") || types.includes("extraction");
    const implant = current.includes("existing-implant") || types.includes("dental-implant");
    if ((missing || extracted || implant) && surfaceTreatments.includes(treatment))
      results.push(
        block(
          "invalid_surface",
          `${treatment} cannot be applied to a missing, extracted or implant position.`,
          tooth,
        ),
      );
    if ((missing || extracted) && crowns.includes(treatment))
      results.push(
        block(
          "crown_without_tooth",
          "A conventional crown requires a retained natural tooth.",
          tooth,
        ),
      );
    if (
      implant &&
      [...surfaceTreatments, ...crowns].includes(treatment) &&
      treatment !== "implant-crown"
    )
      results.push(
        block(
          "implant_surface",
          "Use the implant-supported restoration workflow for this position.",
          tooth,
        ),
      );
    const conflict =
      (crowns.includes(treatment) &&
        types.some((type) => type === "veneer" || type === "composite-bonding")) ||
      ((treatment === "veneer" || treatment === "composite-bonding") &&
        types.some((type) => crowns.includes(type) || type === "implant-crown"));
    if (conflict)
      results.push({
        allowed: false,
        severity: "block",
        code: "replace_restoration",
        message:
          "The existing restoration conflicts with the selected treatment. Remove or replace it first.",
        affectedTeeth: [tooth],
        conflictingTreatmentIds: existing
          .filter(
            (item) =>
              crowns.includes(item.treatmentType) ||
              ["veneer", "composite-bonding", "implant-crown"].includes(item.treatmentType),
          )
          .map((item) => item.id),
      });
  }
  if (treatment === "bridge" && (!sameArch(teeth) || !isContiguousInArch(teeth)))
    results.push({
      allowed: false,
      severity: "block",
      code: "invalid_bridge",
      message: "A bridge requires contiguous positions in one arch.",
      affectedTeeth: teeth,
    });
  if (treatment === "bone-graft" && !hasImplantContext(plan, teeth))
    results.push(
      warning(
        "graft_context",
        "Bone graft normally requires an implant or extraction-site context.",
        teeth,
      ),
    );
  if (treatment === "sinus-lift") {
    if (!teeth.every((tooth) => [14, 15, 16, 17, 18, 24, 25, 26, 27, 28].includes(tooth)))
      results.push(
        warning("sinus_region", "Sinus lift is normally planned in the posterior maxilla.", teeth),
      );
    if (!hasImplantContext(plan, teeth))
      results.push(
        warning("sinus_context", "No implant context exists for this sinus-lift selection.", teeth),
      );
  }
  return results;
}
function hasImplantContext(plan: DentalPlan, teeth: ToothNumber[]) {
  return plan.proposedTreatments.some(
    (item) =>
      ["dental-implant", "implant-crown", "all-on-4", "all-on-6"].includes(item.treatmentType) &&
      item.toothNumbers.some((tooth) => teeth.includes(tooth)),
  );
}
const block = (code: string, message: string, tooth: number): DentalRuleResult => ({
  allowed: false,
  severity: "block",
  code,
  message,
  affectedTeeth: [tooth],
});
const warning = (code: string, message: string, teeth: number[]): DentalRuleResult => ({
  allowed: true,
  severity: "warning",
  code,
  message,
  affectedTeeth: teeth,
});
export const archForSelection = (teeth: ToothNumber[]) =>
  teeth.length ? getArch(teeth[0]) : "upper";
export function validatePlanForFinalize(plan: DentalPlan): string[] {
  const errors: string[] = [];
  const naturalOnly = new Set([
    "composite-bonding",
    "veneer",
    "composite-filling",
    "root-canal-treatment",
    "zirconium-crown",
    "emax-crown",
    "porcelain-crown",
    "temporary-crown",
  ]);
  for (const treatment of plan.proposedTreatments)
    for (const tooth of treatment.toothNumbers) {
      const current = plan.currentConditions[tooth]?.conditions ?? [];
      if (
        (current.includes("missing") || current.includes("extraction-required")) &&
        naturalOnly.has(treatment.treatmentType)
      )
        errors.push(
          `Tooth ${tooth}: ${treatment.treatmentType} conflicts with a missing or extraction-indicated position.`,
        );
    }
  const teeth = new Set(plan.proposedTreatments.flatMap((item) => item.toothNumbers));
  for (const tooth of teeth) {
    const types = new Set(
      plan.proposedTreatments
        .filter((item) => item.toothNumbers.includes(tooth))
        .map((item) => item.treatmentType),
    );
    const hasAny = (values: TreatmentType[]) => values.some((value) => types.has(value));
    const hasImplant = types.has("dental-implant") || types.has("implant-crown");
    if (hasImplant && hasAny([...surfaceTreatments, ...crowns]))
      errors.push(`Tooth ${tooth}: implant treatment conflicts with a natural-tooth restoration.`);
    if (types.has("extraction") && hasAny([...surfaceTreatments, ...crowns]))
      errors.push(`Tooth ${tooth}: extraction conflicts with a natural-tooth restoration.`);
    if (hasAny(crowns) && hasAny(["veneer", "composite-bonding"]))
      errors.push(`Tooth ${tooth}: crown conflicts with veneer or composite bonding.`);
    if (types.has("pontic") && hasAny(["composite-filling", "root-canal-treatment"]))
      errors.push(`Tooth ${tooth}: pontic conflicts with filling or root canal treatment.`);
  }
  for (const group of plan.treatmentGroups)
    if (
      group.generatedTreatmentIds.some(
        (id) => !plan.proposedTreatments.some((item) => item.id === id),
      )
    )
      errors.push(
        `${group.type} group ${group.id.slice(0, 8)} contains missing linked treatment items.`,
      );
  return [...new Set(errors)];
}
