import type { TreatmentLayer, TreatmentScope, TreatmentType } from "../types/dental-plan.types";
export type TreatmentDefinition = {
  type: TreatmentType;
  label: string;
  short: string;
  color: string;
  supported: boolean;
  perTooth: boolean;
  category: string;
};
export type TreatmentRole = TreatmentLayer;
export type TreatmentTarget = "natural-tooth" | "implant-site" | "arch" | "tooth-site";
export type TreatmentRelationship = {
  role: TreatmentRole;
  target: TreatmentTarget;
  scope: TreatmentScope;
  conflictsWith?: TreatmentType[];
  composition?: TreatmentType[];
  requiresContext?: "implant" | "posterior-maxilla";
};
const definitions: Array<[TreatmentType, string, string, string, boolean, boolean]> = [
  ["extraction", "Extraction", "Ex", "#ef4444", true, true],
  ["dental-implant", "Dental Implant", "Im", "#4f46e5", true, true],
  ["implant-abutment", "Implant Abutment", "Ab", "#6366f1", true, true],
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
  ["post-core", "Post and Core", "PC", "#be123c", true, true],
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
  "implant-abutment": "Implant",
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
  "post-core": "Endodontic",
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
export const BRIDGE_SYSTEM_DEFINITIONS = [
  {
    treatmentKey: "zirconium-bridge",
    displayName: "Zirconium Bridge",
    patientDescription:
      "A fixed zirconium bridge replacing or restoring teeth across the planned span.",
    baseTreatmentKey: "bridge" as const,
    visualKey: "bridge" as const,
    category: "Restorative",
    clinicalBehavior: "bridge" as const,
    defaultMaterial: "zirconium" as const,
    prices: { GBP: 130, EUR: 150, USD: 165, TRY: 7_000 },
  },
  {
    treatmentKey: "porcelain-bridge",
    displayName: "Porcelain Bridge",
    patientDescription: "A fixed porcelain-fused-to-metal bridge across the planned span.",
    baseTreatmentKey: "bridge" as const,
    visualKey: "bridge" as const,
    category: "Restorative",
    clinicalBehavior: "bridge" as const,
    defaultMaterial: "porcelain-metal" as const,
    prices: { GBP: 110, EUR: 125, USD: 140, TRY: 5_800 },
  },
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

export const CROWN_TREATMENTS: TreatmentType[] = [
  "zirconium-crown",
  "emax-crown",
  "porcelain-crown",
  "temporary-crown",
];
const FINAL_CROWNS = CROWN_TREATMENTS.filter((type) => type !== "temporary-crown");
const CONSERVATIVE_RESTORATIONS: TreatmentType[] = [
  "veneer",
  "composite-bonding",
  "composite-filling",
  "inlay-onlay",
];
const DEFAULT_RELATIONSHIP: TreatmentRelationship = {
  role: "procedure",
  target: "tooth-site",
  scope: "tooth",
};

export const TREATMENT_RELATIONSHIPS: Partial<Record<TreatmentType, TreatmentRelationship>> = {
  extraction: {
    role: "procedure",
    target: "natural-tooth",
    scope: "tooth",
    conflictsWith: [...CONSERVATIVE_RESTORATIONS, "root-canal-treatment", "post-core"],
  },
  "dental-implant": {
    role: "foundation",
    target: "implant-site",
    scope: "tooth",
    conflictsWith: [...CONSERVATIVE_RESTORATIONS, "root-canal-treatment", "post-core"],
  },
  "implant-abutment": {
    role: "support",
    target: "implant-site",
    scope: "tooth",
    requiresContext: "implant",
  },
  "implant-crown": {
    role: "restoration",
    target: "implant-site",
    scope: "tooth",
    conflictsWith: [...FINAL_CROWNS, ...CONSERVATIVE_RESTORATIONS],
  },
  ...Object.fromEntries(
    CROWN_TREATMENTS.map((type) => [
      type,
      {
        role: "restoration" as const,
        target: "tooth-site" as const,
        scope: "tooth" as const,
        conflictsWith:
          type === "temporary-crown"
            ? (["veneer", "composite-bonding"] as TreatmentType[])
            : ([
                ...FINAL_CROWNS.filter((candidate) => candidate !== type),
                "implant-crown",
                "veneer",
                "composite-bonding",
              ] as TreatmentType[]),
      },
    ]),
  ),
  veneer: {
    role: "restoration",
    target: "natural-tooth",
    scope: "tooth",
    conflictsWith: [...CROWN_TREATMENTS, "implant-crown", "composite-bonding"],
  },
  "composite-bonding": {
    role: "restoration",
    target: "natural-tooth",
    scope: "tooth",
    conflictsWith: [...FINAL_CROWNS, "implant-crown", "veneer"],
  },
  "composite-filling": {
    role: "restoration",
    target: "natural-tooth",
    scope: "tooth",
    conflictsWith: ["implant-crown"],
  },
  "inlay-onlay": {
    role: "restoration",
    target: "natural-tooth",
    scope: "tooth",
    conflictsWith: ["implant-crown"],
  },
  "root-canal-treatment": { role: "procedure", target: "natural-tooth", scope: "tooth" },
  "post-core": { role: "support", target: "natural-tooth", scope: "tooth" },
  bridge: { role: "prosthetic", target: "tooth-site", scope: "span" },
  pontic: { role: "prosthetic", target: "tooth-site", scope: "tooth" },
  whitening: { role: "restoration", target: "arch", scope: "arch" },
  "bone-graft": {
    role: "support",
    target: "implant-site",
    scope: "tooth",
    requiresContext: "implant",
  },
  "sinus-lift": {
    role: "support",
    target: "implant-site",
    scope: "tooth",
    requiresContext: "posterior-maxilla",
  },
  "all-on-4": { role: "prosthetic", target: "arch", scope: "arch" },
  "all-on-6": { role: "prosthetic", target: "arch", scope: "arch" },
  denture: { role: "prosthetic", target: "arch", scope: "arch" },
};

export function treatmentRelationship(type: TreatmentType): TreatmentRelationship {
  return TREATMENT_RELATIONSHIPS[type] ?? DEFAULT_RELATIONSHIP;
}

export const treatmentLayer = (type: TreatmentType) => treatmentRelationship(type).role;
export const treatmentScope = (type: TreatmentType) => treatmentRelationship(type).scope;

export function treatmentComposition(type: TreatmentType): TreatmentType[] {
  return treatmentRelationship(type).composition ?? [type];
}

export function targetsNaturalTooth(type: TreatmentType) {
  return treatmentRelationship(type).target === "natural-tooth";
}

export function isCrownTreatment(type: TreatmentType) {
  return CROWN_TREATMENTS.includes(type) || type === "implant-crown";
}

export function treatmentMaterial(type: TreatmentType) {
  const materials: Partial<
    Record<TreatmentType, "zirconium" | "emax" | "porcelain-metal" | "temporary">
  > = {
    "zirconium-crown": "zirconium",
    "emax-crown": "emax",
    "porcelain-crown": "porcelain-metal",
    "temporary-crown": "temporary",
  };
  return materials[type];
}

export function conflictsWithTreatment(candidate: TreatmentType, existing: TreatmentType) {
  const candidateConflicts = treatmentRelationship(candidate).conflictsWith ?? [];
  const existingConflicts = treatmentRelationship(existing).conflictsWith ?? [];
  return candidateConflicts.includes(existing) || existingConflicts.includes(candidate);
}

export function patientTreatmentCategory(type: TreatmentType): string {
  if (["dental-implant", "implant-abutment", "implant-crown"].includes(type))
    return "Implant Treatment";
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
  if (["root-canal-treatment", "post-core"].includes(type)) return "Endodontic Treatment";
  if (["extraction"].includes(type)) return "Surgical Procedures";
  if (["all-on-4", "all-on-6", "denture"].includes(type)) return "Full-Arch Treatment";
  return "Supporting Procedures";
}
