import type {
  ClinicalTreatmentStage,
  DentalPlan,
  ToothNumber,
  TreatmentSupport,
  TreatmentType,
} from "../types/dental-plan.types";
import { getArch, sameArch, UPPER_TEETH, LOWER_TEETH } from "../utils/toothNumbers";
import {
  CROWN_TREATMENTS,
  conflictsWithTreatment,
  isCrownTreatment,
  targetsNaturalTooth,
  treatmentRelationship,
  treatmentLayer,
  treatmentScope,
} from "../data/treatmentDefinitions";

export type ClinicalRuleOutcome =
  | "allowed"
  | "allowed_with_warning"
  | "requires_dependency"
  | "conflict"
  | "replacement"
  | "suggestion";

export type DentalRuleResult = {
  allowed: boolean;
  severity: "block" | "warning";
  outcome: ClinicalRuleOutcome;
  code: string;
  message: string;
  affectedTeeth?: number[];
  conflictingTreatmentIds?: string[];
  requiredTreatments?: TreatmentType[];
  suggestedTreatments?: TreatmentType[];
};

export type TreatmentApplicationEvaluation = {
  status: "allowed" | "warning" | "blocked";
  layer: ReturnType<typeof treatmentLayer>;
  scope: ReturnType<typeof treatmentScope>;
  results: DentalRuleResult[];
  reason?: string;
  suggestedAction?: string;
};

export const ALL_ON_4_PRESETS = {
  upper: { implantPositions: [15, 12, 22, 25] as ToothNumber[], prostheticRange: UPPER_TEETH },
  lower: { implantPositions: [45, 42, 32, 35] as ToothNumber[], prostheticRange: LOWER_TEETH },
};
export const ALL_ON_6_PRESETS = {
  upper: {
    implantPositions: [16, 14, 12, 22, 24, 26] as ToothNumber[],
    prostheticRange: UPPER_TEETH,
  },
  lower: {
    implantPositions: [46, 44, 42, 32, 34, 36] as ToothNumber[],
    prostheticRange: LOWER_TEETH,
  },
};

const FINAL_CROWNS: TreatmentType[] = CROWN_TREATMENTS.filter((type) => type !== "temporary-crown");
const POSTERIOR_MAXILLA: ToothNumber[] = [14, 15, 16, 17, 18, 24, 25, 26, 27, 28];

