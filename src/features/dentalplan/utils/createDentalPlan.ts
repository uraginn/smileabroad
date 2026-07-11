import type { DentalPlan } from "../types/dental-plan.types";
export function createDentalPlan(overrides: Partial<DentalPlan> = {}): DentalPlan {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? "Untitled Plan",
    patientName: overrides.patientName ?? "",
    currentConditions: overrides.currentConditions ?? {},
    proposedTreatments: overrides.proposedTreatments ?? [],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}
