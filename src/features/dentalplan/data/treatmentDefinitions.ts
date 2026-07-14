import type { TreatmentType } from "../types/dental-plan.types";
export type TreatmentDefinition = {
  type: TreatmentType;
  label: string;
  short: string;
  color: string;
  supported: boolean;
  perTooth: boolean;
  category: string;
};
export type TreatmentRole =
  "procedure" | "restoration" | "support-procedure" | "cosmetic" | "full-arch" | "global";
export type TreatmentTarget = "natural-tooth" | "implant-site" | "arch" | "tooth-site";
export type TreatmentRelationship = {
  role: TreatmentRole;
  target: TreatmentTarget;
  conflictsWith?: TreatmentType[];
  composition?: TreatmentType[];
  requiresContext?: "implant" | "posterior-maxilla";
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
export const TREATMENT_CATEGORY_BY_TYPE: Record<TreatmentType, string> = {
  "dental-implant": "Implant",
  "implant-crown": "Implant",
  "all-on-4": "Implant",
  "all-on-6": "Implant",
  extraction: "Surgical",
  "sinus-lift": "Surgical",
  "bone-graft": "Supporting",
  "zirconium-crown": "Restorative",
  "emax-crown": "Restorative",
  "porcelain-crown": "Restorative",
  "temporary-crown": "Restorative",
  bridge: "Restorative",
  pontic: "Restorative",
  "composite-filling": "Restorative",
  "inlay-onlay": "Restorative",
  "composite-bonding": "Cosmetic",
  veneer: "Cosmetic",
  whitening: "Cosmetic",
  "root-canal-treatment": "Endodontic",
  denture: "Other",
  other: "Other",
};
export const TREATMENT_CATEGORIES = [
  "Implant",
  "Restorative",
  "Cosmetic",
  "Endodontic",
  "Surgical",
  "Supporting",
  "Other",
] as const;
export const TREATMENT_DEFINITIONS: TreatmentDefinition[] = definitions.map(
  ([type, label, short, color, supported, perTooth]) => ({
    type,
    label,
    short,
    color,
    supported,
    perTooth,
    category: TREATMENT_CATEGORY_BY_TYPE[type],
  }),
);
export const treatmentByType = (type: TreatmentType) =>
  TREATMENT_DEFINITIONS.find((item) => item.type === type) ??
  TREATMENT_DEFINITIONS.find((item) => item.type === "other")!;

const CONVENTIONAL_CROWNS: TreatmentType[] = [
  "zirconium-crown",
  "emax-crown",
  "porcelain-crown",
  "temporary-crown",
];
const CONSERVATIVE_RESTORATIONS: TreatmentType[] = [
  "veneer",
  "composite-bonding",
  "composite-filling",
  "inlay-onlay",
];
const DEFAULT_RELATIONSHIP: TreatmentRelationship = {
  role: "procedure",
  target: "tooth-site",
};

export const TREATMENT_RELATIONSHIPS: Partial<Record<TreatmentType, TreatmentRelationship>> = {
  extraction: {
    role: "procedure",
    target: "natural-tooth",
    conflictsWith: [
      ...CONVENTIONAL_CROWNS,
      ...CONSERVATIVE_RESTORATIONS,
      "implant-crown",
      "root-canal-treatment",
    ],
  },
  "dental-implant": {
    role: "procedure",
    target: "implant-site",
    conflictsWith: [...CONVENTIONAL_CROWNS, ...CONSERVATIVE_RESTORATIONS, "root-canal-treatment"],
  },
  "implant-crown": {
    role: "restoration",
    target: "implant-site",
    composition: ["dental-implant", "implant-crown"],
    conflictsWith: [...CONVENTIONAL_CROWNS, ...CONSERVATIVE_RESTORATIONS],
  },
  ...Object.fromEntries(
    CONVENTIONAL_CROWNS.map((type) => [
      type,
      {
        role: "restoration" as const,
        target: "natural-tooth" as const,
        conflictsWith: ["implant-crown", "veneer", "composite-bonding"],
      },
    ]),
  ),
  veneer: {
    role: "cosmetic",
    target: "natural-tooth",
    conflictsWith: [...CONVENTIONAL_CROWNS, "implant-crown", "composite-bonding"],
  },
  "composite-bonding": {
    role: "cosmetic",
    target: "natural-tooth",
    conflictsWith: [...CONVENTIONAL_CROWNS, "implant-crown", "veneer"],
  },
  "composite-filling": {
    role: "restoration",
    target: "natural-tooth",
    conflictsWith: [...CONVENTIONAL_CROWNS, "implant-crown"],
  },
  "inlay-onlay": {
    role: "restoration",
    target: "natural-tooth",
    conflictsWith: [...CONVENTIONAL_CROWNS, "implant-crown"],
  },
  "root-canal-treatment": { role: "procedure", target: "natural-tooth" },
  bridge: { role: "restoration", target: "tooth-site" },
  pontic: { role: "restoration", target: "tooth-site" },
  whitening: { role: "global", target: "arch" },
  "bone-graft": {
    role: "support-procedure",
    target: "implant-site",
    requiresContext: "implant",
  },
  "sinus-lift": {
    role: "support-procedure",
    target: "implant-site",
    requiresContext: "posterior-maxilla",
  },
  "all-on-4": { role: "full-arch", target: "arch" },
  "all-on-6": { role: "full-arch", target: "arch" },
  denture: { role: "full-arch", target: "arch" },
};

export function treatmentRelationship(type: TreatmentType): TreatmentRelationship {
  return TREATMENT_RELATIONSHIPS[type] ?? DEFAULT_RELATIONSHIP;
}

export function treatmentComposition(type: TreatmentType): TreatmentType[] {
  return treatmentRelationship(type).composition ?? [type];
}

export function targetsNaturalTooth(type: TreatmentType) {
  return treatmentRelationship(type).target === "natural-tooth";
}

export function conflictsWithTreatment(candidate: TreatmentType, existing: TreatmentType) {
  const candidateConflicts = treatmentRelationship(candidate).conflictsWith ?? [];
  const existingConflicts = treatmentRelationship(existing).conflictsWith ?? [];
  return candidateConflicts.includes(existing) || existingConflicts.includes(candidate);
}

export function patientTreatmentCategory(type: TreatmentType): string {
  if (["dental-implant", "implant-crown"].includes(type)) return "Implant Treatment";
  if (
    [
      "zirconium-crown",
      "emax-crown",
      "porcelain-crown",
      "temporary-crown",
      "bridge",
      "pontic",
      "inlay-onlay",
    ].includes(type)
  )
    return "Restorative Treatment";
  if (["veneer", "composite-bonding", "whitening"].includes(type)) return "Cosmetic Treatment";
  if (["root-canal-treatment"].includes(type)) return "Endodontic Treatment";
  if (["extraction"].includes(type)) return "Surgical Procedures";
  if (["all-on-4", "all-on-6", "denture"].includes(type)) return "Full-Arch Treatment";
  return "Supporting Procedures";
}
