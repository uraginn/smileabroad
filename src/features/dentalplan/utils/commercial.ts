import type { DentalPlan, DentalPlannerCommercial } from "../types/dental-plan.types";
import { treatmentByType } from "../data/treatmentDefinitions";
export function syncPricingItems(plan: DentalPlan): DentalPlannerCommercial["items"] {
  return plan.proposedTreatments.map((treatment) => {
    const existing = plan.commercial.items.find((item) => item.treatmentId === treatment.id);
    return {
      treatmentId: treatment.id,
      label: `${treatmentByType(treatment.treatmentType).label} · ${treatment.toothNumbers.join(", ")}`,
      qty: Math.max(1, treatment.toothNumbers.length),
      unitPrice: existing?.unitPrice ?? 0,
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
