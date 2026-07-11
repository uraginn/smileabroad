/** FDI dental numbering system. Upper right→left, lower left→right. */
export const FDI_UPPER: number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const FDI_LOWER: number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const TREATMENT_OPTIONS = [
  { value: "implant", label: "Implant", color: "#0891b2" },
  { value: "crown", label: "Crown", color: "#7c3aed" },
  { value: "extraction", label: "Extraction", color: "#dc2626" },
  { value: "bridge", label: "Bridge", color: "#0369a1" },
  { value: "pontic", label: "Pontic", color: "#0ea5e9" },
  { value: "veneer", label: "Veneer", color: "#f59e0b" },
  { value: "composite", label: "Composite", color: "#84cc16" },
  { value: "filling", label: "Filling", color: "#22c55e" },
  { value: "root_canal", label: "Root Canal", color: "#ef4444" },
  { value: "bone_graft", label: "Bone Graft", color: "#a16207" },
  { value: "sinus_lift", label: "Sinus Lift", color: "#c026d3" },
  { value: "whitening", label: "Whitening", color: "#fbbf24" },
  { value: "denture", label: "Denture", color: "#64748b" },
] as const;

export const treatmentColor = (t: string) =>
  TREATMENT_OPTIONS.find((o) => o.value === t)?.color ?? "#64748b";

export const treatmentLabel = (t: string) =>
  TREATMENT_OPTIONS.find((o) => o.value === t)?.label ?? t;
