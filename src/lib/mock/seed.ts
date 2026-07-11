import type {
  Clinic, Lead, Patient, TreatmentPlan, Quote, ClinicBranding, Task,
  Appointment, User, ClinicApplication, Roadmap, Assessment, UploadedFile,
  LeadActivity, LeadStatus,
} from "@/types/models";

const now = () => new Date().toISOString();
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const base = (created_by = "system") => ({
  created_at: now(), updated_at: now(), created_by,
});

// --- Seed clinics
export const seedClinics: Clinic[] = [
  {
    id: "clinic_istanbul", ...base(),
    name: "Bosphorus Dental Istanbul", slug: "bosphorus-dental",
    country: "Turkey", city: "Istanbul",
    cover_image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&q=80",
    verified: true, google_rating: 4.9, google_reviews: 842,
    trustpilot_rating: 4.8, trustpilot_reviews: 312,
    languages: ["English", "Turkish", "German", "Arabic"],
    price_range: { min: 400, max: 900, currency: "EUR" },
    response_time_hours: 2, hotel_included: true, transfers_included: true,
    guarantee_years: 10,
    short_description: "Boutique dental clinic on the European side, specialising in full mouth rehabilitation.",
  },
  {
    id: "clinic_budapest", ...base(),
    name: "Danube Smile Clinic", slug: "danube-smile",
    country: "Hungary", city: "Budapest",
    cover_image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&q=80",
    verified: true, google_rating: 4.8, google_reviews: 611,
    trustpilot_rating: 4.7, trustpilot_reviews: 220,
    languages: ["English", "Hungarian", "German"],
    price_range: { min: 500, max: 1100, currency: "EUR" },
    response_time_hours: 4, hotel_included: true, transfers_included: true,
    guarantee_years: 7,
    short_description: "European-standard care in the heart of Budapest with in-house lab.",
  },
  {
    id: "clinic_cancun", ...base(),
    name: "Riviera Dental Cancún", slug: "riviera-dental",
    country: "Mexico", city: "Cancún",
    cover_image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1200&q=80",
    verified: true, google_rating: 4.7, google_reviews: 489,
    trustpilot_rating: 4.6, trustpilot_reviews: 155,
    languages: ["English", "Spanish"],
    price_range: { min: 450, max: 950, currency: "USD" },
    response_time_hours: 6, hotel_included: false, transfers_included: true,
    guarantee_years: 5,
    short_description: "Beachside recovery paired with US-trained implantologists.",
  },
];

export const seedBranding: ClinicBranding[] = seedClinics.map((c, i) => ({
  id: id("brand"), ...base(), clinic_id: c.id,
  logo_url: undefined,
  primary_color: ["#0f766e", "#7c3aed", "#0369a1"][i],
  secondary_color: ["#f97316", "#f59e0b", "#ec4899"][i],
  phone: "+00 000 000 000", email: `hello@${c.slug}.com`, website: `https://${c.slug}.com`,
  doctors: [
    { name: "Dr. Elif Yılmaz", title: "Implantologist, DDS" },
    { name: "Dr. Marco Alvarez", title: "Prosthodontist, MSc" },
  ],
  guarantees: [`${c.guarantee_years}-year guarantee on implants`, "Lifetime post-op support"],
  hotel_info: c.hotel_included ? "4★ partner hotel included for the full stay." : "Hotel partners available at negotiated rates.",
  transfer_info: c.transfers_included ? "Airport & clinic transfers included." : "Transfers available on request.",
  terms: "Estimates are subject to clinical examination on arrival.",
}));

// --- Users
export const seedUsers: User[] = [
  { id: "u_owner", ...base(), email: "owner@bosphorus.com", name: "Elif Yılmaz", role: "clinic_owner", clinic_id: "clinic_istanbul" },
  { id: "u_coord", ...base(), email: "coord@bosphorus.com", name: "Kaan Demir", role: "coordinator", clinic_id: "clinic_istanbul" },
  { id: "u_admin", ...base(), email: "admin@smileabroad.com", name: "Platform Admin", role: "platform_admin" },
];

// --- Patients (per clinic CRM)
export const seedPatients: Patient[] = [
  { id: "p_sofia", ...base(), clinic_id: "clinic_istanbul", user_id: "legacy_submission_sofia",
    first_name: "Sofia", last_name: "Bennett", email: "sofia@example.com",
    country: "United Kingdom", city: "London", language: "English", phone: "+44 7700 900123" },
  { id: "p_marco", ...base(), clinic_id: "clinic_istanbul",
    first_name: "Marco", last_name: "Rossi", email: "marco@example.com",
    country: "Italy", city: "Milan", language: "Italian" },
  { id: "p_hannah", ...base(), clinic_id: "clinic_istanbul",
    first_name: "Hannah", last_name: "Müller", email: "hannah@example.com",
    country: "Germany", city: "Berlin", language: "German" },
];

// --- Leads across pipeline
const leadStatuses: LeadStatus[] = [
  "new_lead", "assessment_submitted", "awaiting_review", "contacted",
  "treatment_planning", "quote_sent", "negotiation", "booked",
  "treatment_started", "completed", "lost",
];

