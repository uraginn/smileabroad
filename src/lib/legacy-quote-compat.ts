import type { TreatmentPlan, TreatmentPlanPriceItem } from "@/types/models";
import type { LegacyQuote } from "@/lib/mock/migrations/legacy-quote.types";
import {
  dedupeTreatmentPlanPriceItems,
  normalizePaymentSchedule,
} from "@/lib/treatment-plan-commercial";
import { mapQuoteStatusToTreatmentPlan } from "@/lib/treatment-plan-status";

// Migration-only adapter. Active runtime code must read TreatmentPlan directly.
export function mapLegacyQuoteToTreatmentPlanCommercials(
  quote: LegacyQuote,
): Partial<TreatmentPlan> {
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
  quote?: LegacyQuote,
): TreatmentPlan {
  if (!quote || quote.clinic_id !== plan.clinic_id || quote.treatment_plan_id !== plan.id)
    return plan;
  const commercial = mapLegacyQuoteToTreatmentPlanCommercials(quote);
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
