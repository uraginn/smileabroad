import type { DentalPlan } from "../types/dental-plan.types";
export function createDentalPlan(overrides: Partial<DentalPlan> = {}): DentalPlan {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? "Untitled Plan",
    patientName: overrides.patientName ?? "",
    currentConditions: overrides.currentConditions ?? {},
    proposedTreatments: overrides.proposedTreatments ?? [],
    treatmentGroups: overrides.treatmentGroups ?? [],
    patient: overrides.patient ?? {
      fullName: overrides.patientName ?? "",
      planTitle: overrides.name ?? "Untitled Plan",
      preparationDate: now.slice(0, 10),
      currency: "EUR",
    },
    travel: overrides.travel ?? {
      visits: 1,
      healingWeeks: 0,
      hotelRequired: false,
      hotelNights: 0,
      airportTransfer: false,
      localTransfer: false,
      includedServices: [],
      guarantees: [],
    },
    draftStep: overrides.draftStep ?? 0,
    finalized: overrides.finalized ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}
