import type { DentalPlan, DentalPlannerCommercial } from "../types/dental-plan.types";
import { treatmentByType } from "../data/treatmentDefinitions";

type TreatmentDefault = {
  id?: string;
  treatmentKey: string;
  displayName: string;
  category?: string;
  prices: Partial<Record<DentalPlan["commercial"]["currency"], number>>;
};

export function syncPricingItems(
  plan: DentalPlan,
  defaults: TreatmentDefault[] = [],
): DentalPlannerCommercial["items"] {
  const grouped = new Map<string, DentalPlan["proposedTreatments"]>();
  for (const treatment of plan.proposedTreatments) {
    const key =
      treatment.treatmentDefinitionId ?? treatment.treatmentKey ?? treatment.treatmentType;
    grouped.set(key, [...(grouped.get(key) ?? []), treatment]);
  }

  return [...grouped.entries()].map(([key, treatments]) => {
    const treatment = treatments[0];
    const configured = defaults.find(
      (item) =>
        item.id === treatment.treatmentDefinitionId ||
        item.treatmentKey === treatment.treatmentKey ||
        item.treatmentKey === treatment.treatmentType,
    );
    const existing = plan.commercial.items.find(
      (item) =>
        item.treatmentId === key ||
        item.treatmentDefinitionId === treatment.treatmentDefinitionId ||
        item.treatmentKey === (treatment.treatmentKey ?? treatment.treatmentType) ||
        treatments.some((entry) => entry.id === item.treatmentId),
    );
    return {
      treatmentId: key,
      treatmentKey: treatment.treatmentKey ?? treatment.treatmentType,
      treatmentDefinitionId: treatment.treatmentDefinitionId,
      category: configured?.category,
      label:
        treatment.displayName ??
        configured?.displayName ??
        treatmentByType(treatment.treatmentType).label,
      qty: treatments.reduce((sum, entry) => sum + Math.max(1, entry.toothNumbers.length), 0),
      unitPrice: existing?.priceOverridden
        ? existing.unitPrice
        : (configured?.prices[plan.commercial.currency] ?? existing?.unitPrice ?? 0),
      priceOverridden: existing?.priceOverridden ?? false,
    };
  });
}

export function priceForTreatment(
  treatment: DentalPlan["proposedTreatments"][number],
  items: DentalPlannerCommercial["items"],
) {
  const key = treatment.treatmentDefinitionId ?? treatment.treatmentKey ?? treatment.treatmentType;
  return (
    items.find(
      (item) =>
        item.treatmentId === key ||
        item.treatmentDefinitionId === treatment.treatmentDefinitionId ||
        item.treatmentKey === (treatment.treatmentKey ?? treatment.treatmentType) ||
        item.treatmentId === treatment.id,
    )?.unitPrice ?? 0
  );
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
