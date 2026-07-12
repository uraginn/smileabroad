import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type {
  Clinic,
  Lead,
  LeadStatus,
  Patient,
  TreatmentPlan,
  Quote,
  ClinicBranding,
  Task,
  Appointment,
  User,
  ClinicApplication,
  Roadmap,
  Assessment,
  UploadedFile,
  LeadActivity,
  ClinicTreatmentDefinition,
  DentalPlanTemplate,
  ClinicHotel,
} from "@/types/models";
import {
  seedClinics,
  seedBranding,
  seedUsers,
  seedPatients,
  seedLeads,
  seedTreatmentPlans,
  seedQuotes,
  seedTasks,
  seedAppointments,
  seedApplications,
  seedRoadmaps,
  seedAssessments,
  seedFiles,
  seedActivities,
  makeId,
  now,
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
  clinicTreatmentDefinitions: ClinicTreatmentDefinition[];
  dentalPlanTemplates: DentalPlanTemplate[];
  clinicHotels: ClinicHotel[];

  addPatient: (
    patient: Omit<Patient, "id" | "created_at" | "updated_at" | "created_by">,
    createdBy?: string,
  ) => Patient;
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  addAssessment: (
    a: Omit<Assessment, "id" | "created_at" | "updated_at" | "created_by">,
  ) => Assessment;
  addFile: (
    f: Omit<UploadedFile, "id" | "created_at" | "updated_at" | "created_by">,
  ) => UploadedFile;
  addRoadmap: (r: Omit<Roadmap, "id" | "created_at" | "updated_at" | "created_by">) => Roadmap;
  applyToClinic: (input: {
    clinic_id: string;
    patient_user_id: string;
    assessment_id: string;
    roadmap_id: string;
    patient_name: string;
    patient_country: string;
    treatment: string;
    message?: string;
  }) => ClinicApplication;
  addLeadActivity: (
    activity: Omit<LeadActivity, "id" | "created_at" | "updated_at">,
  ) => LeadActivity;
  updateLeadStatus: (id: string, status: LeadStatus, changedBy?: string) => void;
  addTreatmentPlan: (
    tp: Omit<TreatmentPlan, "id" | "created_at" | "updated_at" | "created_by">,
    createdBy?: string,
  ) => TreatmentPlan;
  updateTreatmentPlan: (id: string, patch: Partial<TreatmentPlan>, changedBy?: string) => void;
  addQuote: (q: Omit<Quote, "id" | "created_at" | "updated_at" | "created_by">) => Quote;
  updateQuote: (id: string, patch: Partial<Quote>, changedBy?: string) => void;
  updateBranding: (clinic_id: string, patch: Partial<ClinicBranding>) => void;
  addTask: (
    task: Omit<Task, "id" | "created_at" | "updated_at" | "created_by">,
    createdBy?: string,
  ) => Task;
  toggleTask: (id: string, changedBy?: string) => void;
  saveClinicTreatmentDefinition: (
    record: Omit<ClinicTreatmentDefinition, "created_at" | "updated_at" | "created_by">,
    changedBy?: string,
  ) => void;
  deleteClinicTreatmentDefinition: (id: string, clinicId: string) => void;
  saveDentalPlanTemplate: (
    record: Omit<DentalPlanTemplate, "created_at" | "updated_at" | "created_by">,
    changedBy?: string,
  ) => void;
  deleteDentalPlanTemplate: (id: string, clinicId: string) => void;
  saveClinicHotel: (
    record: Omit<ClinicHotel, "created_at" | "updated_at" | "created_by">,
    changedBy?: string,
  ) => void;
  deleteClinicHotel: (id: string, clinicId: string) => void;
  updateClinicDentist: (id: string, clinicId: string, patch: Partial<User>) => void;
  addClinicDentist: (
    record: Omit<User, "id" | "created_at" | "updated_at" | "created_by">,
    changedBy?: string,
  ) => User;
  deleteClinicDentist: (id: string, clinicId: string) => void;
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
  if (
    assessment.dental &&
    assessment.personal &&
    assessment.medical &&
    assessment.travel &&
    assessment.uploads
  ) {
    return {
      ...assessment,
      dental: {
        ...assessment.dental,
        treatment_interest: assessment.dental.treatment_interest ?? "",
      },
      personal: {
        ...assessment.personal,
        first_name: assessment.personal.first_name ?? "",
        email: assessment.personal.email ?? "",
      },
      medical: {
        ...assessment.medical,
        conditions: Array.isArray(assessment.medical.conditions)
          ? assessment.medical.conditions
          : [],
        medication_groups: Array.isArray(assessment.medical.medication_groups)
          ? assessment.medical.medication_groups
          : [],
        allergy_groups: Array.isArray(assessment.medical.allergy_groups)
          ? assessment.medical.allergy_groups
          : [],
        smoking: assessment.medical.smoking ?? false,
        pregnancy: assessment.medical.pregnancy ?? false,
      },
      travel: {
        ...assessment.travel,
        destination_country: assessment.travel.destination_country ?? "",
        preferred_cities: Array.isArray(assessment.travel.preferred_cities)
          ? assessment.travel.preferred_cities
          : [],
        companions: assessment.travel.companions ?? 0,
        needs_hotel: assessment.travel.needs_hotel ?? false,
        needs_airport_transfer: assessment.travel.needs_airport_transfer ?? false,
      },
      uploads: {
        uploaded_panoramic: assessment.uploads.uploaded_panoramic ?? false,
        uploaded_smile_photo: assessment.uploads.uploaded_smile_photo ?? false,
        uploaded_cbct: assessment.uploads.uploaded_cbct ?? false,
        uploaded_dental_photos: assessment.uploads.uploaded_dental_photos ?? false,
        uploaded_previous_plan: assessment.uploads.uploaded_previous_plan ?? false,
        uploaded_previous_report: assessment.uploads.uploaded_previous_report ?? false,
      },
    };
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
      clinicTreatmentDefinitions: [],
      dentalPlanTemplates: [],
      clinicHotels: [],

      addPatient: (patient, createdBy = "system") => {
        const timestamp = now();
        const rec: Patient = {
          ...patient,
          id: makeId("pt"),
          created_at: timestamp,
          updated_at: timestamp,
          created_by: createdBy,
        };
        set((s) => ({ patients: [...s.patients, rec] }));
        return rec;
      },
      updatePatient: (id, patch) =>
        set((s) => ({
          patients: s.patients.map((patient) =>
            patient.id === id
              ? { ...patient, ...patch, id: patient.id, updated_at: now() }
              : patient,
          ),
        })),
      addAssessment: (a) => {
        const rec: Assessment = {
          ...a,
          id: makeId("as"),
          created_at: now(),
          updated_at: now(),
          created_by: a.patient_user_id,
        };
        set((s) => ({ assessments: [...s.assessments, rec] }));
        return rec;
      },
      addFile: (f) => {
        const rec: UploadedFile = {
          ...f,
          id: makeId("file"),
          created_at: now(),
          updated_at: now(),
          created_by: f.patient_user_id,
        };
        set((s) => ({ files: [...s.files, rec] }));
        return rec;
      },
      addRoadmap: (r) => {
        const rec: Roadmap = {
          ...r,
          id: makeId("rm"),
          created_at: now(),
          updated_at: now(),
          created_by: r.patient_user_id,
        };
        set((s) => ({ roadmaps: [...s.roadmaps, rec] }));
        return rec;
      },
      applyToClinic: ({
        clinic_id,
        patient_user_id,
        assessment_id,
        roadmap_id,
        patient_name,
        patient_country,
        treatment,
        message,
      }) => {
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
          country:
            assessment?.personal.country || assessment?.travel.travel_from || patient_country,
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
          ? (state.leads.find((lead) => lead.id === existingApplication.lead_id) ??
            state.leads.find(
              (lead) =>
                lead.clinic_application_id === existingApplication.id ||
                (lead.clinic_id === clinic_id &&
                  lead.patient_user_id === patient_user_id &&
                  lead.source === "assessment" &&
                  lead.roadmap_id === existingApplication.roadmap_id),
            ))
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
      addTreatmentPlan: (tp, createdBy = "system") => {
        const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
        const existingDraft = get().treatmentPlans.find(
          (plan) =>
            plan.clinic_id === tp.clinic_id &&
            plan.clinic_patient_id === tp.clinic_patient_id &&
            (plan.status ?? "draft") === "draft" &&
            plan.items.length === 0 &&
            +new Date(plan.created_at) >= recentCutoff,
        );
        if (existingDraft) return existingDraft;
        const timestamp = now();
        const rec: TreatmentPlan = {
          ...tp,
          status: tp.status ?? "draft",
          id: makeId("tp"),
          created_at: timestamp,
          updated_at: timestamp,
          created_by: createdBy,
        };
        const lead = get().leads.find(
          (item) =>
            item.clinic_id === tp.clinic_id &&
            (item.clinic_patient_id === tp.clinic_patient_id ||
              item.patient_user_id === tp.patient_user_id),
        );
        const activity: LeadActivity | undefined = lead
          ? {
              id: makeId("activity"),
              clinic_id: tp.clinic_id,
              lead_id: lead.id,
              kind: "note",
              body: `Treatment plan created: ${rec.title}`,
              internal: true,
              created_at: timestamp,
              updated_at: timestamp,
              created_by: createdBy,
            }
          : undefined;
        const shouldMoveLead =
          lead &&
          [
            "new_lead",
            "contacted",
            "awaiting_images",
            "doctor_review",
            "assessment_submitted",
            "awaiting_review",
          ].includes(lead.status);
        set((s) => ({
          treatmentPlans: [...s.treatmentPlans, rec],
          activities: activity ? [...s.activities, activity] : s.activities,
          leads: lead
            ? s.leads.map((item) =>
                item.id === lead.id
                  ? {
                      ...item,
                      status: shouldMoveLead ? "treatment_planning" : item.status,
                      last_activity_at: timestamp,
                      updated_at: timestamp,
                    }
                  : item,
              )
            : s.leads,
        }));
        return rec;
      },
      updateTreatmentPlan: (id, patch, changedBy = "system") => {
        const plan = get().treatmentPlans.find((item) => item.id === id);
        if (!plan) return;
        const timestamp = now();
        const statusChanged = patch.status && patch.status !== (plan.status ?? "draft");
        const lead = statusChanged
          ? get().leads.find(
              (item) =>
                item.clinic_id === plan.clinic_id &&
                (item.clinic_patient_id === plan.clinic_patient_id ||
                  item.patient_user_id === plan.patient_user_id),
            )
          : undefined;
        const activity: LeadActivity | undefined = lead
          ? {
              id: makeId("activity"),
              clinic_id: plan.clinic_id,
              lead_id: lead.id,
              kind: "status_change",
              body: `Treatment plan status changed from ${(plan.status ?? "draft").replace(/_/g, " ")} to ${patch.status!.replace(/_/g, " ")}.`,
              internal: true,
              created_at: timestamp,
              updated_at: timestamp,
              created_by: changedBy,
            }
          : undefined;
        set((s) => ({
          treatmentPlans: s.treatmentPlans.map((item) =>
            item.id === id ? { ...item, ...patch, updated_at: timestamp } : item,
          ),
          activities: activity ? [...s.activities, activity] : s.activities,
          leads: lead
            ? s.leads.map((item) =>
                item.id === lead.id
                  ? { ...item, last_activity_at: timestamp, updated_at: timestamp }
                  : item,
              )
            : s.leads,
        }));
      },
      addQuote: (q) => {
        const existing = get().quotes.find(
          (quote) =>
            quote.clinic_id === q.clinic_id && quote.treatment_plan_id === q.treatment_plan_id,
        );
        if (existing) return existing;
        const groupedItems = Array.from(
          q.items
            .reduce((groups, item) => {
              const label = item.label.replace(/^Tooth \d+ · /, "");
              const key = `${label}|${item.unit_price}`;
              const existing = groups.get(key);
              groups.set(
                key,
                existing ? { ...existing, qty: existing.qty + item.qty } : { ...item, label },
              );
              return groups;
            }, new Map<string, Quote["items"][number]>())
            .values(),
        );
        const rec: Quote = {
          ...q,
          items: groupedItems,
          status: q.status ?? "draft",
          share_token: undefined,
          id: makeId("q"),
          created_at: now(),
          updated_at: now(),
          created_by: q.patient_user_id,
        };
        set((s) => ({
          quotes: [...s.quotes, rec],
        }));
        return rec;
      },
      updateQuote: (id, patch, changedBy = "system") => {
        const quote = get().quotes.find((item) => item.id === id);
        if (!quote) return;
        const timestamp = now();
        const nextStatus = patch.status ?? quote.status ?? "draft";
        const shareToken = ["approved", "sent"].includes(nextStatus)
          ? (quote.share_token ?? makeId("share"))
          : quote.share_token;
        const previousStatus = quote.status ?? "draft";
        const sentNow = nextStatus === "sent" && previousStatus !== "sent";
        const publicStatusChanged =
          nextStatus !== previousStatus && ["sent", "viewed", "accepted"].includes(nextStatus);
        const lead = get().leads.find(
          (item) =>
            item.clinic_id === quote.clinic_id &&
            (item.clinic_patient_id === quote.clinic_patient_id ||
              item.patient_user_id === quote.patient_user_id),
        );
        const activity: LeadActivity | undefined =
          publicStatusChanged && lead
            ? {
                id: makeId("activity"),
                clinic_id: quote.clinic_id,
                lead_id: lead.id,
                kind: "status_change",
                body: `Quote ${quote.id.slice(0, 8)} marked as ${nextStatus}.`,
                internal: true,
                created_at: timestamp,
                updated_at: timestamp,
                created_by: changedBy,
              }
            : undefined;
        set((s) => ({
          quotes: s.quotes.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                  status: nextStatus,
                  share_token: shareToken,
                  updated_at: timestamp,
                }
              : item,
          ),
          treatmentPlans: shareToken
            ? s.treatmentPlans.map((plan) =>
                plan.id === quote.treatment_plan_id
                  ? { ...plan, share_token: shareToken, updated_at: timestamp }
                  : plan,
              )
            : s.treatmentPlans,
          activities: activity ? [...s.activities, activity] : s.activities,
          leads: lead
            ? s.leads.map((item) =>
                item.id === lead.id
                  ? {
                      ...item,
                      status: sentNow ? "quote_sent" : item.status,
                      last_activity_at: timestamp,
                      updated_at: timestamp,
                    }
                  : item,
              )
            : s.leads,
        }));
      },
      updateBranding: (clinic_id, patch) =>
        set((s) => ({
          branding: s.branding.map((b) =>
            b.clinic_id === clinic_id ? { ...b, ...patch, updated_at: now() } : b,
          ),
        })),
      addTask: (task, createdBy = "system") => {
        const timestamp = now();
        const rec: Task = {
          ...task,
          id: makeId("task"),
          created_at: timestamp,
          updated_at: timestamp,
          created_by: createdBy,
        };
        const activity: LeadActivity | undefined = task.lead_id
          ? {
              id: makeId("activity"),
              clinic_id: task.clinic_id,
              lead_id: task.lead_id,
              kind: "task",
              body:
                task.category === "follow_up"
                  ? `Follow-up scheduled: ${task.title}`
                  : `Task created: ${task.title}`,
              internal: true,
              created_at: timestamp,
              updated_at: timestamp,
              created_by: createdBy,
            }
          : undefined;
        set((s) => ({
          tasks: [rec, ...s.tasks],
          activities: activity ? [...s.activities, activity] : s.activities,
          leads: activity
            ? s.leads.map((lead) =>
                lead.id === task.lead_id
                  ? { ...lead, last_activity_at: timestamp, updated_at: timestamp }
                  : lead,
              )
            : s.leads,
        }));
        return rec;
      },
      toggleTask: (id, changedBy = "system") => {
        const task = get().tasks.find((item) => item.id === id);
        if (!task) return;
        const timestamp = now();
        const done = !task.done;
        const activity: LeadActivity | undefined = task.lead_id
          ? {
              id: makeId("activity"),
              clinic_id: task.clinic_id,
              lead_id: task.lead_id,
              kind: "task",
              body: `Task ${done ? "completed" : "reopened"}: ${task.title}`,
              internal: true,
              created_at: timestamp,
              updated_at: timestamp,
              created_by: changedBy,
            }
          : undefined;
        set((s) => ({
          tasks: s.tasks.map((item) =>
            item.id === id ? { ...item, done, updated_at: timestamp } : item,
          ),
          activities: activity ? [...s.activities, activity] : s.activities,
          leads: activity
            ? s.leads.map((lead) =>
                lead.id === task.lead_id
                  ? { ...lead, last_activity_at: timestamp, updated_at: timestamp }
                  : lead,
              )
            : s.leads,
        }));
      },
      saveClinicTreatmentDefinition: (record, changedBy = "system") =>
        set((s) => {
          const existing = s.clinicTreatmentDefinitions.find(
            (item) => item.id === record.id && item.clinic_id === record.clinic_id,
          );
          const timestamp = now();
          const next: ClinicTreatmentDefinition = existing
            ? { ...existing, ...record, updated_at: timestamp }
            : { ...record, created_at: timestamp, updated_at: timestamp, created_by: changedBy };
          return {
            clinicTreatmentDefinitions: existing
              ? s.clinicTreatmentDefinitions.map((item) =>
                  item.id === next.id && item.clinic_id === next.clinic_id ? next : item,
                )
              : [...s.clinicTreatmentDefinitions, next],
          };
        }),
      deleteClinicTreatmentDefinition: (id, clinicId) =>
        set((s) => ({
          clinicTreatmentDefinitions: s.clinicTreatmentDefinitions.filter(
            (item) => item.id !== id || item.clinic_id !== clinicId || item.system,
          ),
        })),
      saveDentalPlanTemplate: (record, changedBy = "system") =>
        set((s) => {
          const existing = s.dentalPlanTemplates.find(
            (item) => item.id === record.id && item.clinic_id === record.clinic_id,
          );
          const timestamp = now();
          const next: DentalPlanTemplate = existing
            ? { ...existing, ...record, updated_at: timestamp }
            : { ...record, created_at: timestamp, updated_at: timestamp, created_by: changedBy };
          return {
            dentalPlanTemplates: existing
              ? s.dentalPlanTemplates.map((item) =>
                  item.id === next.id && item.clinic_id === next.clinic_id ? next : item,
                )
              : [...s.dentalPlanTemplates, next],
          };
        }),
      deleteDentalPlanTemplate: (id, clinicId) =>
        set((s) => ({
          dentalPlanTemplates: s.dentalPlanTemplates.filter(
            (item) => item.id !== id || item.clinic_id !== clinicId,
          ),
        })),
      saveClinicHotel: (record, changedBy = "system") =>
        set((s) => {
          const existing = s.clinicHotels.find(
            (item) => item.id === record.id && item.clinic_id === record.clinic_id,
          );
          const timestamp = now();
          const next: ClinicHotel = existing
            ? { ...existing, ...record, updated_at: timestamp }
            : { ...record, created_at: timestamp, updated_at: timestamp, created_by: changedBy };
          const records = existing
            ? s.clinicHotels.map((item) =>
                item.id === next.id && item.clinic_id === next.clinic_id ? next : item,
              )
            : [...s.clinicHotels, next];
          return {
            clinicHotels: records.map((item) =>
              item.clinic_id === next.clinic_id && item.id !== next.id && next.is_default
                ? { ...item, is_default: false, updated_at: timestamp }
                : item,
            ),
          };
        }),
      deleteClinicHotel: (id, clinicId) =>
        set((s) => ({
          clinicHotels: s.clinicHotels.filter(
            (item) => item.id !== id || item.clinic_id !== clinicId,
          ),
        })),
      updateClinicDentist: (id, clinicId, patch) =>
        set((s) => ({
          users: s.users.map((item) =>
            item.id === id && item.clinic_id === clinicId && item.role === "dentist"
              ? {
                  ...item,
                  ...patch,
                  id: item.id,
                  clinic_id: item.clinic_id,
                  role: "dentist",
                  updated_at: now(),
                }
              : item,
          ),
        })),
      addClinicDentist: (record, changedBy = "system") => {
        const timestamp = now();
        const rec: User = {
          ...record,
          id: makeId("usr"),
          role: "dentist",
          created_at: timestamp,
          updated_at: timestamp,
          created_by: changedBy,
        };
        set((s) => ({ users: [...s.users, rec] }));
        return rec;
      },
      deleteClinicDentist: (id, clinicId) =>
        set((s) => ({
          users: s.treatmentPlans.some(
            (plan) => plan.clinic_id === clinicId && plan.dentist_id === id,
          )
            ? s.users.map((item) =>
                item.id === id && item.clinic_id === clinicId
                  ? { ...item, active: false, updated_at: now() }
                  : item,
              )
            : s.users.filter(
                (item) => item.id !== id || item.clinic_id !== clinicId || item.role !== "dentist",
              ),
        })),
    }),
    {
      name: "smileabroad-mock-v1",
      version: 10,
      migrate: (persistedState) => {
        const state = persistedState as Store;
        const patients = state.patients ?? [];
        const applications = (state.applications ?? []).map((application) => {
          const clinicPatient = patients.find(
            (patient) =>
              patient.clinic_id === application.clinic_id &&
              (patient.user_id === application.patient_user_id ||
                patient.id === application.patient_user_id),
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
            status:
              lead.status === "assessment_submitted"
                ? "new_lead"
                : lead.status === "awaiting_review"
                  ? "doctor_review"
                  : lead.status,
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
          return {
            ...plan,
            status: plan.status ?? "draft",
            items: Array.isArray(plan.items) ? plan.items : [],
            clinical_findings: Array.isArray(plan.clinical_findings) ? plan.clinical_findings : [],
            treatment_objectives: Array.isArray(plan.treatment_objectives)
              ? plan.treatment_objectives
              : [],
            alternatives: Array.isArray(plan.alternatives) ? plan.alternatives : [],
            risks: Array.isArray(plan.risks) ? plan.risks : [],
            exclusions: Array.isArray(plan.exclusions) ? plan.exclusions : [],
            materials: Array.isArray(plan.materials) ? plan.materials : [],
            implant_systems: Array.isArray(plan.implant_systems) ? plan.implant_systems : [],
            treatment_stages: Array.isArray(plan.treatment_stages)
              ? plan.treatment_stages.map((stage) => ({
                  ...stage,
                  procedures: Array.isArray(stage.procedures) ? stage.procedures : [],
                }))
              : [],
            visit_plan: Array.isArray(plan.visit_plan)
              ? plan.visit_plan.map((visit) => ({
                  ...visit,
                  procedures: Array.isArray(visit.procedures) ? visit.procedures : [],
                }))
              : [],
            share_token: shareToken,
          };
        });
        const quotes = (state.quotes ?? []).map((quote) => {
          const plan = treatmentPlans.find((item) => item.id === quote.treatment_plan_id);
          return {
            ...quote,
            items: Array.isArray(quote.items) ? quote.items : [],
            payment_schedule: Array.isArray(quote.payment_schedule) ? quote.payment_schedule : [],
            included_services: Array.isArray(quote.included_services)
              ? quote.included_services
              : [],
            excluded_services: Array.isArray(quote.excluded_services)
              ? quote.excluded_services
              : [],
            share_token: quote.share_token ?? plan?.share_token,
          };
        });
        return {
          ...state,
          clinics: (state.clinics ?? seedClinics).map((clinic) => ({
            ...clinic,
            languages: Array.isArray(clinic.languages) ? clinic.languages : [],
          })),
          branding: (state.branding ?? seedBranding).map((item) => ({
            ...item,
            doctors: Array.isArray(item.doctors) ? item.doctors : [],
            guarantees: Array.isArray(item.guarantees) ? item.guarantees : [],
          })),
          assessments: (state.assessments ?? []).map((assessment) =>
            migrateAssessment(assessment as LegacyAssessment),
          ),
          applications: linkedApplications,
          leads,
          treatmentPlans,
          quotes,
          clinicTreatmentDefinitions: (state.clinicTreatmentDefinitions ?? []).map((legacy) => {
            const { svg_asset: _obsoleteSvg, ...item } = legacy as typeof legacy & {
              svg_asset?: unknown;
            };
            const baseTreatmentKey =
              item.base_treatment_key ?? (item.system ? item.treatment_key : "other");
            return {
              ...item,
              prices: item.prices ?? {},
              active: item.active !== false,
              base_treatment_key: baseTreatmentKey,
              visual_key: item.visual_key ?? (item.system ? baseTreatmentKey : "dental-implant"),
              rule_profile_key: item.rule_profile_key ?? baseTreatmentKey,
            };
          }),
          dentalPlanTemplates: (state.dentalPlanTemplates ?? []).map((item) => ({
            ...item,
            active: item.active !== false,
          })),
          clinicHotels: (state.clinicHotels ?? []).map((item) => ({
            ...item,
            categories: Array.isArray(item.categories)
              ? item.categories
              : [(item as typeof item & { category?: string }).category ?? "Standard"],
            room_types: Array.isArray(item.room_types) ? item.room_types : [],
            board_types: Array.isArray(item.board_types) ? item.board_types : [],
            images: Array.isArray(item.images) ? item.images.slice(0, 4) : [],
            active: item.active !== false,
          })),
          roadmaps: (state.roadmaps ?? []).map((roadmap) => ({
            ...roadmap,
            recommended_clinic_ids: Array.isArray(roadmap.recommended_clinic_ids)
              ? roadmap.recommended_clinic_ids
              : [],
          })),
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
export const selectClinicLeads = (clinicId: string) => (s: Store) =>
  s.leads.filter((l) => l.clinic_id === clinicId);
export const selectClinicPatients = (clinicId: string) => (s: Store) =>
  s.patients.filter((p) => p.clinic_id === clinicId);
export const selectClinicTasks = (clinicId: string) => (s: Store) =>
  s.tasks.filter((t) => t.clinic_id === clinicId);
export const selectClinicAppointments = (clinicId: string) => (s: Store) =>
  s.appointments.filter((a) => a.clinic_id === clinicId);
export const selectClinicPlans = (clinicId: string) => (s: Store) =>
  (s.treatmentPlans ?? []).filter((t) => t.clinic_id === clinicId);
export const selectClinicQuotes = (clinicId: string) => (s: Store) =>
  s.quotes.filter((q) => q.clinic_id === clinicId);
export const selectClinicBranding = (clinicId: string) => (s: Store) =>
  s.branding.find((b) => b.clinic_id === clinicId);
