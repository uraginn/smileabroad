import type { ConditionType } from "../types/dental-plan.types";
export type ConditionDefinition = {
  type: ConditionType;
  label: string;
  short: string;
  color: string;
  supported: boolean;
};
export const CONDITION_DEFINITIONS: ConditionDefinition[] = [
  ["healthy", "Healthy", "H", "#10b981", true],
  ["missing", "Missing Tooth", "M", "#94a3b8", true],
  ["extraction-required", "Extraction Required", "X", "#ef4444", true],
  ["existing-crown", "Existing Crown", "EC", "#f59e0b", true],
  ["existing-implant", "Existing Implant", "EI", "#6366f1", true],
  ["existing-bridge", "Existing Bridge", "EB", "#a855f7", false],
  ["existing-filling", "Existing Filling", "EF", "#0ea5e9", true],
  ["root-canal-treated", "Root Canal Treated", "RCT", "#dc2626", true],
  ["decay", "Decay / Caries", "D", "#78350f", true],
  ["fractured", "Fractured Tooth", "F", "#eab308", false],
  ["mobility", "Mobility", "Mo", "#f97316", false],
  ["impacted", "Impacted Tooth", "Im", "#7c3aed", false],
  ["periodontal-problem", "Gum / Periodontal", "P", "#be123c", false],
  ["other", "Other", "?", "#64748b", false],
].map(
  ([type, label, short, color, supported]) =>
    ({ type, label, short, color, supported }) as ConditionDefinition,
);
export const conditionByType = (type: ConditionType) =>
  CONDITION_DEFINITIONS.find((item) => item.type === type)!;
