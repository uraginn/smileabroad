export type Role =
  | "clinic_owner"
  | "clinic_admin"
  | "coordinator"
  | "dentist"
  | "viewer"
  | "sales"
  | "platform_admin";

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
  directory_source?: "curated" | "platform";
  supported_treatments?: string[];
  planner_included_services?: string[];
  website?: string;
  source_label?: string;
  source_url?: string;
  last_reviewed_at?: string;
  platform_tier?: "pro";
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
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  date_of_birth?: string;
  language?: string;
  whatsapp?: string;
  source?: "smileabroad" | "referral" | "manual" | "campaign";
  assessment_id?: string;
  roadmap_id?: string;
  treatment_interest?: string;
  avatar_url?: string;
  preferred_contact_method?: string;
  coordinator_id?: string;
  dentist_id?: string;
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
  lead_id?: string;
  patient_id?: string;
  kind:
    | "note"
    | "status_change"
    | "whatsapp"
    | "email"
    | "call"
    | "in_person"
    | "task"
    | "follow_up"
    | "file";
  body: string;
  internal: boolean;
  occurred_at?: string;
  treatment_plan_id?: string;
  staff_user_id?: string;
  direction?: "inbound" | "outbound" | "internal";
  communication_status?: "logged" | "planned";
  outcome?: string;
  subject?: string;
  template_id?: string;
}

export type FollowUpStatus = "pending" | "completed" | "cancelled";

export interface LeadFollowUp extends BaseRecord {
  clinic_id: string;
  lead_id: string;
  patient_id?: string;
  assigned_user_id?: string;
  due_at: string;
  reason: string;
  notes?: string;
  status: FollowUpStatus;
  completed_at?: string;
}

export interface Task extends BaseRecord {
  clinic_id: string;
  lead_id?: string;
  patient_user_id?: string;
  patient_id?: string;
  treatment_plan_id?: string;
  appointment_id?: string;
  title: string;
  description?: string;
  type?: TaskType;
  due_at?: string;
  assigned_to?: string;
  assigned_user_id?: string;
  priority?: "low" | "normal" | "medium" | "high" | "urgent";
  category?: "task" | "follow_up";
  task_status?: "pending" | "in_progress" | "completed" | "cancelled";
  completed_at?: string;
  done: boolean;
}

export type TaskType =
  | "call_patient"
  | "send_reminder"
  | "request_photos"
  | "request_xray"
  | "review_medical"
  | "doctor_review"
  | "prepare_plan"
  | "plan_follow_up"
  | "confirm_appointment"
  | "confirm_arrival"
  | "book_hotel"
  | "arrange_transfer"
  | "other";

export interface Appointment extends BaseRecord {
  clinic_id: string;
  patient_user_id: string;
  patient_id?: string;
  lead_id?: string;
  treatment_plan_id?: string;
  dentist_id?: string;
  coordinator_id?: string;
  type?: AppointmentType;
  title: string;
  starts_at: string;
  start_at?: string;
  end_at?: string;
  duration_min: number;
  location_type?: "clinic" | "online" | "phone" | "other";
  location?: string;
  notes?: string;
  appointment_status?: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
}

export type AppointmentType =
  | "online_meeting"
  | "phone_call"
  | "video_assessment"
  | "clinic_consultation"
  | "doctor_review_meeting"
  | "clinical_examination"
  | "implant_surgery"
  | "tooth_preparation"
  | "final_restorations"
  | "follow_up"
  | "other_treatment";

export interface CommunicationTemplate extends BaseRecord {
  clinic_id: string;
  name: string;
  category: string;
  channel: "whatsapp" | "email" | "generic";
  subject?: string;
  body: string;
  active: boolean;
}

export interface CrmPipelineStage {
  key: LeadStatus;
  label: string;
  active: boolean;
  terminal: "none" | "converted" | "lost";
}

export interface CrmSourceDefinition {
  key: string;
  label: string;
  active: boolean;
  category?: string;
}

export interface ClinicCrmSettings extends BaseRecord {
  clinic_id: string;
  pipeline: CrmPipelineStage[];
  sources: CrmSourceDefinition[];
}

