export { DentalPlanStudio } from "./components/DentalPlanStudio";
export { TreatmentPlanner } from "./components/TreatmentPlanner";
export {
  LocalStorageDentalPlanRepository,
  DENTALPLAN_STORAGE_KEY,
} from "./adapters/LocalStorageDentalPlanRepository";
export { createDentalPlan } from "./utils/createDentalPlan";
export { resolveToothVisualState } from "./utils/resolveToothVisualState";
export { UPPER_TEETH, LOWER_TEETH, ALL_TEETH } from "./utils/toothNumbers";
export { CONDITION_DEFINITIONS } from "./data/conditionDefinitions";
export { TREATMENT_DEFINITIONS } from "./data/treatmentDefinitions";
export { applyCondition, removeCondition } from "./rules/conditionRules";
export {
  evaluateTreatmentApplication,
  validateClinicalTreatment,
  validatePlanForFinalize,
} from "./rules/clinicalRules";
export { validateBridge } from "./rules/bridgeRules";
export type { DentalPlanRepository } from "./adapters/DentalPlanRepository";
export type {
  DentalPlan,
  DentalPlanData,
  DentalPlanStudioProps,
  ToothCondition,
  ToothNumber,
  ToothTreatment,
  ConditionType,
  TreatmentType,
  TreatmentLayer,
  TreatmentScope,
} from "./types/dental-plan.types";
