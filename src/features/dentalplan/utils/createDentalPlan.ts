import type {
  DentalPlan,
  DentalPlanningPreferences,
  PlanningPreference,
  ToothCondition,
  ToothNumber,
  ToothTreatment,
} from "../types/dental-plan.types";
import {
  TREATMENT_DEFINITIONS,
  treatmentLayer,
  treatmentScope,
} from "../data/treatmentDefinitions";

const CURRENCIES = ["GBP", "EUR", "USD", "TRY"] as const;
const defaultPreference = (value: string): PlanningPreference => ({ mode: "automatic", value });

export function createDentalPlan(overrides: Partial<DentalPlan> = {}): DentalPlan {
  const now = new Date().toISOString();
  const importedAssessment = overrides.importedAssessment;
  const commercial = overrides.commercial;
  const legacyTravel = overrides.travel;
  const patient = overrides.patient;
  const dentistIds = [
    ...stringArray(patient?.dentistIds),
    ...(text(patient?.dentistId) ? [text(patient?.dentistId)] : []),
  ].filter((value, index, values) => values.indexOf(value) === index);
  const airportTransfer = !!(
    legacyTravel?.airportTransfer ||
    legacyTravel?.airportPickup ||
    legacyTravel?.airportDropoff
  );
  const hotelTransfer = !!legacyTravel?.localTransfer;
  const flightIncluded = !!legacyTravel?.flightIncluded;
  const includedServices = new Set(
    stringArray(legacyTravel?.includedServices).map((service) =>
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
    id: text(overrides.id) || crypto.randomUUID(),
    name: text(overrides.name) || "Untitled Plan",
    patientName: text(overrides.patientName),
    currentConditions: normalizeConditions(overrides.currentConditions),
    proposedTreatments: normalizeTreatments(overrides.proposedTreatments),
    treatmentGroups: Array.isArray(overrides.treatmentGroups)
      ? overrides.treatmentGroups.map((group, index) => ({
          ...group,
          id: text(group?.id) || `legacy-group-${index}`,
          type: group?.type ?? "implant-restoration",
          arch: group?.arch === "lower" ? "lower" : "upper",
          affectedTeeth: numberArray(group?.affectedTeeth) as ToothNumber[],
          generatedTreatmentIds: stringArray(group?.generatedTreatmentIds),
          abutments: numberArray(group?.abutments) as ToothNumber[],
          pontics: numberArray(group?.pontics) as ToothNumber[],
          implantPositions: numberArray(group?.implantPositions) as ToothNumber[],
        }))
      : [],
    patient: {
      ...(patient ?? {}),
      firstName: text(patient?.firstName),
      lastName: text(patient?.lastName),
      fullName: text(patient?.fullName) || text(overrides.patientName),
      dentistId: dentistIds[0],
      dentistIds,
      planTitle: text(patient?.planTitle) || text(overrides.name) || "Untitled Plan",
      preparationDate: validDate(patient?.preparationDate, now.slice(0, 10)),
      currency: currency(patient?.currency),
      uploadedFiles: Array.isArray(patient?.uploadedFiles)
        ? patient.uploadedFiles
            .filter((file) => file && typeof file === "object")
            .map((file) => ({ kind: text(file.kind), name: text(file.name) }))
            .filter((file) => file.kind || file.name)
        : [],
    },
    travel: {
      ...(legacyTravel ?? {}),
      visits: finite(legacyTravel?.visits, 1),
      healingWeeks: finite(legacyTravel?.healingWeeks),
      hotelRequired: !!legacyTravel?.hotelRequired,
      hotelIncluded: !!legacyTravel?.hotelIncluded,
      hotelNights: finite(legacyTravel?.hotelNights),
      airportTransfer,
      airportPickup: airportTransfer,
      airportDropoff: airportTransfer,
      localTransfer: hotelTransfer,
      flightIncluded,
      transferIncluded: airportTransfer || hotelTransfer,
      includedServices: [...includedServices],
      guarantees: stringArray(legacyTravel?.guarantees),
    },
    draftStep: Math.max(0, Math.min(4, finite(overrides.draftStep))),
    finalized: !!overrides.finalized,
    importedAssessment: {
      ...(importedAssessment ?? {}),
      medicalConditions: stringArray(importedAssessment?.medicalConditions),
      preferredCities: stringArray(importedAssessment?.preferredCities),
    },
    planningPreferences: normalizePreferences(overrides.planningPreferences),
    commercial: {
      ...(commercial ?? {}),
      currency: currency(commercial?.currency ?? patient?.currency),
      items: Array.isArray(commercial?.items)
        ? commercial.items.map((item, index) => ({
            ...item,
            treatmentId: text(item?.treatmentId) || `legacy-price-${index}`,
            label: text(item?.label) || "Treatment",
            qty: Math.max(0, finite(item?.qty, 1)),
            unitPrice: Math.max(0, finite(item?.unitPrice)),
            priceOverridden: !!item?.priceOverridden,
          }))
        : [],
      hotelTotal: Math.max(0, finite(commercial?.hotelTotal)),
      transferTotal: Math.max(0, finite(commercial?.transferTotal)),
      otherServiceTotal: Math.max(0, finite(commercial?.otherServiceTotal)),
      discountType: ["fixed", "percentage"].includes(commercial?.discountType ?? "")
        ? commercial!.discountType
        : "none",
      discountValue: Math.max(0, finite(commercial?.discountValue)),
      paymentSchedule: Array.isArray(commercial?.paymentSchedule)
        ? commercial.paymentSchedule.map((payment, index) => ({
            id: text(payment?.id) || `legacy-payment-${index}`,
            label: text(payment?.label) || `Visit ${index + 1}`,
            amount: Math.max(0, finite(payment?.amount)),
            due: text(payment?.due),
          }))
        : [],
    },
    createdAt: validDate(overrides.createdAt, now),
    updatedAt: validDate(overrides.updatedAt, now),
  };
}

function normalizeConditions(value: DentalPlan["currentConditions"] | undefined) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, condition]) => condition && typeof condition === "object")
      .map(([tooth, condition]) => [
        tooth,
        {
          ...condition,
          toothNumber: finite(condition?.toothNumber, Number(tooth)) as ToothNumber,
          conditions: stringArray(condition?.conditions) as ToothCondition["conditions"],
        } satisfies ToothCondition,
      ]),
  ) as DentalPlan["currentConditions"];
}

