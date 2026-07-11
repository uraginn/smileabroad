import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type {
  Clinic, Lead, LeadStatus, Patient, TreatmentPlan, Quote, ClinicBranding,
  Task, Appointment, User, ClinicApplication, Roadmap, Assessment,
  UploadedFile, LeadActivity,
} from "@/types/models";
import {
  seedClinics, seedBranding, seedUsers, seedPatients, seedLeads,
  seedTreatmentPlans, seedQuotes, seedTasks, seedAppointments,
  seedApplications, seedRoadmaps, seedAssessments, seedFiles, seedActivities,
  makeId, now,
} from "./seed";

interface Store {
  clinics: Clinic[];
  branding: ClinicBranding[];
  users: User[];
  patients: Patient[];
  leads: Lead[];
  treatmentPlans: TreatmentPlan[];
  quotes: Quote[];
  tasks: Task[];
  appointments: Appointment[];
  applications: ClinicApplication[];
  roadmaps: Roadmap[];
  assessments: Assessment[];
  files: UploadedFile[];
  activities: LeadActivity[];

  addAssessment: (a: Omit<Assessment, "id" | "created_at" | "updated_at" | "created_by">) => Assessment;
  addFile: (f: Omit<UploadedFile, "id" | "created_at" | "updated_at" | "created_by">) => UploadedFile;
  addRoadmap: (r: Omit<Roadmap, "id" | "created_at" | "updated_at" | "created_by">) => Roadmap;
  applyToClinic: (input: { clinic_id: string; patient_user_id: string; assessment_id: string; roadmap_id: string; patient_name: string; patient_country: string; treatment: string; message?: string }) => ClinicApplication;
  addLeadActivity: (activity: Omit<LeadActivity, "id" | "created_at" | "updated_at">) => LeadActivity;
  updateLeadStatus: (id: string, status: LeadStatus, changedBy?: string) => void;
  addTreatmentPlan: (tp: Omit<TreatmentPlan, "id" | "created_at" | "updated_at" | "created_by">) => TreatmentPlan;
  updateTreatmentPlan: (id: string, patch: Partial<TreatmentPlan>) => void;
  addQuote: (q: Omit<Quote, "id" | "created_at" | "updated_at" | "created_by">) => Quote;
  updateBranding: (clinic_id: string, patch: Partial<ClinicBranding>) => void;
  toggleTask: (id: string) => void;
}

type LegacyAssessment = Assessment & {
  treatment?: string;
  countries?: string[];
  cities?: string[];
  chief_complaint?: string;
  missing_teeth?: string;
  budget_range?: string;
  timeline?: string;
};

function migrateAssessment(assessment: LegacyAssessment): Assessment {
  if (assessment.dental && assessment.personal && assessment.medical && assessment.travel && assessment.uploads) {
    return assessment;
  }

  return {
    ...assessment,
    dental: {
      treatment_interest: assessment.treatment ?? "",
      concerns: assessment.chief_complaint,
      missing_teeth: assessment.missing_teeth,
    },
    personal: {
      first_name: "",
      email: "",
    },
    medical: {
      conditions: [],
      smoking: false,
      pregnancy: false,
    },
    travel: {
      destination_country: assessment.countries?.[0] ?? "",
      preferred_cities: assessment.cities ?? [],
      companions: 0,
      needs_hotel: false,
      needs_airport_transfer: false,
      budget: assessment.budget_range,
      treatment_timeline: assessment.timeline,
    },
    uploads: {
      uploaded_panoramic: false,
      uploaded_smile_photo: false,
      uploaded_cbct: false,
      uploaded_dental_photos: false,
      uploaded_previous_plan: false,
      uploaded_previous_report: false,
    },
  };
}