export function validateClinicalTreatment(
  plan: DentalPlan,
  treatment: TreatmentType,
  teeth: ToothNumber[],
): DentalRuleResult[] {
  const results: DentalRuleResult[] = [];
  const relationship = treatmentRelationship(treatment);

  for (const tooth of teeth) {
    const current = plan.currentConditions[tooth]?.conditions ?? [];
    const existing = plan.proposedTreatments.filter((item) => item.toothNumbers.includes(tooth));
    const types = existing.map((item) => item.treatmentType);
    const missing = current.includes("missing");
    const extractionPlanned =
      current.includes("extraction-required") || types.includes("extraction");
    const implantContext = hasImplantAt(plan, tooth);

    if (treatment === "extraction" && missing) {
      results.push(
        block(
          "already_missing",
          `Tooth ${tooth} is already recorded as missing.`,
          tooth,
          "conflict",
        ),
      );
      continue;
    }

    if (isCrownTreatment(treatment)) {
      if ((missing || extractionPlanned) && !implantContext) {
        results.push({
          ...warning(
            "crown_support_required",
            `Tooth ${tooth}: this crown currently has no retained natural-tooth or implant support. Add the intended support before finalizing the plan.`,
            [tooth],
          ),
          outcome: "requires_dependency",
          requiredTreatments: ["dental-implant"],
        });
      }
    } else if ((missing || extractionPlanned) && targetsNaturalTooth(treatment)) {
      results.push(
        block(
          "natural_tooth_required",
          `Tooth ${tooth}: this treatment requires a retained natural tooth.`,
          tooth,
          "conflict",
        ),
      );
      continue;
    }

    if (treatment === "dental-implant" && !missing && !extractionPlanned && !implantContext)
      results.push(
        warning(
          "implant_site_context",
          `Tooth ${tooth} is not recorded as missing or extraction-indicated. Confirm the implant site clinically.`,
          [tooth],
        ),
      );

    if (["implant-abutment", "implant-crown"].includes(treatment) && !implantContext)
      results.push({
        ...block(
          "implant_component_requires_implant",
          `Tooth ${tooth}: ${treatment === "implant-abutment" ? "an abutment" : "an implant crown"} requires implant support.`,
          tooth,
          "requires_dependency",
        ),
        requiredTreatments: ["dental-implant"],
      });

    const conflictingTypes = types.filter((existingType) => {
      if (existingType === treatment) return false;
      if (isCrownTreatment(treatment) && existingType === "dental-implant") return false;
      if (treatment === "dental-implant" && isCrownTreatment(existingType)) return false;
      return conflictsWithTreatment(treatment, existingType);
    });
    if (conflictingTypes.length)
      results.push({
        allowed: false,
        severity: "block",
        outcome: "replacement",
        code: "replace_restoration",
        message: `Tooth ${tooth}: the selected treatment conflicts with an existing final restoration. Remove or replace that restoration first.`,
        affectedTeeth: [tooth],
        conflictingTreatmentIds: existing
          .filter((item) => conflictingTypes.includes(item.treatmentType))
          .map((item) => item.id),
      });

    if (
      treatment === "post-core" &&
      !types.includes("root-canal-treatment") &&
      !current.includes("root-canal-treated")
    )
      results.push(
        warning(
          "post_core_endodontic_context",
          `Tooth ${tooth}: confirm endodontic treatment before using a post and core.`,
          [tooth],
        ),
      );
  }

  if (treatment === "bridge" && teeth.length > 1 && !sameArch(teeth))
    results.push({
      allowed: false,
      severity: "block",
      outcome: "conflict",
      code: "invalid_bridge",
      message: "Bridge endpoints must belong to the same arch.",
      affectedTeeth: teeth,
    });

  if (relationship.requiresContext === "implant" && !hasImplantContext(plan, teeth))
    results.push(
      warning(
        "implant_context",
        treatment === "bone-graft"
          ? "Bone grafting is being added without an extraction or implant context. Confirm the intended site."
          : "This component requires an existing or proposed implant.",
        teeth,
      ),
    );

  if (relationship.requiresContext === "posterior-maxilla") {
    if (!teeth.every((tooth) => POSTERIOR_MAXILLA.includes(tooth)))
      results.push(
        warning("sinus_region", "Sinus lift is normally planned in the posterior maxilla.", teeth),
      );
    if (!hasImplantContext(plan, teeth))
      results.push(
        warning("sinus_context", "No implant context exists for this sinus-lift selection.", teeth),
      );
  }

  if (treatment === "dental-implant")
    results.push({
      allowed: true,
      severity: "warning",
      outcome: "suggestion",
      code: "implant_restoration_components",
      message:
        "The implant fixture was selected separately. Add an abutment and the preferred final crown when they are part of this case.",
      affectedTeeth: teeth,
      suggestedTreatments: ["implant-abutment", "zirconium-crown"],
    });

  return dedupeRuleResults(results);
}

export function evaluateTreatmentApplication({
  plan,
  treatment,
  selectedTeeth,
}: {
  plan: DentalPlan;
  treatment: TreatmentType;
  selectedTeeth: ToothNumber[];
}): TreatmentApplicationEvaluation {
  const validTeeth = new Set<ToothNumber>([...UPPER_TEETH, ...LOWER_TEETH]);
  if (!selectedTeeth.length)
    return {
      status: "blocked",
      layer: treatmentLayer(treatment),
      scope: treatmentScope(treatment),
      results: [],
      reason: "Select at least one valid tooth position.",
    };
  if (selectedTeeth.some((tooth) => !validTeeth.has(tooth)))
    return {
      status: "blocked",
      layer: treatmentLayer(treatment),
      scope: treatmentScope(treatment),
      results: [],
      reason: "The selection contains an invalid tooth position.",
    };
  const results = validateClinicalTreatment(plan, treatment, selectedTeeth);
  const blocked = results.find((result) => !result.allowed || result.severity === "block");
  const warnings = results.filter(
    (result) => result.severity === "warning" && result.outcome !== "suggestion",
  );
  const suggestions = results.filter((result) => result.outcome === "suggestion");
  return {
    status: blocked ? "blocked" : warnings.length ? "warning" : "allowed",
    layer: treatmentLayer(treatment),
    scope: treatmentScope(treatment),
    results,
    reason: blocked?.message ?? (warnings.map((result) => result.message).join(" ") || undefined),
    suggestedAction:
      suggestions.map((result) => result.message).join(" ") ||
      (warnings.flatMap((result) => result.requiredTreatments ?? []).length
        ? "Add or confirm the supporting treatment before final approval."
        : undefined),
  };
}

export function resolveTreatmentSupport(
  plan: DentalPlan,
  treatment: TreatmentType,
  tooth: ToothNumber,
): TreatmentSupport | undefined {
  if (["all-on-4", "all-on-6", "denture", "whitening"].includes(treatment)) return "arch";
  if (
    ["dental-implant", "implant-abutment", "implant-crown", "bone-graft", "sinus-lift"].includes(
      treatment,
    )
  )
    return treatment === "bone-graft" || treatment === "sinus-lift" ? "soft-tissue" : "implant";
  if (isCrownTreatment(treatment) && hasImplantAt(plan, tooth)) return "implant";
  if (treatmentRelationship(treatment).target === "natural-tooth" || isCrownTreatment(treatment))
    return "natural";
  return undefined;
}

