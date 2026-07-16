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
  | "implant-abutment"
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
  | "post-core"
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
export type TreatmentLayer =
  "condition" | "procedure" | "foundation" | "support" | "restoration" | "prosthetic";
export type TreatmentScope = "tooth" | "span" | "arch" | "plan";
export type ClinicalTreatmentBehavior = "tooth" | "bridge" | "arch";
export type TreatmentSupport = "natural" | "implant" | "soft-tissue" | "arch";
export type ClinicalTreatmentStage =
  | "disease-control"
  | "surgical-preparation"
  | "grafting"
  | "implant-placement"
  | "healing"
  | "temporary-restoration"
  | "final-restoration"
  | "cosmetic-finishing"
  | "follow-up";
export type BridgeType = "conventional" | "cantilever" | "implant-supported";
export type ToothCondition = {
  toothNumber: ToothNumber;
  conditions: ConditionType[];
  notes?: string;
};
export type ToothTreatment = {
  id: string;
  toothNumbers: ToothNumber[];
  treatmentType: TreatmentType;
  treatmentDefinitionId?: string;
  treatmentKey?: string;
  visualKey?: TreatmentType;
  displayName?: string;
  implantBrand?: string;
  treatmentGroupId?: string;
  layer?: TreatmentLayer;
  scope?: TreatmentScope;
  sequence?: number;
  stage?: ClinicalTreatmentStage;
  supportType?: TreatmentSupport;
  material?: "zirconium" | "emax" | "porcelain-metal" | "temporary" | "composite";
  bridgeType?: BridgeType;
  clinicianOverrideReason?: string;
  notes?: string;
  bridgeRoles?: Partial<Record<ToothNumber, BridgeUnitRole>>;
};
export type DentalTreatmentGroup = {
  id: string;
  type: "bridge" | "all-on-4" | "all-on-6" | "full-arch" | "implant-restoration";
  arch: "upper" | "lower";
  affectedTeeth: ToothNumber[];
  generatedTreatmentIds: string[];
  abutments?: ToothNumber[];
  pontics?: ToothNumber[];
  implantPositions?: ToothNumber[];
  supportType?: "natural" | "implant" | "mixed";
  bridgeType?: BridgeType;
  material?: ToothTreatment["material"];
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
  smoking?: boolean;
  pregnancy?: boolean;
  panoramicAvailable?: boolean;
  dentalPhotosAvailable?: boolean;
};
export type PlanningPreference = { mode: "automatic" | "custom"; value: string };
export type DentalPlanningPreferences = {
  visits: PlanningPreference;
  visitDuration: PlanningPreference;
  healingPeriod: PlanningPreference;
  estimatedStay: PlanningPreference;
};
export type DentalPlannerTravel = {
  clinicId?: string;
  visits: number;
  visitDuration?: string;
  healingWeeks: number;
  hotelRequired: boolean;
  hotelIncluded: boolean;
  selectedHotelId?: string;
  hotelName?: string;
  roomType?: string;
  hotelNights: number;
  boardType?: string;
  companion?: string;
  companionIncluded?: boolean;
  hotelDescription?: string;
  hotelImageMetadata?: string;
  airportTransfer: boolean;
  airportPickup?: boolean;
  airportDropoff?: boolean;
  localTransfer: boolean;
  flightIncluded?: boolean;
  transferIncluded?: boolean;
  transferNote?: string;
  includedServices: string[];
  guarantees: string[];
  treatmentDates?: string;
  firstVisitDate?: string;
  secondVisitDate?: string;
  datesFlexible?: boolean;
  timelineNotes?: string;
  patientFacingNotes?: string;
  internalNotes?: string;
};
export type DentalPricingItem = {
  treatmentId: string;
  treatmentKey?: string;
  treatmentDefinitionId?: string;
  category?: string;
  label: string;
  qty: number;
  unitPrice: number;
  priceOverridden?: boolean;
};
export type EffectiveTreatmentDefinition = {
  id: string;
  treatmentKey: string;
  displayName: string;
  category: string;
  baseTreatmentKey: TreatmentType;
  visualKey: TreatmentType;
  perTooth: boolean;
  clinicalBehavior: ClinicalTreatmentBehavior;
  defaultMaterial?: ToothTreatment["material"];
  implantBrand?: string;
  system: boolean;
  prices: Partial<Record<"GBP" | "EUR" | "USD" | "TRY", number>>;
};
export type DentalPlannerCommercial = {
  currency: "GBP" | "EUR" | "USD" | "TRY";
  items: DentalPricingItem[];
  hotelTotal: number;
  transferTotal: number;
  otherServiceTotal: number;
  discountType: "none" | "fixed" | "percentage";
  discountValue: number;
  paymentSchedule: Array<{ id: string; label: string; amount: number; due: string }>;
  validUntil?: string;
  commercialNotes?: string;
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
  planningPreferences: DentalPlanningPreferences;
  commercial: DentalPlannerCommercial;
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
  onFinalize?: (value: DentalPlanData) => Promise<{ treatmentPlanId: string }>;
  onSaveAsTemplate?: (value: DentalPlanData, name: string) => void;
  readOnly?: boolean;
  caseReadOnly?: boolean;
  commercialReadOnly?: boolean;
  clinicUsers?: Array<{ id: string; name: string; role: string }>;
  preliminarySuggestions?: Array<{ key: string; label: string; quantity?: number }>;
  shareSection?: ReactNode;
  documentStatus?: string;
  onPreview?: () => void;
  treatmentDefaults?: Array<{
    id?: string;
    treatmentKey: string;
    displayName: string;
    active: boolean;
    system?: boolean;
    category?: string;
    baseTreatmentKey?: TreatmentType;
    visualKey?: TreatmentType;
    perTooth?: boolean;
    clinicalBehavior?: ClinicalTreatmentBehavior;
    defaultMaterial?: ToothTreatment["material"];
    implantBrand?: string;
    prices: Partial<Record<"GBP" | "EUR" | "USD" | "TRY", number>>;
  }>;
  templates?: Array<{
    id: string;
    name: string;
    description?: string;
    category: string;
    planData: DentalPlanData;
  }>;
  hotels?: Array<{
    id: string;
    name: string;
    categories: string[];
    website?: string;
    description?: string;
    roomTypes: string[];
    boardTypes: string[];
    defaultNights: number;
    pricePerNight: number;
    currency: "GBP" | "EUR" | "USD" | "TRY";
    companionPolicy?: string;
    isDefault: boolean;
    images: Array<{ id: string; name: string; dataUrl?: string }>;
  }>;
  serviceOptions?: string[];
}
export interface DentalPlannerContext {
  mode: "standalone" | "crm" | "template";
  clinicId?: string;
  patientId?: string;
  treatmentPlanId?: string;
}
import type { ReactNode } from "react";