export const useMockStore = create<Store>()(
  persist(
    (set, get) => ({
      clinics: seedClinics,
      branding: seedBranding,
      users: seedUsers,
      patients: seedPatients,
      leads: seedLeads,
      treatmentPlans: seedTreatmentPlans,
      quotes: seedQuotes,
      tasks: seedTasks,
      appointments: seedAppointments,
      applications: seedApplications,
      roadmaps: seedRoadmaps,
      assessments: seedAssessments,
      files: seedFiles,
      activities: seedActivities,

      addAssessment: (a) => {
        const rec: Assessment = { ...a, id: makeId("as"), created_at: now(), updated_at: now(), created_by: a.patient_user_id };
        set((s) => ({ assessments: [...s.assessments, rec] }));
        return rec;
      },
      addFile: (f) => {
        const rec: UploadedFile = { ...f, id: makeId("file"), created_at: now(), updated_at: now(), created_by: f.patient_user_id };
        set((s) => ({ files: [...s.files, rec] }));
        return rec;
      },
      addRoadmap: (r) => {
        const rec: Roadmap = { ...r, id: makeId("rm"), created_at: now(), updated_at: now(), created_by: r.patient_user_id };
        set((s) => ({ roadmaps: [...s.roadmaps, rec] }));
        return rec;
      },
      applyToClinic: ({ clinic_id, patient_user_id, assessment_id, roadmap_id, patient_name, patient_country, treatment, message }) => {
        const state = get();
        const assessment = state.assessments.find((a) => a.id === assessment_id);
        const existingPatient = state.patients.find(
          (patient) => patient.clinic_id === clinic_id && patient.user_id === patient_user_id,
        );
        const createdAt = now();
        const clinicPatient: Patient = existingPatient ?? {
          id: makeId("p"),
          clinic_id,
          user_id: patient_user_id,
          first_name: assessment?.personal.first_name ?? "",
          last_name: assessment?.personal.last_name ?? "",
          email: assessment?.personal.email ?? "",
          phone: assessment?.personal.phone,
          whatsapp: assessment?.personal.whatsapp,
          country: assessment?.personal.country || assessment?.travel.travel_from || patient_country,
          city: assessment?.personal.city,
          date_of_birth: assessment?.personal.date_of_birth,
          language: assessment?.personal.preferred_language,
          source: "smileabroad",
          assessment_id,
          roadmap_id,
          treatment_interest: assessment?.dental.treatment_interest || treatment,
          status: "active",
          created_at: createdAt,
          updated_at: createdAt,
          created_by: patient_user_id,
        };

        const existingApplication = state.applications.find(
          (application) =>
            application.clinic_id === clinic_id &&
            application.patient_user_id === patient_user_id &&
            application.status !== "declined",
        );
        const existingLead = existingApplication
          ? state.leads.find((lead) => lead.id === existingApplication.lead_id) ??
            state.leads.find(
              (lead) =>
                lead.clinic_application_id === existingApplication.id ||
                (lead.clinic_id === clinic_id &&
                  lead.patient_user_id === patient_user_id &&
                  lead.source === "assessment" &&
                  lead.roadmap_id === existingApplication.roadmap_id),
            )
          : undefined;

        const applicationId = existingApplication?.id ?? makeId("app");
        const leadId = existingLead?.id ?? makeId("l");
        const application: ClinicApplication = {
          ...(existingApplication ?? {
            id: applicationId,
            clinic_id,
            patient_user_id,
            assessment_id,
            roadmap_id,
            message,
            status: "submitted" as const,
            created_at: createdAt,
            created_by: patient_user_id,
          }),
          clinic_patient_id: clinicPatient.id,
          lead_id: leadId,
          updated_at: createdAt,
        };
        const lead: Lead = existingLead
          ? {
              ...existingLead,
              clinic_patient_id: clinicPatient.id,
              clinic_application_id: application.id,
              assessment_id: application.assessment_id,
              roadmap_id: application.roadmap_id,
              updated_at: createdAt,
            }
          : {
              id: leadId,
              clinic_id,
              patient_user_id,
              clinic_patient_id: clinicPatient.id,
              clinic_application_id: application.id,
              assessment_id: application.assessment_id,
              roadmap_id: application.roadmap_id,
              patient_name,
              patient_country,
              treatment,
              budget: assessment?.travel.budget,
              priority: "medium",
              source: "assessment",
              status: "new_lead",
              last_activity_at: createdAt,
              created_at: createdAt,
              updated_at: createdAt,
              created_by: patient_user_id,
            };
        const activity: LeadActivity | undefined = existingApplication
          ? undefined
          : {
              id: makeId("activity"),
              clinic_id,
              lead_id: lead.id,
              kind: "note",
              body: "Application received from SmileAbroad.",
              internal: false,
              created_at: createdAt,
              updated_at: createdAt,
              created_by: patient_user_id,
            };

        set((current) => ({
          patients: existingPatient ? current.patients : [...current.patients, clinicPatient],
          applications: existingApplication
            ? current.applications.map((item) => (item.id === application.id ? application : item))
            : [...current.applications, application],
          leads: existingLead
            ? current.leads.map((item) => (item.id === lead.id ? lead : item))
            : [lead, ...current.leads],
          activities: activity ? [...current.activities, activity] : current.activities,
        }));
        return application;
      },
      addLeadActivity: (activity) => {
        const timestamp = now();
        const rec: LeadActivity = {
          ...activity,
          id: makeId("activity"),
          created_at: timestamp,
          updated_at: timestamp,
        };
        set((s) => ({
          activities: [...s.activities, rec],
          leads: s.leads.map((lead) =>
            lead.id === activity.lead_id
              ? { ...lead, last_activity_at: timestamp, updated_at: timestamp }
              : lead,
          ),
        }));
        return rec;
      },
      updateLeadStatus: (id, status, changedBy = "system") => {
        const lead = get().leads.find((item) => item.id === id);
        if (!lead || lead.status === status) return;
        const timestamp = now();
        const activity: LeadActivity = {
          id: makeId("activity"),
          clinic_id: lead.clinic_id,
          lead_id: lead.id,
          kind: "status_change",
          body: `Status changed from ${lead.status.replace(/_/g, " ")} to ${status.replace(/_/g, " ")}.`,
          internal: true,
          created_at: timestamp,
          updated_at: timestamp,
          created_by: changedBy,
        };
        set((s) => ({
          leads: s.leads.map((item) =>
            item.id === id
              ? { ...item, status, updated_at: timestamp, last_activity_at: timestamp }
              : item,
          ),
          activities: [...s.activities, activity],
        }));
      },
      addTreatmentPlan: (tp) => {
        const rec: TreatmentPlan = { ...tp, id: makeId("tp"), created_at: now(), updated_at: now(), created_by: tp.patient_user_id };
        set((s) => ({ treatmentPlans: [...s.treatmentPlans, rec] }));
        return rec;
      },
      updateTreatmentPlan: (id, patch) =>
        set((s) => ({ treatmentPlans: s.treatmentPlans.map((t) => (t.id === id ? { ...t, ...patch, updated_at: now() } : t)) })),
      addQuote: (q) => {
        const existing = get().quotes.find(
          (quote) =>
            quote.clinic_id === q.clinic_id && quote.treatment_plan_id === q.treatment_plan_id,
        );
        if (existing) return existing;
        const plan = get().treatmentPlans.find((item) => item.id === q.treatment_plan_id);
        const shareToken = plan?.share_token ?? q.share_token ?? makeId("share");
        const rec: Quote = { ...q, share_token: shareToken, id: makeId("q"), created_at: now(), updated_at: now(), created_by: q.patient_user_id };
        set((s) => ({
          quotes: [...s.quotes, rec],
          treatmentPlans: s.treatmentPlans.map((item) =>
            item.id === q.treatment_plan_id && item.share_token !== shareToken
              ? { ...item, share_token: shareToken, updated_at: now() }
              : item,
          ),
        }));
        return rec;
      },
      updateBranding: (clinic_id, patch) =>
        set((s) => ({ branding: s.branding.map((b) => (b.clinic_id === clinic_id ? { ...b, ...patch, updated_at: now() } : b)) })),
      toggleTask: (id) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, updated_at: now() } : t)) })),
    }),
    {
      name: "smileabroad-mock-v1",
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Store;
        const patients = state.patients ?? [];
        const applications = (state.applications ?? []).map((application) => {
          const clinicPatient = patients.find(
            (patient) =>
              patient.clinic_id === application.clinic_id &&
              (patient.user_id === application.patient_user_id || patient.id === application.patient_user_id),
          );
          return clinicPatient && !application.clinic_patient_id
            ? { ...application, clinic_patient_id: clinicPatient.id }
            : application;
        });
        const leads = (state.leads ?? []).map((lead) => {
          const clinicPatient = patients.find(
            (patient) =>
              patient.clinic_id === lead.clinic_id &&
              (patient.user_id === lead.patient_user_id || patient.id === lead.patient_user_id),
          );
          const application = applications.find(
            (item) =>
              item.clinic_id === lead.clinic_id && item.patient_user_id === lead.patient_user_id,
          );
          return {
            ...lead,
            clinic_patient_id: lead.clinic_patient_id ?? clinicPatient?.id,
            clinic_application_id: lead.clinic_application_id ?? application?.id,
            assessment_id: lead.assessment_id ?? application?.assessment_id,
            roadmap_id: lead.roadmap_id ?? application?.roadmap_id,
          };
        });
        const linkedApplications = applications.map((application) => {
          const lead = leads.find((item) => item.clinic_application_id === application.id);
          return lead && !application.lead_id ? { ...application, lead_id: lead.id } : application;
        });
        const treatmentPlans = (state.treatmentPlans ?? []).map((plan) => {
          const quote = (state.quotes ?? []).find((item) => item.treatment_plan_id === plan.id);
          const shareToken = plan.share_token ?? quote?.share_token ?? `share_${plan.id}`;
          return plan.share_token === shareToken ? plan : { ...plan, share_token: shareToken };
        });
        const quotes = (state.quotes ?? []).map((quote) => {
          const plan = treatmentPlans.find((item) => item.id === quote.treatment_plan_id);
          return plan && !quote.share_token
            ? { ...quote, share_token: plan.share_token }
            : quote;
        });
        return {
          ...state,
          assessments: (state.assessments ?? []).map((assessment) =>
            migrateAssessment(assessment as LegacyAssessment),
          ),
          applications: linkedApplications,
          leads,
          treatmentPlans,
          quotes,
        };
      },
    },
  ),
);

