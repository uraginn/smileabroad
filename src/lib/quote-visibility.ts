// Phase 1 compatibility re-export. TreatmentPlan owns public document status.
export { PUBLIC_TREATMENT_PLAN_STATUSES as PUBLIC_QUOTE_STATUSES } from "@/lib/treatment-plan-status";
export { isTreatmentPlanPubliclyViewable as isQuotePubliclyViewable } from "@/lib/treatment-plan-status";
