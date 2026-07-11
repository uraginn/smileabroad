import type {
  ConditionType,
  ToothCondition,
  ToothNumber,
  ToothTreatment,
  TreatmentType,
} from "../types/dental-plan.types";
export type ValidationResult = { ok: true } | { ok: false; message: string };
const hasCondition = (
  conditions: Partial<Record<ToothNumber, ToothCondition>>,
  tooth: ToothNumber,
  condition: ConditionType,
) => conditions[tooth]?.conditions.includes(condition) ?? false;
function isMissingOrExtracted(
  conditions: Partial<Record<ToothNumber, ToothCondition>>,
  treatments: ToothTreatment[],
  tooth: ToothNumber,
) {
  return (
    hasCondition(conditions, tooth, "missing") ||
    hasCondition(conditions, tooth, "extraction-required") ||
    treatments.some(
      (item) => item.treatmentType === "extraction" && item.toothNumbers.includes(tooth),
    )
  );
}
function hasImplant(
  conditions: Partial<Record<ToothNumber, ToothCondition>>,
  treatments: ToothTreatment[],
  tooth: ToothNumber,
) {
  return (
    hasCondition(conditions, tooth, "existing-implant") ||
    treatments.some(
      (item) => item.treatmentType === "dental-implant" && item.toothNumbers.includes(tooth),
    )
  );
}
export function validateTreatment(
  treatment: TreatmentType,
  tooth: ToothNumber,
  conditions: Partial<Record<ToothNumber, ToothCondition>>,
  treatments: ToothTreatment[],
): ValidationResult {
  const missing = isMissingOrExtracted(conditions, treatments, tooth);
  if (
    [
      "veneer",
      "composite-filling",
      "composite-bonding",
      "inlay-onlay",
      "root-canal-treatment",
    ].includes(treatment) &&
    missing
  )
    return {
      ok: false,
      message: `Cannot apply ${treatment} to tooth ${tooth}: the tooth is missing or planned for extraction.`,
    };
  if (treatment === "extraction" && hasCondition(conditions, tooth, "missing"))
    return { ok: false, message: `Tooth ${tooth} is already missing — extraction not applicable.` };
  if (treatment === "implant-crown" && !hasImplant(conditions, treatments, tooth))
    return {
      ok: false,
      message: `Implant Crown on tooth ${tooth} requires an existing or proposed implant.`,
    };
  return { ok: true };
}
