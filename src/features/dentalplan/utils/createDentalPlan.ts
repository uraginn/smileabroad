import type { DentalPlan } from "../types/dental-plan.types";
export function createDentalPlan(overrides: Partial<DentalPlan> = {}): DentalPlan {
  const now = new Date().toISOString();
  const importedAssessment = overrides.importedAssessment;
  const commercial = overrides.commercial;
  const legacyTravel = overrides.travel;
  const airportTransfer = !!(
    legacyTravel?.airportTransfer ||
    legacyTravel?.airportPickup ||
    legacyTravel?.airportDropoff
  );
  const hotelTransfer = !!legacyTravel?.localTransfer;
  const flightIncluded = !!legacyTravel?.flightIncluded;
  const includedServices = new Set(
    (Array.isArray(legacyTravel?.includedServices) ? legacyTravel.includedServices : []).map(
      (service) =>
        service === "Airport transfer"
          ? "Airport Transfer"
          : service === "Local clinic and hotel transfer"
            ? "Hotel Transfer"
            : service,
    ),
  );
  if (airportTransfer) includedServices.add("Airport Transfer");
  if (hotelTransfer) includedServices.add("Hotel Transfer");
  if (flightIncluded) includedServices.add("Flight Included");
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? "Untitled Plan",
    patientName: overrides.patientName ?? "",
    currentConditions:
      overrides.currentConditions && typeof overrides.currentConditions === "object"
        ? overrides.currentConditions
        : {},
    proposedTreatments: Array.isArray(overrides.proposedTreatments)
      ? overrides.proposedTreatments
      : [],
    treatmentGroups: Array.isArray(overrides.treatmentGroups) ? overrides.treatmentGroups : [],
    patient: {
      firstName: "",
      lastName: "",
      fullName: overrides.patientName ?? "",
      planTitle: overrides.name ?? "Untitled Plan",
      preparationDate: now.slice(0, 10),
      currency: "EUR",
      ...(overrides.patient ?? {}),
      uploadedFiles: Array.isArray(overrides.patient?.uploadedFiles)
        ? overrides.patient.uploadedFiles
        : [],
    },
    travel: {
      visits: 1,
      healingWeeks: 0,
      hotelRequired: false,
      hotelIncluded: false,
      hotelNights: 0,
      ...(overrides.travel ?? {}),
      airportTransfer,
      airportPickup: airportTransfer,
      airportDropoff: airportTransfer,
      localTransfer: hotelTransfer,
      flightIncluded,
      transferIncluded: airportTransfer || hotelTransfer,
      includedServices: [...includedServices],
      guarantees: Array.isArray(overrides.travel?.guarantees) ? overrides.travel.guarantees : [],
    },
    draftStep: overrides.draftStep ?? 0,
    finalized: overrides.finalized ?? false,
    importedAssessment: {
      ...importedAssessment,
      medicalConditions: Array.isArray(importedAssessment?.medicalConditions)
        ? importedAssessment.medicalConditions
        : [],
      preferredCities: Array.isArray(importedAssessment?.preferredCities)
        ? importedAssessment.preferredCities
        : [],
    },
    planningPreferences: {
      visits: { mode: "automatic", value: "1" },
      visitDuration: { mode: "automatic", value: "Suggested from selected treatments" },
      healingPeriod: { mode: "automatic", value: "No staged healing interval suggested" },
      estimatedStay: { mode: "automatic", value: "Confirm after clinical review" },
      ...(overrides.planningPreferences ?? {}),
    },
    commercial: {
      currency: commercial?.currency ?? overrides.patient?.currency ?? "EUR",
      items: Array.isArray(commercial?.items) ? commercial.items : [],
      hotelTotal: Math.max(0, commercial?.hotelTotal ?? 0),
      transferTotal: Math.max(0, commercial?.transferTotal ?? 0),
      otherServiceTotal: Math.max(0, commercial?.otherServiceTotal ?? 0),
      discountType: commercial?.discountType ?? "none",
      discountValue: Math.max(0, commercial?.discountValue ?? 0),
      paymentSchedule: Array.isArray(commercial?.paymentSchedule) ? commercial.paymentSchedule : [],
      validUntil: commercial?.validUntil,
      commercialNotes: commercial?.commercialNotes,
    },
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}