export function useMockStoreHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsubscribe = useMockStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useMockStore.persist.hasHydrated());
    return unsubscribe;
  }, []);
  return hydrated;
}

// Tenant-scoped selectors (simulate RLS filtering)
export const selectClinicLeads = (clinicId: string) => (s: Store) => s.leads.filter((l) => l.clinic_id === clinicId);
export const selectClinicPatients = (clinicId: string) => (s: Store) => s.patients.filter((p) => p.clinic_id === clinicId);
export const selectClinicTasks = (clinicId: string) => (s: Store) => s.tasks.filter((t) => t.clinic_id === clinicId);
export const selectClinicAppointments = (clinicId: string) => (s: Store) => s.appointments.filter((a) => a.clinic_id === clinicId);
export const selectClinicPlans = (clinicId: string) => (s: Store) => s.treatmentPlans.filter((t) => t.clinic_id === clinicId);
export const selectClinicQuotes = (clinicId: string) => (s: Store) => s.quotes.filter((q) => q.clinic_id === clinicId);
export const selectClinicBranding = (clinicId: string) => (s: Store) => s.branding.find((b) => b.clinic_id === clinicId);

// Patient-scoped selectors. Missing identity deliberately returns no records.
export const selectPatientAssessments = (patientUserId?: string) => (s: Store) =>
  patientUserId ? s.assessments.filter((a) => a.patient_user_id === patientUserId) : [];
export const selectPatientRoadmaps = (patientUserId?: string) => (s: Store) =>
  patientUserId ? s.roadmaps.filter((r) => r.patient_user_id === patientUserId) : [];
export const selectPatientApplications = (patientUserId?: string) => (s: Store) =>
  patientUserId ? s.applications.filter((a) => a.patient_user_id === patientUserId) : [];
export const selectPatientPlans = (patientUserId?: string) => (s: Store) =>
  patientUserId ? s.treatmentPlans.filter((p) => p.patient_user_id === patientUserId) : [];
export const selectPatientQuotes = (patientUserId?: string) => (s: Store) =>
  patientUserId ? s.quotes.filter((q) => q.patient_user_id === patientUserId) : [];
