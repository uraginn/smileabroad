import type {
  ConditionType,
  PlannerMode,
  ToothCondition,
  ToothNumber,
  ToothTreatment,
  TreatmentType,
} from "../types/dental-plan.types";
export type ResolvedVisualState = {
  toothNumber: ToothNumber;
  showBaseTooth: boolean;
  currentConditions: ConditionType[];
  proposedTreatments: TreatmentType[];
  bridgeRole?: "abutment-crown" | "pontic" | "implant-abutment";
  bridgeGroupId?: string;
};
export function resolveToothVisualState({
  toothNumber,
  currentConditions,
  proposedTreatments,
  mode,
}: {
  toothNumber: ToothNumber;
  currentConditions: Partial<Record<ToothNumber, ToothCondition>>;
  proposedTreatments: ToothTreatment[];
  mode: PlannerMode;
}): ResolvedVisualState {
  const current = currentConditions[toothNumber]?.conditions ?? [];
  const proposed = proposedTreatments.filter((item) => item.toothNumbers.includes(toothNumber));
  const proposedTypes = proposed.map((item) => item.visualKey ?? item.treatmentType);
  const willExtract =
    mode === "proposed" &&
    (current.includes("extraction-required") || proposedTypes.includes("extraction"));
  const bridge = proposed.find((item) => item.treatmentType === "bridge");
  const state: ResolvedVisualState = {
    toothNumber,
    showBaseTooth: !current.includes("missing") && !willExtract,
    currentConditions: current,
    proposedTreatments: mode === "proposed" ? proposedTypes : [],
  };
  if (bridge?.bridgeRoles?.[toothNumber]) {
    state.bridgeRole = bridge.bridgeRoles[toothNumber];
    state.bridgeGroupId = bridge.treatmentGroupId ?? bridge.id;
    if (state.bridgeRole === "pontic") state.showBaseTooth = false;
  }
  return state;
}
