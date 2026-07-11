export type DentalPlanProcedure =
  "crown" | "implant" | "extraction" | "root_canal" | "filling" | "missing" | "pontic" | "bridge";

export type DentalPlanItem = {
  id: string;
  teeth: number[];
  procedure: DentalPlanProcedure;
  material?: string;
  implantBrand?: string;
  notes?: string;
  unitPrice: number;
  stageId?: string;
};

export type DentalPlanStage = {
  id: string;
  name: string;
  visit: number;
};

export type DentalPlanData = {
  id: string;
  patientName: string;
  currency: "EUR" | "USD" | "GBP" | "TRY";
  items: DentalPlanItem[];
  stages: DentalPlanStage[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type DentalPlanInput = Partial<
  Pick<DentalPlanData, "id" | "patientName" | "currency" | "items" | "stages" | "notes">
>;

export type DentalPlanStudioProps = {
  initialValue?: DentalPlanInput;
  onChange?: (plan: DentalPlanData) => void;
  onSave?: (plan: DentalPlanData) => void;
};
