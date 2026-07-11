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
export type DentalTreatmentGroup = {
  id: string;
  type: "bridge" | "all-on-4" | "full-arch";
  arch: "upper" | "lower";
  affectedTeeth: ToothNumber[];
  generatedTreatmentIds: string[];
  abutments?: ToothNumber[];
  pontics?: ToothNumber[];
  implantPositions?: ToothNumber[];
  supportType?: "natural" | "implant" | "mixed";
};
export type DentalPlannerPatient = {
  patientId?: string;
  fullName: string;
  firstName: string;
  lastName: string;
  age?: number;
  dateOfBirth?: string;
  country?: string;
  city?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  preferredLanguage?: string;
  treatmentInterest?: string;
  source?: string;
  dentistId?: string;
  coordinatorId?: string;
  assessmentId?: string;
  roadmapId?: string;
  applicationId?: string;
  leadId?: string;
  uploadedFiles: Array<{ kind: string; name: string }>;
  planTitle: string;
  preparationDate: string;
  currency: "GBP" | "EUR" | "USD" | "TRY";
};
export type DentalPlannerImportedAssessment = {
  medicalConditions: string[];
  medications?: string;
  allergies?: string;
  destinationCountry?: string;
  preferredCities: string[];
  preferredTimeline?: string;
  treatmentInterest?: string;
};
export type DentalPlannerTravel = {
  clinicId?: string;
  visits: number;
  visitDuration?: string;
  healingWeeks: number;
  hotelRequired: boolean;
  hotelName?: string;
  roomType?: string;
  hotelNights: number;
  boardType?: string;
  companion?: string;
  airportTransfer: boolean;
  localTransfer: boolean;
  includedServices: string[];
  guarantees: string[];
  treatmentDates?: string;
  timelineNotes?: string;
  patientFacingNotes?: string;
  internalNotes?: string;
};
export type DentalPlanData = {
  id: string;
  name: string;
  patientName?: string;
  currentConditions: Partial<Record<ToothNumber, ToothCondition>>;
  proposedTreatments: ToothTreatment[];
  treatmentGroups: DentalTreatmentGroup[];
  patient: DentalPlannerPatient;
  travel: DentalPlannerTravel;
  draftStep: number;
  finalized: boolean;
  importedAssessment: DentalPlannerImportedAssessment;
  createdAt: string;
  updatedAt: string;
};
export type DentalPlan = DentalPlanData;
export type PlannerMode = "current" | "proposed";
export interface DentalPlanStudioProps {
  context?: DentalPlannerContext;
  initialValue?: DentalPlanData;
  onChange?: (value: DentalPlanData) => void;
  onSave?: (value: DentalPlanData) => void;
  onFinalize?: (value: DentalPlanData) => Promise<{ treatmentPlanId: string; quoteId: string }>;
  readOnly?: boolean;
  clinicUsers?: Array<{ id: string; name: string; role: string }>;
}
export interface DentalPlannerContext {
  mode: "standalone" | "crm";
  clinicId?: string;
  patientId?: string;
  treatmentPlanId?: string;
  quoteId?: string;
}
