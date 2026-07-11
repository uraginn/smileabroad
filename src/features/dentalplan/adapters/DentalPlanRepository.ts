import type { DentalPlan } from "../types/dental-plan.types";
export interface DentalPlanRepository {
  getPlan(): DentalPlan | null;
  savePlan(plan: DentalPlan): void;
  deletePlan(): void;
}
