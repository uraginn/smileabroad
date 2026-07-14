import type { DentalPlan, ToothNumber, TreatmentType } from "../types/dental-plan.types";
import {
  getArch,
  isContiguousInArch,
  sameArch,
  UPPER_TEETH,
  LOWER_TEETH,
} from "../utils/toothNumbers";
import {
  conflictsWithTreatment,
  targetsNaturalTooth,
  treatmentComposition,
  treatmentRelationship,
} from "../data/treatmentDefinitions";
export type DentalRuleResult = {
  allowed: boolean;
  severity: "block" | "warning";
  code: string;
  message: string;
  affectedTeeth?: number[];
  conflictingTreatmentIds?: string[];
};
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
  const composition = treatmentComposition(treatment);
  const relationship = treatmentRelationship(treatment);
  for (const tooth of teeth) {
    const current = plan.currentConditions[tooth]?.conditions ?? [];
    const existing = plan.proposedTreatments.filter((item) => item.toothNumbers.includes(tooth));
    const types = existing.map((item) => item.treatmentType);
    const missing = current.includes("missing");
    const extracted = current.includes("extraction-required") || types.includes("extraction");
    const implant = current.includes("existing-implant") || types.includes("dental-implant");
    if ((missing || extracted || implant) && composition.some(targetsNaturalTooth))
      results.push(
        block("natural_tooth_required", "This treatment requires a retained natural tooth.", tooth),
      );
    if (
      composition.includes("dental-implant") &&
      !missing &&
      !extracted &&
      !implant &&
      current.length > 0
    )
      results.push(
        warning(
          "implant_site_context",
          "The selected position is not recorded as missing or extraction-indicated. Confirm the implant site clinically.",
          [tooth],
        ),
      );
    const conflictingTypes = types.filter((type) =>
      composition.some((candidate) => conflictsWithTreatment(candidate, type)),
    );
    if (conflictingTypes.length)
      results.push({
        allowed: false,
        severity: "block",
        code: "replace_restoration",
        message:
          "The existing restoration conflicts with the selected treatment. Remove or replace it first.",
        affectedTeeth: [tooth],
        conflictingTreatmentIds: existing
          .filter((item) => conflictingTypes.includes(item.treatmentType))
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
  if (relationship.requiresContext === "implant" && !hasImplantContext(plan, teeth))
    results.push(
      warning(
        "graft_context",
        "Bone graft normally requires an implant or extraction-site context.",
        teeth,
      ),
    );
  if (relationship.requiresContext === "posterior-maxilla") {
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
  for (const treatment of plan.proposedTreatments)
    for (const tooth of treatment.toothNumbers) {
      const current = plan.currentConditions[tooth]?.conditions ?? [];
      if (
        (current.includes("missing") || current.includes("extraction-required")) &&
        targetsNaturalTooth(treatment.treatmentType)
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
    const list = [...types];
    if (types.has("extraction") && list.some(targetsNaturalTooth))
      errors.push(`Tooth ${tooth}: extraction conflicts with a natural-tooth restoration.`);
    if (
      list.some((candidate, index) =>
        list.slice(index + 1).some((existing) => conflictsWithTreatment(candidate, existing)),
      )
    )
      errors.push(`Tooth ${tooth}: incompatible restorations are planned together.`);
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
