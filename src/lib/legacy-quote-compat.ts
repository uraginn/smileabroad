import type { Quote, TreatmentPlan, TreatmentPlanPriceItem } from "@/types/models";
import {
  calculateTreatmentPlanTotals,
  dedupeTreatmentPlanPriceItems,
  normalizePaymentSchedule,
} from "@/lib/treatment-plan-commercial";
import { mapQuoteStatusToTreatmentPlan } from "@/lib/treatment-plan-status";

export function getLegacyQuoteForTreatmentPlan(quotes: Quote[], planId: string, clinicId?: string) {
  return quotes.find(
    (quote) => quote.treatment_plan_id === planId && (!clinicId || quote.clinic_id === clinicId),
  );
}

export function mapTreatmentPlanToLegacyQuote(plan: TreatmentPlan): Quote {
  const totals = calculateTreatmentPlanTotals(plan);
  const compatibleStatus = [
    "approved",
    "sent",
    "viewed",
    "accepted",
    "declined",
    "expired",
  ].includes(plan.status ?? "")
    ? (plan.status as Quote["status"])
    : "draft";
  return {
    id: plan.legacy_quote_id ?? `compat_${plan.id}`,
    clinic_id: plan.clinic_id,
    patient_user_id: plan.patient_user_id,
    clinic_patient_id: plan.clinic_patient_id,
    treatment_plan_id: plan.id,
    currency: plan.currency ?? "EUR",
    items: (plan.price_items ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      qty: item.quantity,
      unit_price: item.unit_price,
    })),
    hotel_total: plan.hotel_total ?? 0,
    transfer_total: plan.transfer_total ?? 0,
    discount: totals.discount,
    payment_schedule: plan.payment_schedule ?? [],
    valid_until: plan.valid_until,
    included_services: plan.included_services ?? [],
    excluded_services: plan.excluded_services ?? [],
    patient_message: plan.patient_message,
    status: compatibleStatus,
    share_token: plan.share_token,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
    created_by: plan.created_by,
  };
}

export function mapLegacyQuoteToTreatmentPlanCommercials(quote: Quote): Partial<TreatmentPlan> {
  const priceItems: TreatmentPlanPriceItem[] = (quote.items ?? []).map((item) => ({
    id: item.id,
    label: item.label,
    quantity: item.qty,
    unit_price: item.unit_price,
  }));
  return {
    currency: quote.currency,
    price_items: dedupeTreatmentPlanPriceItems(priceItems),
    hotel_total: quote.hotel_total ?? 0,
    transfer_total: quote.transfer_total ?? 0,
    optional_service_total: 0,
    discount_type: (quote.discount ?? 0) > 0 ? "fixed" : "none",
    discount_value: quote.discount ?? 0,
    calculated_discount: quote.discount ?? 0,
    payment_schedule: normalizePaymentSchedule(quote.payment_schedule),
    valid_until: quote.valid_until,
    included_services: quote.included_services ?? [],
    excluded_services: quote.excluded_services ?? [],
    patient_message: quote.patient_message ?? quote.notes,
    ...(quote.status ? { status: mapQuoteStatusToTreatmentPlan(quote.status) } : {}),
    share_token: quote.share_token,
    shared_at: ["sent", "viewed", "accepted"].includes(quote.status ?? "")
      ? quote.updated_at
      : undefined,
    viewed_at: ["viewed", "accepted"].includes(quote.status ?? "") ? quote.updated_at : undefined,
    accepted_at: quote.status === "accepted" ? quote.updated_at : undefined,
    declined_at: quote.status === "declined" ? quote.updated_at : undefined,
    legacy_quote_id: quote.id,
  };
}

export function mergeLegacyQuoteIntoTreatmentPlan(
  plan: TreatmentPlan,
  quote?: Quote,
): TreatmentPlan {
  if (!quote || quote.clinic_id !== plan.clinic_id) return plan;
  const commercial = mapLegacyQuoteToTreatmentPlanCommercials(quote);
  // Quote wins for historical commercial/share data; clinical content always remains on TreatmentPlan.
  // Travel/services use the newest record when updated_at is reliable.
  const quoteIsNewer = +new Date(quote.updated_at) >= +new Date(plan.updated_at);
  return {
    ...plan,
    ...commercial,
    included_services: quoteIsNewer
      ? commercial.included_services
      : (plan.included_services ?? commercial.included_services),
    excluded_services: quoteIsNewer
      ? commercial.excluded_services
      : (plan.excluded_services ?? commercial.excluded_services),
    share_token: quote.share_token ?? plan.share_token,
    clinical_summary: plan.clinical_summary,
    clinical_findings: plan.clinical_findings,
    treatment_objectives: plan.treatment_objectives,
    internal_clinical_notes: plan.internal_clinical_notes,
  };
}