export function defaultTreatmentSequence(treatment: TreatmentType) {
  const stages: Record<ClinicalTreatmentStage, TreatmentType[]> = {
    "disease-control": ["root-canal-treatment", "composite-filling", "inlay-onlay", "post-core"],
    "surgical-preparation": ["extraction", "sinus-lift"],
    grafting: ["bone-graft"],
    "implant-placement": ["dental-implant", "all-on-4", "all-on-6"],
    healing: [],
    "temporary-restoration": ["temporary-crown", "denture"],
    "final-restoration": [
      "implant-abutment",
      "implant-crown",
      "zirconium-crown",
      "emax-crown",
      "porcelain-crown",
      "bridge",
      "pontic",
    ],
    "cosmetic-finishing": ["veneer", "composite-bonding", "whitening"],
    "follow-up": ["other"],
  };
  const ordered = Object.entries(stages) as Array<[ClinicalTreatmentStage, TreatmentType[]]>;
  const index = ordered.findIndex(([, types]) => types.includes(treatment));
  return {
    stage: index >= 0 ? ordered[index][0] : ("follow-up" as ClinicalTreatmentStage),
    sequence: index >= 0 ? index + 1 : ordered.length,
  };
}

function hasImplantAt(plan: DentalPlan, tooth: ToothNumber) {
  return (
    (plan.currentConditions[tooth]?.conditions ?? []).includes("existing-implant") ||
    plan.proposedTreatments.some(
      (item) => item.treatmentType === "dental-implant" && item.toothNumbers.includes(tooth),
    )
  );
}

function hasImplantContext(plan: DentalPlan, teeth: ToothNumber[]) {
  return teeth.some(
    (tooth) =>
      hasImplantAt(plan, tooth) ||
      (plan.currentConditions[tooth]?.conditions ?? []).includes("extraction-required") ||
      plan.proposedTreatments.some(
        (item) => item.treatmentType === "extraction" && item.toothNumbers.includes(tooth),
      ),
  );
}

function block(
  code: string,
  message: string,
  tooth: number,
  outcome: ClinicalRuleOutcome,
): DentalRuleResult {
  return { allowed: false, severity: "block", outcome, code, message, affectedTeeth: [tooth] };
}

function warning(code: string, message: string, teeth: number[]): DentalRuleResult {
  return {
    allowed: true,
    severity: "warning",
    outcome: "allowed_with_warning",
    code,
    message,
    affectedTeeth: teeth,
  };
}

function dedupeRuleResults(results: DentalRuleResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.code}:${result.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const archForSelection = (teeth: ToothNumber[]) =>
  teeth.length ? getArch(teeth[0]) : "upper";

export function validatePlanForFinalize(plan: DentalPlan): string[] {
  const errors: string[] = [];
  const teeth = new Set(plan.proposedTreatments.flatMap((item) => item.toothNumbers));

  for (const tooth of teeth) {
    const current = plan.currentConditions[tooth]?.conditions ?? [];
    const items = plan.proposedTreatments.filter((item) => item.toothNumbers.includes(tooth));
    const types = items.map((item) => item.treatmentType);
    const implantContext = hasImplantAt(plan, tooth);

    for (const item of items) {
      if (
        item.treatmentType !== "extraction" &&
        (current.includes("missing") || types.includes("extraction")) &&
        targetsNaturalTooth(item.treatmentType)
      )
        errors.push(
          `Tooth ${tooth}: ${item.displayName ?? item.treatmentType} requires a retained natural tooth.`,
        );
      if (
        isCrownTreatment(item.treatmentType) &&
        (current.includes("missing") || types.includes("extraction")) &&
        !implantContext
      )
        errors.push(`Tooth ${tooth}: the planned crown has no natural-tooth or implant support.`);
      if (["implant-abutment", "implant-crown"].includes(item.treatmentType) && !implantContext)
        errors.push(
          `Tooth ${tooth}: ${item.displayName ?? item.treatmentType} requires implant support.`,
        );
    }

    const finalCrowns = types.filter(
      (type) => FINAL_CROWNS.includes(type) || type === "implant-crown",
    );
    if (new Set(finalCrowns).size > 1)
      errors.push(`Tooth ${tooth}: more than one final crown is planned.`);
    if (types.includes("veneer") && types.some((type) => isCrownTreatment(type)))
      errors.push(`Tooth ${tooth}: veneer and crown cannot both be final restorations.`);
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
