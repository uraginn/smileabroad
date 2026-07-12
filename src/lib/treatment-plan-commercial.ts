import type { TreatmentPlan, TreatmentPlanPayment, TreatmentPlanPriceItem } from "@/types/models";

export function dedupeTreatmentPlanPriceItems(items: TreatmentPlanPriceItem[]) {
  const byId = new Map<string, TreatmentPlanPriceItem>();
  for (const item of items)
    byId.set(item.id, {
      ...item,
      quantity: finite(item.quantity),
      unit_price: finite(item.unit_price),
    });
  return [...byId.values()];
}

export function calculateTreatmentPlanTotals(
  plan: Pick<
    TreatmentPlan,
    | "price_items"
    | "hotel_total"
    | "transfer_total"
    | "optional_service_total"
    | "discount_type"
    | "discount_value"
    | "calculated_discount"
    | "payment_schedule"
  >,
) {
  const itemSubtotal = (plan.price_items ?? []).reduce(
    (sum, item) => sum + finite(item.quantity) * finite(item.unit_price),
    0,
  );
  const subtotal =
    itemSubtotal +
    finite(plan.hotel_total) +
    finite(plan.transfer_total) +
    finite(plan.optional_service_total);
  const requestedDiscount =
    plan.discount_type === "percentage"
      ? (subtotal * Math.min(100, finite(plan.discount_value))) / 100
      : plan.discount_type === "fixed"
        ? finite(plan.discount_value)
        : finite(plan.calculated_discount);
  const discount = Math.min(subtotal, Math.max(0, requestedDiscount));
  const total = Math.max(0, subtotal - discount);
  const paymentTotal = (plan.payment_schedule ?? []).reduce(
    (sum, payment) => sum + finite(payment.amount),
    0,
  );
  return {
    itemSubtotal,
    subtotal,
    discount,
    total,
    paymentTotal,
    paymentScheduleMatches: Math.abs(paymentTotal - total) < 0.01,
  };
}

export function normalizePaymentSchedule(value: TreatmentPlanPayment[] | undefined) {
  return Array.isArray(value)
    ? value.map((payment) => ({ ...payment, amount: finite(payment.amount) }))
    : [];
}

const finite = (value?: number) => (Number.isFinite(value) ? Math.max(0, Number(value)) : 0);