function normalizeTreatments(value: DentalPlan["proposedTreatments"] | undefined) {
  if (!Array.isArray(value)) return [];
  const expanded = value
    .filter((item) => item && typeof item === "object")
    .flatMap((item, index) => {
      const id = text(item.id) || `legacy-treatment-${index}`;
      const rawType = text(item.treatmentType);
      if (["implant_crown", "implant_and_crown", "implant+crown"].includes(rawType)) {
        const common = {
          ...item,
          toothNumbers: numberArray(item.toothNumbers) as ToothNumber[],
          treatmentDefinitionId: undefined,
        };
        return [
          {
            ...common,
            id,
            treatmentType: "dental-implant" as const,
            treatmentKey: "dental-implant",
            visualKey: "dental-implant" as const,
            displayName: "Dental Implant",
          },
          {
            ...common,
            id: `${id}-crown`,
            treatmentType: "zirconium-crown" as const,
            treatmentKey: "zirconium-crown",
            visualKey: "zirconium-crown" as const,
            displayName: "Zirconium Crown",
          },
        ];
      }
      const aliasedType =
        rawType === "all_on_4" ? "all-on-4" : rawType === "all_on_6" ? "all-on-6" : rawType;
      const supported = TREATMENT_DEFINITIONS.some((definition) => definition.type === aliasedType);
      return [
        {
          ...item,
          id,
          treatmentType: (supported ? aliasedType : "other") as ToothTreatment["treatmentType"],
          treatmentKey: text(item.treatmentKey) || (supported ? aliasedType : rawType || "other"),
          visualKey: supported ? (aliasedType as ToothTreatment["visualKey"]) : "other",
          toothNumbers: numberArray(item.toothNumbers) as ToothNumber[],
        },
      ];
    });
  const normalized = expanded.map((item) => {
    const type = item.treatmentType ?? "other";
    const legacyBridge =
      type === "bridge" && (!item.treatmentKey || item.treatmentKey === "bridge");
    const porcelainBridge = legacyBridge && item.material === "porcelain-metal";
    return {
      ...item,
      implantBrand:
        text(item.implantBrand) ||
        text((item as ToothTreatment & { implant_brand?: string }).implant_brand) ||
        undefined,
      treatmentType: type,
      treatmentDefinitionId: legacyBridge ? undefined : item.treatmentDefinitionId,
      treatmentKey: legacyBridge
        ? porcelainBridge
          ? "porcelain-bridge"
          : "zirconium-bridge"
        : item.treatmentKey,
      displayName: legacyBridge
        ? porcelainBridge
          ? "Porcelain Bridge"
          : "Zirconium Bridge"
        : item.displayName,
      visualKey: legacyBridge ? "bridge" : item.visualKey,
      layer: item.layer ?? treatmentLayer(type),
      scope: item.scope ?? treatmentScope(type),
      sequence: finite(item.sequence, legacyTreatmentSequence(type)),
      stage: item.stage ?? legacyTreatmentStage(type),
      material: item.material ?? (legacyBridge ? "zirconium" : legacyTreatmentMaterial(type)),
    } satisfies ToothTreatment;
  });
  return normalized.map((item) => {
    if (item.supportType) return item;
    const implantSupported =
      ["implant-abutment", "implant-crown"].includes(item.treatmentType) ||
      normalized.some(
        (candidate) =>
          candidate.treatmentType === "dental-implant" &&
          candidate.toothNumbers.some((tooth) => item.toothNumbers.includes(tooth)),
      );
    if (implantSupported && item.treatmentType.endsWith("crown"))
      return { ...item, supportType: "implant" as const };
    return item;
  });
}