export const seedLeads: Lead[] = [
  { id: "l_1", ...base(), clinic_id: "clinic_istanbul", patient_user_id: "legacy_submission_sofia",
    patient_name: "Sofia Bennett", patient_country: "United Kingdom",
    treatment: "All-on-4 Implants", budget: "€8,000–€12,000",
    assigned_to: "u_coord", priority: "high", source: "assessment",
    status: "new_lead", last_activity_at: now() },
  { id: "l_2", ...base(), clinic_id: "clinic_istanbul", patient_user_id: "p_marco",
    patient_name: "Marco Rossi", patient_country: "Italy",
    treatment: "6× Veneers", budget: "€3,000–€5,000",
    assigned_to: "u_coord", priority: "medium", source: "campaign",
    status: "contacted", last_activity_at: now() },
  { id: "l_3", ...base(), clinic_id: "clinic_istanbul", patient_user_id: "p_hannah",
    patient_name: "Hannah Müller", patient_country: "Germany",
    treatment: "Single Implant + Crown", budget: "€1,200–€1,800",
    assigned_to: "u_coord", priority: "medium", source: "referral",
    status: "treatment_planning", last_activity_at: now() },
  { id: "l_4", ...base(), clinic_id: "clinic_istanbul", patient_user_id: "p_marco",
    patient_name: "James O'Connor", patient_country: "Ireland",
    treatment: "Full Mouth Rehab", budget: "€15,000+",
    priority: "high", source: "assessment", status: "quote_sent", last_activity_at: now() },
  { id: "l_5", ...base(), clinic_id: "clinic_istanbul", patient_user_id: "p_marco",
    patient_name: "Priya Shah", patient_country: "United Arab Emirates",
    treatment: "Zirconia Crowns", budget: "€4,500",
    priority: "low", source: "manual", status: "booked", last_activity_at: now() },
  { id: "l_6", ...base(), clinic_id: "clinic_istanbul", patient_user_id: "p_marco",
    patient_name: "Ana García", patient_country: "Spain",
    treatment: "Composite Bonding", budget: "€800",
    priority: "low", source: "campaign", status: "lost", last_activity_at: now() },
];

export const seedTreatmentPlans: TreatmentPlan[] = [
  { id: "tp_1", ...base(), clinic_id: "clinic_istanbul", patient_user_id: "legacy_submission_sofia",
    title: "All-on-4 Upper Arch", summary: "Immediate load implants with fixed provisional bridge.",
    items: [
      { id: id("tpi"), tooth: 11, treatment: "extraction", unit_price: 80 },
      { id: id("tpi"), tooth: 13, treatment: "implant", material: "Straumann", unit_price: 780 },
      { id: id("tpi"), tooth: 16, treatment: "implant", material: "Straumann", unit_price: 780 },
      { id: id("tpi"), tooth: 23, treatment: "implant", material: "Straumann", unit_price: 780 },
      { id: id("tpi"), tooth: 26, treatment: "implant", material: "Straumann", unit_price: 780 },
      { id: id("tpi"), tooth: 14, treatment: "pontic", unit_price: 250 },
    ],
    clinical_findings: [], treatment_objectives: [], alternatives: [], risks: [], exclusions: [],
    materials: [], implant_systems: [], treatment_stages: [], visit_plan: [],
    visits: 2, healing_weeks: 12, status: "draft", share_token: "share_sofia_upper" },
];

export const seedQuotes: Quote[] = [
  { id: "q_1", ...base(), clinic_id: "clinic_istanbul", patient_user_id: "legacy_submission_sofia",
    treatment_plan_id: "tp_1", currency: "EUR",
    items: [
      { id: id("qi"), label: "Straumann Implant", qty: 4, unit_price: 780 },
      { id: id("qi"), label: "Zirconia Bridge (12 units)", qty: 1, unit_price: 3600 },
      { id: id("qi"), label: "Extraction", qty: 1, unit_price: 80 },
      { id: id("qi"), label: "Bone graft", qty: 2, unit_price: 220 },
    ],
    hotel_total: 640, transfer_total: 90, discount: 200,
    payment_schedule: [
      { label: "On arrival", amount: 3000, due: "Day 1" },
      { label: "After surgery", amount: 3000, due: "Day 3" },
      { label: "Final delivery", amount: 1450, due: "Month 4" },
    ],
    notes: "Includes CBCT, all consultations, sedation and follow-up.",
    included_services: [], excluded_services: [],
    share_token: "share_sofia_upper" },
];

export const seedTasks: Task[] = [
  { id: "t_1", ...base(), clinic_id: "clinic_istanbul", lead_id: "l_1",
    title: "Call Sofia to confirm CBCT arrival", due_at: now(), assigned_to: "u_coord", done: false },
  { id: "t_2", ...base(), clinic_id: "clinic_istanbul", lead_id: "l_3",
    title: "Send treatment plan draft to Hannah", assigned_to: "u_coord", done: false },
];

export const seedAppointments: Appointment[] = [
  { id: "a_1", ...base(), clinic_id: "clinic_istanbul", patient_user_id: "legacy_submission_sofia",
    title: "Consultation — Sofia Bennett", starts_at: new Date(Date.now() + 3 * 864e5).toISOString(),
    duration_min: 45, location: "Clinic — Room 2" },
];

export const seedApplications: ClinicApplication[] = [];
export const seedRoadmaps: Roadmap[] = [];
export const seedAssessments: Assessment[] = [];
export const seedFiles: UploadedFile[] = [];
export const seedActivities: LeadActivity[] = [];

export { id as makeId, now };
