import type { DentalPlan, DentalPlannerCommercial } from "../types/dental-plan.types";
import { treatmentByType } from "../data/treatmentDefinitions";
export function syncPricingItems(
  plan: DentalPlan,
  defaults: Array<{
    id?: string;
    treatmentKey: string;
    displayName: string;
    prices: Partial<Record<DentalPlan["commercial"]["currency"], number>>;
  }> = [],
): DentalPlannerCommercial["items"] {
  return plan.proposedTreatments.map((treatment) => {
    const existing = plan.commercial.items.find((item) => item.treatmentId === treatment.id);
    const configured = defaults.find(
      (item) =>
        item.id === treatment.treatmentDefinitionId ||
        item.treatmentKey === treatment.treatmentKey ||
        item.treatmentKey === treatment.treatmentType,
    );
    return {
      treatmentId: treatment.id,
      label: `${treatment.displayName ?? configured?.displayName ?? treatmentByType(treatment.treatmentType).label} · ${treatment.toothNumbers.join(", ")}`,
      qty: Math.max(1, treatment.toothNumbers.length),
      unitPrice: existing?.priceOverridden
        ? existing.unitPrice
        : (configured?.prices[plan.commercial.currency] ?? existing?.unitPrice ?? 0),
      priceOverridden: existing?.priceOverridden ?? false,
    };
  });
}
export function calculateCommercial(commercial: DentalPlannerCommercial) {
  const subtotal = commercial.items.reduce(
    (sum, item) => sum + Math.max(0, item.qty) * Math.max(0, item.unitPrice),
    0,
  );
  const beforeDiscount =
    subtotal +
    Math.max(0, commercial.hotelTotal) +
    Math.max(0, commercial.transferTotal) +
    Math.max(0, commercial.otherServiceTotal);
  const raw =
    commercial.discountType === "percentage"
      ? (beforeDiscount * Math.min(100, Math.max(0, commercial.discountValue))) / 100
      : commercial.discountType === "fixed"
        ? Math.max(0, commercial.discountValue)
        : 0;
  const discount = Math.min(beforeDiscount, raw);
  return { subtotal, discount, total: Math.max(0, beforeDiscount - discount) };
}
