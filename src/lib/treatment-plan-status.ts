import type { QuoteStatus, TreatmentPlanStatus } from "@/types/models";

export const PUBLIC_TREATMENT_PLAN_STATUSES = ["approved", "sent", "viewed", "accepted"] as const;

export function normalizeTreatmentPlanStatus(status?: string): TreatmentPlanStatus {
  if (status === "awaiting_doctor_review") return "doctor_review";
  if (status === "sent_to_patient") return "sent";
  if (status === "archived") return "expired";
  if (
    ["doctor_review", "approved", "sent", "viewed", "accepted", "declined", "expired"].includes(
      status ?? "",
    )
  )
    return status as TreatmentPlanStatus;
  return "draft";
}

export function mapQuoteStatusToTreatmentPlan(status?: QuoteStatus): TreatmentPlanStatus {
  return normalizeTreatmentPlanStatus(status);
}

export function isTreatmentPlanPubliclyViewable(
  status?: TreatmentPlanStatus | QuoteStatus,
): boolean {
  return PUBLIC_TREATMENT_PLAN_STATUSES.includes(
    normalizeTreatmentPlanStatus(status) as (typeof PUBLIC_TREATMENT_PLAN_STATUSES)[number],
  );
}
