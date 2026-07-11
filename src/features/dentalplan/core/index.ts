import type { DentalPlanData, DentalPlanInput, DentalPlanProcedure } from "../types";

export const FDI_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const FDI_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const PROCEDURES: Array<{
  value: DentalPlanProcedure;
  label: string;
  price: number;
  color: string;
}> = [
  { value: "crown", label: "Crown", price: 280, color: "#d97706" },
  { value: "implant", label: "Implant", price: 650, color: "#4f46e5" },
  { value: "extraction", label: "Extraction", price: 90, color: "#dc2626" },
  { value: "root_canal", label: "Root canal", price: 180, color: "#be123c" },
  { value: "filling", label: "Filling", price: 80, color: "#0284c7" },
  { value: "missing", label: "Missing tooth", price: 0, color: "#64748b" },
  { value: "pontic", label: "Pontic", price: 220, color: "#9333ea" },
  { value: "bridge", label: "Bridge", price: 260, color: "#7e22ce" },
];

export const MATERIALS = ["Zirconia", "E-max", "Porcelain fused to metal", "Composite", "Acrylic"];
export const IMPLANT_BRANDS = ["Straumann", "Nobel Biocare", "Medentika", "Osstem", "Megagen"];

export function createDentalPlan(input: DentalPlanInput = {}): DentalPlanData {
  const now = new Date().toISOString();
  return {
    id: input.id ?? crypto.randomUUID(),
    patientName: input.patientName ?? "",
    currency: input.currency ?? "EUR",
    items: Array.isArray(input.items) ? input.items : [],
    stages: Array.isArray(input.stages) ? input.stages : [],
    notes: input.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

export const planTotal = (plan: DentalPlanData) =>
  plan.items.reduce((total, item) => total + item.unitPrice * Math.max(item.teeth.length, 1), 0);

export const procedureDefinition = (value: DentalPlanProcedure) =>
  PROCEDURES.find((procedure) => procedure.value === value) ?? PROCEDURES[0];