export type NotificationType =
  | "new_application"
  | "follow_up_overdue"
  | "task_overdue"
  | "plan_review"
  | "plan_approved"
  | "plan_viewed"
  | "plan_accepted"
  | "upcoming_appointment";

export interface ClinicNotification extends BaseRecord {
  clinic_id: string;
  user_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: "lead" | "patient" | "treatment_plan" | "task" | "appointment";
  entity_id: string;
  action_url: string;
  read_at?: string;
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
  "draft" | "doctor_review" | "approved" | "sent" | "viewed" | "accepted" | "declined" | "expired";

export interface TreatmentPlanPriceItem {
  id: string;
  treatment_definition_id?: string;
  treatment_key?: string;
  treatment_group_id?: string;
  label: string;
  quantity: number;
  unit_price: number;
  category?: string;
  manually_overridden?: boolean;
}

export interface TreatmentPlanPayment {
  id?: string;
  label: string;
  amount: number;
  due: string;
}

export interface TreatmentPlanHotelSnapshot {
  hotel_id?: string;
  name: string;
  room_type?: string;
  board_type?: string;
  price_per_night?: number;
  currency?: PlanCurrency;
}

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
  lead_id?: string;
  clinic_application_id?: string;
  assessment_id?: string;
  roadmap_id?: string;
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
  preliminary_suggestions?: RoadmapTreatmentEstimate[];
  selected_hotel_id?: string;
  hotel_snapshot?: TreatmentPlanHotelSnapshot;
  hotel_nights?: number;
  transfers_included?: boolean;
  flight_included?: boolean;
  included_services?: string[];
  excluded_services?: string[];
  currency?: PlanCurrency;
  price_items?: TreatmentPlanPriceItem[];
  hotel_total?: number;
  transfer_total?: number;
  optional_service_total?: number;
  discount_type?: "none" | "fixed" | "percentage";
  discount_value?: number;
  calculated_discount?: number;
  payment_schedule?: TreatmentPlanPayment[];
  valid_until?: string;
  patient_message?: string;
  shared_at?: string;
  viewed_at?: string;
  accepted_at?: string;
  declined_at?: string;
  prepared_at?: string;
  patient_document_version?: number;
  legacy_quote_id?: string;
}

export type PlanCurrency = "GBP" | "EUR" | "USD" | "TRY";

export interface ClinicBranding extends BaseRecord {
  clinic_id: string;
  logo_url?: string;
  shared_view_logo_url?: string;
  shared_view_banner_url?: string;
  shared_view_tagline?: string;
  shared_view_introduction?: string;
  shared_view_accent_color?: string;
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
  treatment_estimates?: RoadmapTreatmentEstimate[];
  treatment_journey?: RoadmapJourneyStep[];
  timeline_summary?: string;
  stay_summary?: string;
  missing_price_keys?: string[];
}

export type RoadmapEstimateSource = "assessment" | "future_ai" | "manual";
export interface RoadmapTreatmentEstimate {
  treatment_key: string;
  label: string;
  minimum_quantity?: number;
  maximum_quantity?: number;
  estimated_quantity?: number;
  likelihood: "expected" | "possible" | "uncertain";
  source: RoadmapEstimateSource;
  confidence?: number;
  patient_explanation?: string;
}
export interface RoadmapJourneyStep {
  id: string;
  title: string;
  description: string;
}
export interface RoadmapCountryTreatmentPrice extends BaseRecord {
  clinic_id?: string;
  country: string;
  currency: PlanCurrency;
  treatment_key: string;
  minimum_price: number;
  maximum_price: number;
  unit: "per_tooth" | "per_implant" | "per_arch" | "per_case";
  notes?: string;
  active: boolean;
}
export interface RoadmapTreatmentContent extends BaseRecord {
  clinic_id?: string;
  treatment_key: string;
  title: string;
  short_description: string;
  why_it_may_be_needed: string;
  procedure_steps: string[];
  usual_visits?: string;
  typical_timeline?: string;
  temporary_solution?: string;
  considerations: string[];
  active: boolean;
}
