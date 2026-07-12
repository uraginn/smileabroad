import type { ClinicTreatmentDefinition } from "@/types/models";

export const TREATMENT_CATEGORY_ORDER = [
  "Restorative",
  "Cosmetic",
  "Surgical",
  "Implant",
  "Prosthetic",
  "Endodontic",
  "Full Arch",
  "Supporting Procedures",
  "Other",
] as const;

export const HOTEL_CATEGORY_DEFAULTS = [
  "Bed & Breakfast",
  "All Inclusive",
  "Standard",
  "Premium",
  "Luxury",
  "Apartment",
  "Other",
] as const;

const SYSTEM_TREATMENT_CATEGORIES: Record<string, string> = {
  extraction: "Surgical",
  "dental-implant": "Implant",
  "implant-crown": "Implant",
  "zirconium-crown": "Prosthetic",
  "emax-crown": "Prosthetic",
  "porcelain-crown": "Prosthetic",
  "temporary-crown": "Prosthetic",
  bridge: "Prosthetic",
  pontic: "Prosthetic",
  "composite-bonding": "Cosmetic",
  "composite-filling": "Restorative",
  "root-canal-treatment": "Endodontic",
  veneer: "Cosmetic",
  "inlay-onlay": "Restorative",
  whitening: "Cosmetic",
  "sinus-lift": "Supporting Procedures",
  "bone-graft": "Supporting Procedures",
  "all-on-4": "Full Arch",
  "all-on-6": "Full Arch",
  denture: "Prosthetic",
  other: "Other",
};

export function normalizedTreatmentCategory(item: ClinicTreatmentDefinition) {
  if (!item.system && item.category && item.category !== "Custom") return item.category;
  return SYSTEM_TREATMENT_CATEGORIES[item.base_treatment_key || item.treatment_key] ?? "Other";
}

export function treatmentCategories(items: ClinicTreatmentDefinition[]) {
  return [...new Set([...TREATMENT_CATEGORY_ORDER, ...items.map(normalizedTreatmentCategory)])];
}
