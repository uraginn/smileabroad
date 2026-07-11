import type { DentalPlan } from "../types/dental-plan.types";
import { createDentalPlan } from "../utils/createDentalPlan";
import type { DentalPlanRepository } from "./DentalPlanRepository";
export const DENTALPLAN_STORAGE_KEY = "smileabroad.dentalplan.dev.v4";
const LEGACY_KEYS = ["smileabroad.dentalplan.dev.v3", "smileabroad.dentalplan.dev.v2"];
export class LocalStorageDentalPlanRepository implements DentalPlanRepository {
  constructor(private storageKey = DENTALPLAN_STORAGE_KEY) {}
  getPlan(): DentalPlan | null {
    if (typeof window === "undefined") return null;
    try {
      const currentRaw = window.localStorage.getItem(this.storageKey);
      const raw =
        currentRaw ?? LEGACY_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
      if (!raw) return null;
      const value = JSON.parse(raw) as Partial<DentalPlan>;
      return createDentalPlan({
        ...value,
        currentConditions:
          value.currentConditions && typeof value.currentConditions === "object"
            ? value.currentConditions
            : {},
        proposedTreatments: Array.isArray(value.proposedTreatments) ? value.proposedTreatments : [],
        draftStep: !currentRaw && (value.draftStep ?? 0) >= 3 ? 4 : value.draftStep,
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
