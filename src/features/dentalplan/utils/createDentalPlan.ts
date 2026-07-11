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
    patient: {
      firstName: "",
      lastName: "",
      uploadedFiles: [],
      fullName: overrides.patientName ?? "",
      planTitle: overrides.name ?? "Untitled Plan",
      preparationDate: now.slice(0, 10),
      currency: "EUR",
      ...(overrides.patient ?? {}),
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
    importedAssessment: overrides.importedAssessment ?? {
      medicalConditions: [],
      preferredCities: [],
    },
    planningPreferences: overrides.planningPreferences ?? {
      visits: { mode: "automatic", value: "1" },
      visitDuration: { mode: "automatic", value: "Suggested from selected treatments" },
      healingPeriod: { mode: "automatic", value: "No staged healing interval suggested" },
      estimatedStay: { mode: "automatic", value: "Confirm after clinical review" },
    },
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}
