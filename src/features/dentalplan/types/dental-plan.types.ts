export type ToothNumber =
  | 18
  | 17
  | 16
  | 15
  | 14
  | 13
  | 12
  | 11
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 48
  | 47
  | 46
  | 45
  | 44
  | 43
  | 42
  | 41
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38;

export type ConditionType =
  | "healthy"
  | "missing"
  | "extraction-required"
  | "existing-crown"
  | "existing-implant"
  | "existing-bridge"
  | "existing-filling"
  | "root-canal-treated"
  | "decay"
  | "fractured"
  | "mobility"
  | "impacted"
  | "periodontal-problem"
  | "other";

export type TreatmentType =
  | "extraction"
  | "dental-implant"
  | "implant-crown"
  | "zirconium-crown"
  | "emax-crown"
  | "porcelain-crown"
  | "temporary-crown"
  | "bridge"
  | "pontic"
  | "composite-bonding"
  | "composite-filling"
  | "root-canal-treatment"
  | "veneer"
  | "inlay-onlay"
  | "whitening"
  | "sinus-lift"
  | "bone-graft"
  | "all-on-4"
  | "all-on-6"
  | "denture"
  | "other";

export type BridgeUnitRole = "abutment-crown" | "pontic" | "implant-abutment";
export type ToothCondition = {
  toothNumber: ToothNumber;
  conditions: ConditionType[];
  notes?: string;
};
export type ToothTreatment = {
  id: string;
  toothNumbers: ToothNumber[];
  treatmentType: TreatmentType;
  treatmentGroupId?: string;
  sequence?: number;
  notes?: string;
  bridgeRoles?: Partial<Record<ToothNumber, BridgeUnitRole>>;
};
export type DentalPlanData = {
  id: string;
  name: string;
  patientName?: string;
  currentConditions: Partial<Record<ToothNumber, ToothCondition>>;
  proposedTreatments: ToothTreatment[];
  createdAt: string;
  updatedAt: string;
};
export type DentalPlan = DentalPlanData;
export type PlannerMode = "current" | "proposed";
export interface DentalPlanStudioProps {
  initialValue?: DentalPlanData;
  onChange?: (value: DentalPlanData) => void;
  onSave?: (value: DentalPlanData) => void;
  readOnly?: boolean;
}
