import type { TreatmentType } from "../types/dental-plan.types";
export type TreatmentDefinition = {
  type: TreatmentType;
  label: string;
  short: string;
  color: string;
  supported: boolean;
  perTooth: boolean;
};
const definitions: Array<[TreatmentType, string, string, string, boolean, boolean]> = [
  ["extraction", "Extraction", "Ex", "#ef4444", true, true],
  ["dental-implant", "Dental Implant", "Im", "#4f46e5", true, true],
  ["implant-crown", "Implant Crown", "IC", "#7c3aed", true, true],
  ["zirconium-crown", "Zirconium Crown", "Zr", "#0284c7", true, true],
  ["emax-crown", "E-max Crown", "Em", "#0891b2", false, true],
  ["porcelain-crown", "Porcelain Crown", "PC", "#06b6d4", false, true],
  ["temporary-crown", "Temporary Crown", "TC", "#a3a3a3", false, true],
  ["bridge", "Bridge", "Br", "#0369a1", true, false],
  ["pontic", "Pontic", "Po", "#0369a1", true, true],
  ["composite-bonding", "Composite Bonding", "CB", "#84cc16", true, true],
  ["composite-filling", "Composite Filling", "CF", "#22c55e", true, true],
  ["root-canal-treatment", "Root Canal Treatment", "RCT", "#e11d48", true, true],
  ["veneer", "Veneer", "Vn", "#14b8a6", true, true],
  ["inlay-onlay", "Inlay / Onlay", "IO", "#eab308", false, true],
  ["whitening", "Whitening", "W", "#f5f5f5", false, true],
  ["sinus-lift", "Sinus Lift", "SL", "#f97316", false, true],
  ["bone-graft", "Bone Graft", "BG", "#a16207", false, true],
  ["all-on-4", "All-on-4", "A4", "#7c2d12", false, false],
  ["all-on-6", "All-on-6", "A6", "#7c2d12", false, false],
  ["denture", "Denture", "Dn", "#737373", false, false],
  ["other", "Other", "?", "#64748b", false, true],
];
export const TREATMENT_DEFINITIONS: TreatmentDefinition[] = definitions.map(
  ([type, label, short, color, supported, perTooth]) => ({
    type,
    label,
    short,
    color,
    supported,
    perTooth,
  }),
);
export const treatmentByType = (type: TreatmentType) =>
  TREATMENT_DEFINITIONS.find((item) => item.type === type)!;
