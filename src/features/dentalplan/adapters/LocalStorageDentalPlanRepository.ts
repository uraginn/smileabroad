import type { DentalPlan } from "../types/dental-plan.types";
import { createDentalPlan } from "../utils/createDentalPlan";
import type { DentalPlanRepository } from "./DentalPlanRepository";
export const DENTALPLAN_STORAGE_KEY = "smileabroad.dentalplan.dev.v5";
const LEGACY_KEYS = [
  "smileabroad.dentalplan.dev.v4",
  "smileabroad.dentalplan.dev.v3",
  "smileabroad.dentalplan.dev.v2",
];
export class LocalStorageDentalPlanRepository implements DentalPlanRepository {
  constructor(
    private storageKey = DENTALPLAN_STORAGE_KEY,
    private enabled = true,
  ) {}
  getPlan(): DentalPlan | null {
    if (!this.enabled || typeof window === "undefined") return null;
    try {
      const currentRaw = window.localStorage.getItem(this.storageKey);
      const legacyEntry = LEGACY_KEYS.map((key) => ({
        key,
        value: window.localStorage.getItem(key),
      })).find((entry) => entry.value);
      const raw = currentRaw ?? legacyEntry?.value;
      if (!raw) return null;
      const value = JSON.parse(raw) as Partial<DentalPlan>;
      return createDentalPlan({
        ...value,
        currentConditions:
          value.currentConditions && typeof value.currentConditions === "object"
            ? value.currentConditions
            : {},
        proposedTreatments: Array.isArray(value.proposedTreatments) ? value.proposedTreatments : [],
        draftStep:
          legacyEntry?.key !== "smileabroad.dentalplan.dev.v4" &&
          !currentRaw &&
          (value.draftStep ?? 0) >= 3
            ? 4
            : value.draftStep,
      });
    } catch {
      return null;
    }
  }
  savePlan(plan: DentalPlan) {
    if (!this.enabled || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(plan));
    } catch (error) {
      if (import.meta.env.DEV) console.error("DentalPlan standalone persistence failed", error);
      throw new Error("The plan could not be saved because browser storage is full.", {
        cause: error,
      });
    }
  }
  deletePlan() {
    if (!this.enabled || typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(this.storageKey);
    } catch (error) {
      if (import.meta.env.DEV) console.error("DentalPlan standalone storage cleanup failed", error);
    }
  }
}
