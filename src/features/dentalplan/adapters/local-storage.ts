import { createDentalPlan } from "../core";
import type { DentalPlanData } from "../types";

export const DENTALPLAN_STORAGE_KEY = "smileabroad.dentalplan.dev.v1";

export const dentalPlanStorage = {
  load(): DentalPlanData | null {
    if (typeof window === "undefined") return null;
    try {
      const value = JSON.parse(window.localStorage.getItem(DENTALPLAN_STORAGE_KEY) ?? "null");
      if (!value || typeof value !== "object") return null;
      return {
        ...createDentalPlan(value),
        ...value,
        patientName: typeof value.patientName === "string" ? value.patientName : "",
        currency: ["EUR", "USD", "GBP", "TRY"].includes(value.currency) ? value.currency : "EUR",
        items: Array.isArray(value.items) ? value.items : [],
        stages: Array.isArray(value.stages) ? value.stages : [],
        notes: typeof value.notes === "string" ? value.notes : "",
      };
    } catch {
      return null;
    }
  },
  save(plan: DentalPlanData) {
    if (typeof window !== "undefined")
      window.localStorage.setItem(DENTALPLAN_STORAGE_KEY, JSON.stringify(plan));
  },
};
