export type Role =
  "clinic_owner" | "clinic_admin" | "coordinator" | "dentist" | "sales" | "platform_admin";

export interface BaseRecord {
  id: string;
  status?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface User extends BaseRecord {
  email: string;
  name: string;
  role: Role;
  avatar_url?: string;
  clinic_id?: string;
  title?: string;
  specialty?: string;
  languages?: string[];
  active?: boolean;
  default_planner_dentist?: boolean;
  patient_bio?: string;
  profile_image_name?: string;
}

export interface Profile extends BaseRecord {
  user_id: string;
  phone?: string;
  country?: string;
  city?: string;
  language?: string;
}

export interface Clinic extends BaseRecord {
  name: string;
  slug: string;
  country: string;
  city: string;
  cover_image: string;
  verified: boolean;
  google_rating: number;
  google_reviews: number;
  trustpilot_rating: number;
  trustpilot_reviews: number;
  languages: string[];
  price_range: { min: number; max: number; currency: string };
  response_time_hours: number;
  hotel_included: boolean;
  transfers_included: boolean;
  guarantee_years: number;
  short_description: string;
}

export interface ClinicMember extends BaseRecord {
  clinic_id: string;
  user_id: string;
  role: Exclude<Role, "platform_admin">;
}

export interface Patient extends BaseRecord {
  clinic_id: string; // owning clinic in CRM (patient can appear in multiple clinics through applications)
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country: string;
  city?: string;
  date_of_birth?: string;
  language?: string;
  whatsapp?: string;
  source?: "smileabroad" | "referral" | "manual" | "campaign";
  assessment_id?: string;
  roadmap_id?: string;
  treatment_interest?: string;
  avatar_url?: string;
}

export interface AssessmentDental {
  treatment_interest: string;
  concerns?: string;
  affected_areas?: string;
  missing_teeth?: string;
  loose_teeth?: string;
  pain?: string;
  bleeding_gums?: string;
  existing_restorations?: string;
  previous_treatment?: string;
  expected_result?: string;
  additional_notes?: string;
}

export interface AssessmentPersonal {
  first_name: string;
  last_name?: string;
  age?: number;
  date_of_birth?: string;
  country?: string;
  city?: string;
  nationality?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  preferred_language?: string;
  preferred_contact_method?: string;
}

export interface AssessmentMedical {
  conditions: string[];
  medications?: string;
  allergies?: string;
  medication_groups?: string[];
  allergy_groups?: string[];
  diabetes?: boolean;
  blood_pressure?: boolean;
  heart_disease?: boolean;
  osteoporosis?: boolean;
  radiotherapy?: boolean;
  blood_thinners?: boolean;
  smoking: boolean;
  pregnancy: boolean;
  complications?: string;
  additional_notes?: string;
}

export interface AssessmentTravel {
  destination_country: string;
  preferred_cities: string[];
  travel_from?: string;
  earliest_date?: string;
  latest_date?: string;
  flexible_travel?: boolean;
  companions: number;
  needs_hotel: boolean;
  hotel_category?: string;
  needs_airport_transfer: boolean;
  available_stay?: string;
  budget?: string;
  preferred_currency?: string;
  treatment_timeline?: string;
}

export interface AssessmentUploads {
  uploaded_panoramic: boolean;
  uploaded_smile_photo: boolean;
  uploaded_cbct: boolean;
  uploaded_dental_photos: boolean;
  uploaded_previous_plan: boolean;
  uploaded_previous_report: boolean;
}

export interface Assessment extends BaseRecord {
  patient_user_id: string;
  dental: AssessmentDental;
  personal: AssessmentPersonal;
  medical: AssessmentMedical;
  travel: AssessmentTravel;
  uploads: AssessmentUploads;
}

export interface MedicalHistory extends BaseRecord {
  patient_user_id: string;
  conditions: string[];
  medications: string;
  allergies: string;
  smoker: boolean;
  pregnant: boolean;
  notes?: string;
}

export interface TravelPreferences extends BaseRecord {
  patient_user_id: string;
  travel_from: string;
  earliest_date?: string;
  latest_date?: string;
  companions: number;
  needs_hotel: boolean;
  needs_transfer: boolean;
}

export interface UploadedFile extends BaseRecord {
  clinic_id?: string;
  patient_user_id: string;
  kind: "dental_photo" | "panoramic" | "cbct" | "previous_plan" | "previous_report";
  name: string;
  url: string; // preview URL
  size: number;
  mime: string;
}

export type LeadStatus =
  | "new_lead"
  | "awaiting_images"
  | "doctor_review"
  | "follow_up"
  | "assessment_submitted"
  | "awaiting_review"
  | "contacted"
  | "treatment_planning"
  | "quote_sent"
  | "negotiation"
  | "booked"
  | "treatment_started"
  | "completed"
  | "lost";

export interface ClinicApplication extends BaseRecord {
  clinic_id: string;
  patient_user_id: string;
  clinic_patient_id?: string;
  lead_id?: string;
  assessment_id: string;
  roadmap_id: string;
  message?: string;
  status: "submitted" | "reviewing" | "accepted" | "declined";
}

export interface Lead extends BaseRecord {
  clinic_id: string;
  patient_user_id: string;
  clinic_patient_id?: string;
  clinic_application_id?: string;
  assessment_id?: string;
  roadmap_id?: string;
  patient_name: string;
  patient_country: string;
  treatment: string;
  budget?: string;
  assigned_to?: string;
  priority: "low" | "medium" | "high" | "urgent";
  source: "assessment" | "referral" | "manual" | "campaign";
  status: LeadStatus;
  last_activity_at: string;
}

export interface LeadActivity extends BaseRecord {
  clinic_id: string;
  lead_id: string;
  kind: "note" | "status_change" | "whatsapp" | "email" | "call" | "in_person" | "task" | "file";
  body: string;
  internal: boolean;
  occurred_at?: string;
}

export interface Task extends BaseRecord {
  clinic_id: string;
  lead_id?: string;
  patient_user_id?: string;
  title: string;
  due_at?: string;
  assigned_to?: string;
  priority?: "low" | "medium" | "high";
  category?: "task" | "follow_up";
  done: boolean;
}

export interface Appointment extends BaseRecord {
  clinic_id: string;
  patient_user_id: string;
  title: string;
  starts_at: string;
  duration_min: number;
  location?: string;
  notes?: string;
}

export type ToothTreatment =
  | "implant"
  | "crown"
  | "extraction"
  | "bridge"
  | "pontic"
  | "veneer"
  | "composite"
  | "filling"
  | "root_canal"
  | "bone_graft"
  | "sinus_lift"
  | "whitening"
  | "denture";

export interface TreatmentPlanItem {
  id: string;
  tooth: number; // FDI
  treatment: ToothTreatment;
  material?: string;
  notes?: string;
  patient_facing_note?: string;
  internal_note?: string;
  unit_price: number;
}

export type TreatmentPlanStatus =
  "draft" | "awaiting_doctor_review" | "approved" | "sent_to_patient" | "archived";

export interface TreatmentStage {
  stage_number: number;
  title: string;
  description?: string;
  procedures: string[];
  duration_or_stay?: string;
  healing_period_after?: string;
  patient_instructions?: string;
}

export interface TreatmentVisit {
  visit_number: number;
  title: string;
  description?: string;
  procedures: string[];
  expected_stay?: string;
  healing_period_after?: string;
  patient_instructions?: string;
}

export interface TreatmentPlan extends BaseRecord {
  clinic_id: string;
  patient_user_id: string;
  clinic_patient_id?: string;
  title: string;
  summary: string;
  items: TreatmentPlanItem[];
  visits: number;
  healing_weeks: number;
  status?: TreatmentPlanStatus;
  dentist_id?: string;
  coordinator_id?: string;
  clinical_notes?: string;
  clinical_summary?: string;
  clinical_findings?: string[];
  treatment_objectives?: string[];
  patient_facing_notes?: string;
  internal_clinical_notes?: string;
  alternatives?: string[];
  risks?: string[];
  exclusions?: string[];
  materials?: string[];
  implant_systems?: string[];
  temporary_solution?: string;
  estimated_stay?: string;
  treatment_timeline?: string;
  treatment_stages?: TreatmentStage[];
  visit_plan?: TreatmentVisit[];
  share_token?: string;
  dental_plan_data?: unknown;
  treatment_groups?: Array<{
    id: string;
    type: string;
    arch: string;
    affected_teeth: number[];
    generated_item_ids: string[];
  }>;
}

export interface QuoteItem {
  id: string;
  label: string;
  qty: number;
  unit_price: number;
}

export type QuoteCurrency = "GBP" | "EUR" | "USD" | "TRY";
export type QuoteStatus =
  "draft" | "approved" | "sent" | "viewed" | "accepted" | "declined" | "expired";

export interface Quote extends BaseRecord {
  clinic_id: string;
  patient_user_id: string;
  clinic_patient_id?: string;
  treatment_plan_id: string;
  currency: QuoteCurrency;
  items: QuoteItem[];
  hotel_total: number;
  transfer_total: number;
  discount: number;
  payment_schedule: { label: string; amount: number; due: string }[];
  notes?: string;
  valid_until?: string;
  included_services?: string[];
  excluded_services?: string[];
  patient_message?: string;
  status?: QuoteStatus;
  share_token?: string;
}

export interface ClinicBranding extends BaseRecord {
  clinic_id: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  phone: string;
  email: string;
  website: string;
  doctors: { name: string; title: string; photo?: string }[];
  guarantees: string[];
  hotel_info: string;
  transfer_info: string;
  terms: string;
}

export interface ClinicPricing extends BaseRecord {
  clinic_id: string;
  treatment: ToothTreatment;
  unit_price: number;
  currency: string;
}

export type PlannerCurrency = "GBP" | "EUR" | "USD" | "TRY";

export interface ClinicTreatmentDefinition extends BaseRecord {
  clinic_id: string;
  treatment_key: string;
  system: boolean;
  display_name: string;
  patient_label?: string;
  internal_label?: string;
  category: string;
  description?: string;
  prices: Partial<Record<PlannerCurrency, number>>;
  unit_type: "tooth" | "arch" | "case";
  availability: "current" | "proposed" | "both";
  active: boolean;
  base_treatment_key: string;
  visual_key: string;
  rule_profile_key: string;
}

export interface PlannerAssetMetadata {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  data_url?: string;
}

export interface DentalPlanTemplate extends BaseRecord {
  clinic_id: string;
  name: string;
  description?: string;
  category: string;
  active: boolean;
  default_dentist_id?: string;
  plan_data: unknown;
  patient_summary?: string;
  internal_notes?: string;
}

export interface ClinicHotel extends BaseRecord {
  clinic_id: string;
  name: string;
  categories: string[];
  website?: string;
  description?: string;
  address?: string;
  city: string;
  country: string;
  distance_from_clinic?: string;
  room_types: string[];
  board_types: string[];
  default_nights: number;
  companion_policy?: string;
  price_per_night: number;
  currency: PlannerCurrency;
  active: boolean;
  is_default: boolean;
  contact?: string;
  internal_notes?: string;
  images: PlannerAssetMetadata[];
}

export interface Message extends BaseRecord {
  clinic_id?: string;
  from_user_id: string;
  to_user_id: string;
  body: string;
  read: boolean;
}

export interface Roadmap extends BaseRecord {
  patient_user_id: string;
  assessment_id: string;
  summary: string;
  estimated_treatment: string;
  estimated_visits: number;
  healing_weeks: number;
  price_min: number;
  price_max: number;
  currency: string;
  recommended_clinic_ids: string[];
}
