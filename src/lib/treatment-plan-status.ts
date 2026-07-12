import type { TreatmentPlanStatus } from "@/types/models";
import type { LegacyQuoteStatus } from "@/lib/mock/migrations/legacy-quote.types";

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

export function mapQuoteStatusToTreatmentPlan(status?: LegacyQuoteStatus): TreatmentPlanStatus {
  return normalizeTreatmentPlanStatus(status);
}

export function isTreatmentPlanPubliclyViewable(status?: TreatmentPlanStatus): boolean {
  return PUBLIC_TREATMENT_PLAN_STATUSES.includes(
    normalizeTreatmentPlanStatus(status) as (typeof PUBLIC_TREATMENT_PLAN_STATUSES)[number],
  );
}

const TRANSITIONS: Record<TreatmentPlanStatus, readonly TreatmentPlanStatus[]> = {
  draft: ["doctor_review"],
  doctor_review: ["draft", "approved"],
  approved: ["draft", "sent"],
  sent: ["draft", "viewed", "expired"],
  viewed: ["draft", "accepted", "declined", "expired"],
  accepted: ["expired"],
  declined: ["draft"],
  expired: ["draft"],
};

export function canTransitionTreatmentPlanStatus(
  from: TreatmentPlanStatus | undefined,
  to: TreatmentPlanStatus,
) {
  const current = normalizeTreatmentPlanStatus(from);
  return current === to || TRANSITIONS[current].includes(to);
}
