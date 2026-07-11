import type { DentalPlan } from "../types/dental-plan.types";
import { createDentalPlan } from "../utils/createDentalPlan";
import type { DentalPlanRepository } from "./DentalPlanRepository";
export const DENTALPLAN_STORAGE_KEY = "smileabroad.dentalplan.dev.v2";
export class LocalStorageDentalPlanRepository implements DentalPlanRepository {
  constructor(private storageKey = DENTALPLAN_STORAGE_KEY) {}
  getPlan(): DentalPlan | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const value = JSON.parse(raw) as Partial<DentalPlan>;
      return createDentalPlan({
        ...value,
        currentConditions:
          value.currentConditions && typeof value.currentConditions === "object"
            ? value.currentConditions
            : {},
        proposedTreatments: Array.isArray(value.proposedTreatments) ? value.proposedTreatments : [],
      });
    } catch {
      return null;
    }
  }
  savePlan(plan: DentalPlan) {
    if (typeof window !== "undefined")
      window.localStorage.setItem(this.storageKey, JSON.stringify(plan));
  }
  deletePlan() {
    if (typeof window !== "undefined") window.localStorage.removeItem(this.storageKey);
  }
}