function legacyTreatmentMaterial(type: ToothTreatment["treatmentType"]) {
  if (type === "zirconium-crown") return "zirconium" as const;
  if (type === "emax-crown") return "emax" as const;
  if (type === "porcelain-crown") return "porcelain-metal" as const;
  if (type === "temporary-crown") return "temporary" as const;
  return undefined;
}

function legacyTreatmentSequence(type: ToothTreatment["treatmentType"]) {
  if (["root-canal-treatment", "post-core", "composite-filling", "inlay-onlay"].includes(type))
    return 1;
  if (["extraction", "sinus-lift"].includes(type)) return 2;
  if (type === "bone-graft") return 3;
  if (["dental-implant", "all-on-4", "all-on-6"].includes(type)) return 4;
  if (["temporary-crown", "denture"].includes(type)) return 6;
  if (
    [
      "implant-abutment",
      "implant-crown",
      "zirconium-crown",
      "emax-crown",
      "porcelain-crown",
      "bridge",
      "pontic",
    ].includes(type)
  )
    return 7;
  if (["veneer", "composite-bonding", "whitening"].includes(type)) return 8;
  return 9;
}

function legacyTreatmentStage(type: ToothTreatment["treatmentType"]): ToothTreatment["stage"] {
  const stages: Record<number, NonNullable<ToothTreatment["stage"]>> = {
    1: "disease-control",
    2: "surgical-preparation",
    3: "grafting",
    4: "implant-placement",
    6: "temporary-restoration",
    7: "final-restoration",
    8: "cosmetic-finishing",
    9: "follow-up",
  };
  return stages[legacyTreatmentSequence(type)];
}

function normalizePreferences(
  value?: Partial<DentalPlanningPreferences>,
): DentalPlanningPreferences {
  return {
    visits: preference(value?.visits, "1"),
    visitDuration: preference(value?.visitDuration, "Suggested from selected treatments"),
    healingPeriod: preference(value?.healingPeriod, "No staged healing interval suggested"),
    estimatedStay: preference(value?.estimatedStay, "Confirm after clinical review"),
  };
}

function preference(value: PlanningPreference | undefined, fallback: string): PlanningPreference {
  if (!value || typeof value !== "object") return defaultPreference(fallback);
  return { mode: value.mode === "custom" ? "custom" : "automatic", value: text(value.value) };
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function finite(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : [];
}

function currency(value: unknown): DentalPlan["commercial"]["currency"] {
  return CURRENCIES.includes(value as (typeof CURRENCIES)[number])
    ? (value as DentalPlan["commercial"]["currency"])
    : "EUR";
}

function validDate(value: unknown, fallback: string) {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime()) ? value : fallback;
}
