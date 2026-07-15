import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  Clinic,
  Lead,
  LeadStatus,
  Patient,
  TreatmentPlan,
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
  RoadmapCountryTreatmentPrice,
  RoadmapTreatmentContent,
  TreatmentPlanPriceItem,
  TreatmentPlanStatus,
  ClinicNotification,
  LeadFollowUp,
  CommunicationTemplate,
  ClinicCrmSettings,
} from "@/types/models";
import { dedupeTreatmentPlanPriceItems } from "@/lib/treatment-plan-commercial";
import { mergeLegacyQuoteIntoTreatmentPlan } from "@/lib/legacy-quote-compat";
import {
  canTransitionTreatmentPlanStatus,
  normalizeTreatmentPlanStatus,
} from "@/lib/treatment-plan-status";
import type { LegacyQuote } from "@/lib/mock/migrations/legacy-quote.types";
import {
  DEFAULT_ROADMAP_COUNTRY_PRICES,
  DEFAULT_ROADMAP_TREATMENT_CONTENT,
} from "@/lib/roadmap-engine";
import {
  seedClinics,
  seedBranding,
  seedUsers,
  seedPatients,
  seedLeads,
  seedTreatmentPlans,
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
import { migrateLegacyPlannerAssets } from "@/features/dentalplan/adapters/plannerAssetStorage";
import { createDentalPlan } from "@/features/dentalplan/utils/createDentalPlan";
import type { DentalPlan } from "@/features/dentalplan/types/dental-plan.types";

const MOCK_STORAGE_KEY = "smileabroad-mock-v1";
const MOCK_STORAGE_VERSION = 25;
const DTKURT_CLINIC_ID = "clinic_istanbul";
const OBSOLETE_PLANNER_DRAFT_KEYS = [
  "smileabroad.dentalplan.dev.v2",
  "smileabroad.dentalplan.dev.v3",
  "smileabroad.dentalplan.dev.v4",
  "smileabroad.dentalplan.dev.v5",
];

type AtomicTreatmentPlanInput = Pick<TreatmentPlan, "clinic_id"> &
  Partial<
    Omit<
      TreatmentPlan,
      | "id"
      | "created_at"
      | "updated_at"
      | "created_by"
      | "clinic_id"
      | "patient_user_id"
      | "clinic_patient_id"
    >
  >;

type AtomicPatientPlanInput = {
  patient_id?: string;
  patient?: Omit<Patient, "id" | "created_at" | "updated_at" | "created_by">;
  plan: AtomicTreatmentPlanInput;
};

interface Store {
  clinics: Clinic[];
  branding: ClinicBranding[];
  users: User[];
  patients: Patient[];
  leads: Lead[];
  treatmentPlans: TreatmentPlan[];
  tasks: Task[];
  appointments: Appointment[];
  applications: ClinicApplication[];
  roadmaps: Roadmap[];
  assessments: Assessment[];
  files: UploadedFile[];
  activities: LeadActivity[];
  notifications: ClinicNotification[];
  followUps: LeadFollowUp[];
  communicationTemplates: CommunicationTemplate[];
  crmSettings: ClinicCrmSettings[];
  clinicTreatmentDefinitions: ClinicTreatmentDefinition[];
  dentalPlanTemplates: DentalPlanTemplate[];
  clinicHotels: ClinicHotel[];
  roadmapCountryPrices: RoadmapCountryTreatmentPrice[];
  roadmapTreatmentContent: RoadmapTreatmentContent[];

  addPatient: (
    patient: Omit<Patient, "id" | "created_at" | "updated_at" | "created_by">,
    createdBy?: string,
  ) => Patient;
  updatePatient: (id: string, patch: Partial<Patient>, changedBy?: string) => void;
  updatePatientAssignment: (
    id: string,
    clinicId: string,
    patch: Pick<Patient, "coordinator_id" | "dentist_id">,
    changedBy?: string,
  ) => void;
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
    contact?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      whatsapp?: string;
      preferred_contact_method?: string;
    };
  }) => ClinicApplication;
  addLeadActivity: (
    activity: Omit<LeadActivity, "id" | "created_at" | "updated_at">,
  ) => LeadActivity;
  updateLeadStatus: (id: string, status: LeadStatus, changedBy?: string, reason?: string) => void;
  updateLead: (id: string, clinicId: string, patch: Partial<Lead>, changedBy?: string) => void;
  addTreatmentPlan: (
    tp: Omit<TreatmentPlan, "id" | "created_at" | "updated_at" | "created_by">,
    createdBy?: string,
  ) => TreatmentPlan;
  createPatientAndTreatmentPlan: (
    input: AtomicPatientPlanInput,
    createdBy?: string,
  ) => { patient: Patient; plan: TreatmentPlan };
  updateTreatmentPlan: (id: string, patch: Partial<TreatmentPlan>, changedBy?: string) => void;
  upsertTreatmentPlanPriceItems: (
    id: string,
    clinicId: string,
    items: TreatmentPlanPriceItem[],
    changedBy?: string,
  ) => void;
  updateTreatmentPlanStatus: (
    id: string,
    clinicId: string,
    status: TreatmentPlanStatus,
    changedBy?: string,
  ) => void;
  ensureTreatmentPlanShareToken: (
    id: string,
    clinicId: string,
    changedBy?: string,
  ) => string | undefined;
  markTreatmentPlanSent: (id: string, clinicId: string, changedBy?: string) => void;
  markTreatmentPlanViewed: (id: string, clinicId: string) => void;
  markTreatmentPlanAccepted: (id: string, clinicId: string) => void;
  markTreatmentPlanDeclined: (id: string, clinicId: string) => void;
  updateBranding: (clinic_id: string, patch: Partial<ClinicBranding>) => void;
  addTask: (
    task: Omit<Task, "id" | "created_at" | "updated_at" | "created_by">,
    createdBy?: string,
  ) => Task;
  toggleTask: (id: string, changedBy?: string) => void;
  updateTask: (id: string, clinicId: string, patch: Partial<Task>, changedBy?: string) => void;
  addAppointment: (
    record: Omit<Appointment, "id" | "created_at" | "updated_at" | "created_by">,
    createdBy?: string,
  ) => Appointment;
  updateAppointment: (
    id: string,
    clinicId: string,
    patch: Partial<Appointment>,
    changedBy?: string,
  ) => void;
  saveCommunicationTemplate: (
    record: Omit<CommunicationTemplate, "created_at" | "updated_at" | "created_by">,
    changedBy?: string,
  ) => void;
  deleteCommunicationTemplate: (id: string, clinicId: string) => void;
  updateClinic: (id: string, patch: Partial<Clinic>, changedBy?: string) => void;
  saveClinicUser: (
    record: Omit<User, "created_at" | "updated_at" | "created_by">,
    changedBy?: string,
  ) => void;
  saveCrmSettings: (
    clinicId: string,
    patch: Partial<ClinicCrmSettings>,
    changedBy?: string,
  ) => void;
  syncNotifications: (clinicId: string, userId: string, records: ClinicNotification[]) => void;
  markNotificationRead: (id: string, clinicId: string, userId?: string) => void;
  markAllNotificationsRead: (clinicId: string, userId?: string) => void;
  scheduleFollowUp: (
    record: Omit<LeadFollowUp, "id" | "created_at" | "updated_at" | "created_by" | "status">,
    createdBy?: string,
  ) => LeadFollowUp;
  completeFollowUp: (id: string, clinicId: string, changedBy?: string) => void;
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
  saveRoadmapCountryPrice: (
    record: Omit<RoadmapCountryTreatmentPrice, "created_at" | "updated_at" | "created_by">,
    changedBy?: string,
  ) => void;
  deleteRoadmapCountryPrice: (id: string, clinicId?: string) => void;
  saveRoadmapTreatmentContent: (
    record: Omit<RoadmapTreatmentContent, "created_at" | "updated_at" | "created_by">,
    changedBy?: string,
  ) => void;
}

type PersistedStore = Partial<Store>;

let lastPersistenceError: Error | undefined;
let storageErrorToastShown = false;

function isEmbeddedMedia(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:") ||
    normalized.includes("data:image/")
  );
}

function stripEmbeddedMedia<T>(value: T): T {
  if (typeof value === "string") return (isEmbeddedMedia(value) ? undefined : value) as T;
  if (Array.isArray(value)) {
    return value.map((item) => stripEmbeddedMedia(item)).filter((item) => item !== undefined) as T;
  }
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const sanitized = Object.fromEntries(
    Object.entries(source)
      .map(([key, item]) => [key, stripEmbeddedMedia(item)] as const)
      .filter(([, item]) => item !== undefined),
  );
  return sanitized as T;
}

function removeDtkurtPatientJourneyRecords(state: PersistedStore): PersistedStore {
  const dtkurtUserIds = new Set(
    (state.users ?? [])
      .filter((user) => user.clinic_id === DTKURT_CLINIC_ID)
      .map((user) => user.id),
  );
  const belongsToDtkurt = (record: { clinic_id?: string; created_by?: string }) => {
    const createdBy = record.created_by;
    return (
      record.clinic_id === DTKURT_CLINIC_ID || Boolean(createdBy && dtkurtUserIds.has(createdBy))
    );
  };
  const dtkurtPatients = (state.patients ?? []).filter((patient) => belongsToDtkurt(patient));
  const dtkurtApplications = (state.applications ?? []).filter((application) =>
    belongsToDtkurt(application),
  );
  const dtkurtLeads = (state.leads ?? []).filter((lead) => belongsToDtkurt(lead));
  const dtkurtPlans = (state.treatmentPlans ?? []).filter((plan) => belongsToDtkurt(plan));

  const patientUserIds = new Set(
    [
      ...dtkurtPatients.flatMap((patient) => [patient.id, patient.user_id]),
      ...dtkurtApplications.map((application) => application.patient_user_id),
      ...dtkurtLeads.map((lead) => lead.patient_user_id),
      ...dtkurtPlans.map((plan) => plan.patient_user_id),
    ].filter((id): id is string => Boolean(id)),
  );
  const assessmentIds = new Set(
    [
      ...dtkurtPatients.map((patient) => patient.assessment_id),
      ...dtkurtApplications.map((application) => application.assessment_id),
      ...dtkurtLeads.map((lead) => lead.assessment_id),
      ...dtkurtPlans.map((plan) => plan.assessment_id),
    ].filter((id): id is string => Boolean(id)),
  );
  const roadmapIds = new Set(
    [
      ...dtkurtPatients.map((patient) => patient.roadmap_id),
      ...dtkurtApplications.map((application) => application.roadmap_id),
      ...dtkurtLeads.map((lead) => lead.roadmap_id),
      ...dtkurtPlans.map((plan) => plan.roadmap_id),
    ].filter((id): id is string => Boolean(id)),
  );

  return {
    ...state,
    patients: (state.patients ?? []).filter((patient) => !belongsToDtkurt(patient)),
    leads: (state.leads ?? []).filter((lead) => !belongsToDtkurt(lead)),
    treatmentPlans: (state.treatmentPlans ?? []).filter((plan) => !belongsToDtkurt(plan)),
    tasks: (state.tasks ?? []).filter((task) => !belongsToDtkurt(task)),
    appointments: (state.appointments ?? []).filter((appointment) => !belongsToDtkurt(appointment)),
    applications: (state.applications ?? []).filter((application) => !belongsToDtkurt(application)),
    activities: (state.activities ?? []).filter((activity) => !belongsToDtkurt(activity)),
    notifications: (state.notifications ?? []).filter(
      (notification) => !belongsToDtkurt(notification),
    ),
    followUps: (state.followUps ?? []).filter((followUp) => !belongsToDtkurt(followUp)),
    assessments: (state.assessments ?? []).filter(
      (assessment) =>
        !dtkurtUserIds.has(assessment.created_by) &&
        !patientUserIds.has(assessment.patient_user_id) &&
        !assessmentIds.has(assessment.id),
    ),
    roadmaps: (state.roadmaps ?? []).filter(
      (roadmap) =>
        !dtkurtUserIds.has(roadmap.created_by) &&
        !patientUserIds.has(roadmap.patient_user_id) &&
        !roadmapIds.has(roadmap.id),
    ),
    files: (state.files ?? []).filter(
      (file) => !belongsToDtkurt(file) && !patientUserIds.has(file.patient_user_id),
    ),
  };
}

const initialPatientJourneyState = removeDtkurtPatientJourneyRecords({
  users: seedUsers,
  patients: seedPatients,
  leads: seedLeads,
  treatmentPlans: seedTreatmentPlans,
  tasks: seedTasks,
  appointments: seedAppointments,
  applications: seedApplications,
  roadmaps: seedRoadmaps,
  assessments: seedAssessments,
  files: seedFiles,
  activities: seedActivities,
});

function canonicalStoreState(state: Store): PersistedStore {
  const canonical: PersistedStore = {
    clinics: state.clinics,
    branding: state.branding,
    users: state.users,
    patients: state.patients,
    leads: state.leads,
    treatmentPlans: state.treatmentPlans,
    tasks: state.tasks,
    appointments: state.appointments,
    applications: state.applications,
    roadmaps: state.roadmaps,
    assessments: state.assessments,
    files: state.files,
    activities: state.activities,
    notifications: [...state.notifications]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 100),
    followUps: state.followUps,
    communicationTemplates: state.communicationTemplates,
    crmSettings: state.crmSettings,
    clinicTreatmentDefinitions: state.clinicTreatmentDefinitions,
    dentalPlanTemplates: state.dentalPlanTemplates,
    clinicHotels: state.clinicHotels,
    roadmapCountryPrices: state.roadmapCountryPrices,
    roadmapTreatmentContent: state.roadmapTreatmentContent,
  };
  return stripEmbeddedMedia(canonical);
}

function reportPersistenceError(error: unknown) {
  lastPersistenceError = error instanceof Error ? error : new Error(String(error));
  if (import.meta.env.DEV)
    console.error("SmileAbroad mock persistence failed", lastPersistenceError);
  if (typeof window !== "undefined" && typeof document !== "undefined" && !storageErrorToastShown) {
    storageErrorToastShown = true;
    toast.error("Storage limit reached. Large uploaded media has not been saved locally.");
  }
}

function serializePersistedState(state: Store) {
  return JSON.stringify({ state: canonicalStoreState(state), version: MOCK_STORAGE_VERSION });
}

function persistCanonicalStateOrThrow(state: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MOCK_STORAGE_KEY, serializePersistedState(state));
    lastPersistenceError = undefined;
    storageErrorToastShown = false;
  } catch (error) {
    reportPersistenceError(error);
    throw new Error(
      "The Patient and Treatment Plan could not be saved because browser storage is full.",
      { cause: error },
    );
  }
}

const safePersistStorage: PersistStorage<PersistedStore> = {
  getItem: async (name) => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(name);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StorageValue<PersistedStore>;
      parsed.state = stripEmbeddedMedia(
        (await migrateLegacyPlannerAssets(parsed.state)) as PersistedStore,
      );
      OBSOLETE_PLANNER_DRAFT_KEYS.forEach((key) => {
        try {
          window.localStorage.removeItem(key);
        } catch (error) {
          reportPersistenceError(error);
        }
      });
      const reduced = JSON.stringify(parsed);
      if (reduced.length < raw.length) {
        try {
          window.localStorage.setItem(name, reduced);
        } catch (error) {
          reportPersistenceError(error);
        }
      }
      return parsed;
    } catch (error) {
      reportPersistenceError(error);
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, JSON.stringify(stripEmbeddedMedia(value)));
      lastPersistenceError = undefined;
      storageErrorToastShown = false;
    } catch (error) {
      reportPersistenceError(error);
    }
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch (error) {
      reportPersistenceError(error);
    }
  },
};

export function getMockStorageDiagnostics() {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(MOCK_STORAGE_KEY) ?? "";
    const parsed = raw ? (JSON.parse(raw) as StorageValue<Record<string, unknown>>) : undefined;
    const collectionBytes = Object.fromEntries(
      Object.entries(parsed?.state ?? {})
        .filter(([, value]) => Array.isArray(value))
        .map(([key, value]) => [key, new TextEncoder().encode(JSON.stringify(value)).length])
        .sort((a, b) => Number(b[1]) - Number(a[1])),
    );
    return {
      key: MOCK_STORAGE_KEY,
      version: parsed?.version,
      bytes: new TextEncoder().encode(raw).length,
      collectionBytes,
      lastError: lastPersistenceError?.message,
    };
  } catch (error) {
    reportPersistenceError(error);
    return {
      key: MOCK_STORAGE_KEY,
      version: undefined,
      bytes: 0,
      collectionBytes: {},
      lastError: lastPersistenceError?.message,
    };
  }
}

type LegacyPersistedStore = Store & { quotes?: LegacyQuote[] };

const makeShareToken = () =>
  `share_${globalThis.crypto?.randomUUID?.().replace(/-/g, "") ?? makeId("token")}`;

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
      patients: initialPatientJourneyState.patients ?? [],
      leads: initialPatientJourneyState.leads ?? [],
      treatmentPlans: initialPatientJourneyState.treatmentPlans ?? [],
      tasks: initialPatientJourneyState.tasks ?? [],
      appointments: initialPatientJourneyState.appointments ?? [],
      applications: initialPatientJourneyState.applications ?? [],
      roadmaps: initialPatientJourneyState.roadmaps ?? [],
      assessments: initialPatientJourneyState.assessments ?? [],
      files: initialPatientJourneyState.files ?? [],
      activities: initialPatientJourneyState.activities ?? [],
      notifications: [],
      followUps: [],
      communicationTemplates: [],
      crmSettings: [],
      clinicTreatmentDefinitions: [],
      dentalPlanTemplates: [],
      clinicHotels: [],
      roadmapCountryPrices: DEFAULT_ROADMAP_COUNTRY_PRICES,
      roadmapTreatmentContent: DEFAULT_ROADMAP_TREATMENT_CONTENT,

      addPatient: (patient, createdBy = "system") => {
        const normalizedEmail = patient.email?.trim().toLowerCase() ?? "";
        const normalizedPhone = (patient.phone ?? patient.whatsapp ?? "").replace(/\D/g, "");
        const existing = get().patients.find(
          (item) =>
            item.clinic_id === patient.clinic_id &&
            ((normalizedEmail && item.email?.trim().toLowerCase() === normalizedEmail) ||
              (normalizedPhone &&
                (item.phone ?? item.whatsapp ?? "").replace(/\D/g, "") === normalizedPhone)),
        );
        if (existing) return existing;
        const actor = get().users.find((item) => item.id === createdBy);
        if (!actor && createdBy !== "system") throw new Error("Patient actor is unavailable.");
        if (
          actor &&
          !["clinic_owner", "clinic_admin", "coordinator", "sales", "platform_admin"].includes(
            actor.role,
          )
        )
          throw new Error("Patient creation is not permitted.");
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== patient.clinic_id)
          throw new Error("Patient clinic ownership mismatch.");
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
      updatePatient: (id, patch, changedBy = "system") => {
        const patient = get().patients.find((item) => item.id === id);
        if (!patient) return;
        const actor = get().users.find((item) => item.id === changedBy);
        if (!actor && changedBy !== "system") return;
        if (
          actor &&
          !["clinic_owner", "clinic_admin", "coordinator", "sales", "platform_admin"].includes(
            actor.role,
          )
        )
          return;
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== patient.clinic_id)
          return;
        set((state) => ({
          patients: state.patients.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                  id: item.id,
                  clinic_id: item.clinic_id,
                  user_id: item.user_id,
                  created_at: item.created_at,
                  created_by: item.created_by,
                  updated_at: now(),
                }
              : item,
          ),
        }));
      },
      updatePatientAssignment: (id, clinicId, patch, changedBy = "system") => {
        const patient = get().patients.find(
          (item) => item.id === id && item.clinic_id === clinicId,
        );
        if (!patient) return;
        const actor = get().users.find((item) => item.id === changedBy);
        if (!actor && changedBy !== "system") return;
        if (
          actor &&
          !["clinic_owner", "clinic_admin", "coordinator", "sales", "platform_admin"].includes(
            actor.role,
          )
        )
          return;
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== clinicId) return;
        const changes = [
          patient.coordinator_id !== patch.coordinator_id ? "coordinator" : undefined,
          patient.dentist_id !== patch.dentist_id ? "dentist" : undefined,
        ].filter(Boolean);
        if (!changes.length) return;
        const timestamp = now();
        const lead = get().leads.find(
          (item) => item.clinic_id === clinicId && item.clinic_patient_id === patient.id,
        );
        const activity: LeadActivity = {
          id: makeId("activity"),
          clinic_id: clinicId,
          lead_id: lead?.id,
          patient_id: patient.id,
          kind: "status_change",
          body: `Patient ${changes.join(" and ")} assignment updated.`,
          internal: true,
          created_at: timestamp,
          updated_at: timestamp,
          created_by: changedBy,
        };
        set((state) => ({
          patients: state.patients.map((item) =>
            item.id === id ? { ...item, ...patch, updated_at: timestamp } : item,
          ),
          activities: [...state.activities, activity],
        }));
      },
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
        contact,
      }) => {
        const state = get();
        const clinic = state.clinics.find((item) => item.id === clinic_id);
        const assessment = state.assessments.find(
          (item) => item.id === assessment_id && item.patient_user_id === patient_user_id,
        );
        const roadmap = state.roadmaps.find(
          (item) =>
            item.id === roadmap_id &&
            item.assessment_id === assessment_id &&
            item.patient_user_id === patient_user_id,
        );
        if (!clinic || !assessment || !roadmap)
          throw new Error("Application journey context is unavailable.");
        const completedAssessment = {
          ...assessment,
          personal: {
            ...assessment.personal,
            first_name: contact?.first_name?.trim() || assessment.personal.first_name,
            last_name: contact?.last_name?.trim() || assessment.personal.last_name,
            email: contact?.email?.trim() || assessment.personal.email,
            whatsapp: contact?.whatsapp?.trim() || assessment.personal.whatsapp,
            preferred_contact_method:
              contact?.preferred_contact_method || assessment.personal.preferred_contact_method,
          },
          updated_at: now(),
        };
        const existingPatient = state.patients.find(
          (patient) => patient.clinic_id === clinic_id && patient.user_id === patient_user_id,
        );
        const createdAt = now();
        const clinicPatient: Patient = existingPatient
          ? {
              ...existingPatient,
              first_name: completedAssessment?.personal.first_name || existingPatient.first_name,
              last_name: completedAssessment?.personal.last_name || existingPatient.last_name,
              email: completedAssessment?.personal.email || existingPatient.email,
              whatsapp: completedAssessment?.personal.whatsapp || existingPatient.whatsapp,
              preferred_contact_method:
                completedAssessment?.personal.preferred_contact_method ||
                existingPatient.preferred_contact_method,
              assessment_id,
              roadmap_id,
              updated_at: createdAt,
            }
          : {
              id: makeId("p"),
              clinic_id,
              user_id: patient_user_id,
              first_name: completedAssessment?.personal.first_name ?? "",
              last_name: completedAssessment?.personal.last_name ?? "",
              email: completedAssessment?.personal.email ?? "",
              phone: assessment?.personal.phone,
              whatsapp: completedAssessment?.personal.whatsapp,
              preferred_contact_method: completedAssessment?.personal.preferred_contact_method,
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
            application.assessment_id === assessment_id &&
            application.roadmap_id === roadmap_id &&
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
              patient_name,
              patient_country,
              treatment,
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
          assessments: completedAssessment
            ? current.assessments.map((item) =>
                item.id === completedAssessment.id ? completedAssessment : item,
              )
            : current.assessments,
          patients: existingPatient
            ? current.patients.map((item) => (item.id === clinicPatient.id ? clinicPatient : item))
            : [...current.patients, clinicPatient],
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
        const actor = get().users.find((item) => item.id === activity.created_by);
        if (!actor && activity.created_by !== "system")
          throw new Error("Communication actor is unavailable.");
        if (
          actor &&
          ![
            "clinic_owner",
            "clinic_admin",
            "coordinator",
            "dentist",
            "sales",
            "platform_admin",
          ].includes(actor.role)
        )
          throw new Error("Communication logging is not permitted.");
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== activity.clinic_id)
          throw new Error("Communication clinic ownership mismatch.");
        const relatedLead = activity.lead_id
          ? get().leads.find(
              (item) => item.id === activity.lead_id && item.clinic_id === activity.clinic_id,
            )
          : undefined;
        const relatedPatient = activity.patient_id
          ? get().patients.find(
              (item) => item.id === activity.patient_id && item.clinic_id === activity.clinic_id,
            )
          : undefined;
        if (activity.lead_id && !relatedLead) throw new Error("Related lead is unavailable.");
        if (activity.patient_id && !relatedPatient)
          throw new Error("Related patient is unavailable.");
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
      updateLeadStatus: (id, status, changedBy = "system", reason) => {
        const actor = get().users.find((item) => item.id === changedBy);
        if (!actor && changedBy !== "system") return;
        if (
          actor &&
          !["clinic_owner", "clinic_admin", "coordinator", "sales", "platform_admin"].includes(
            actor.role,
          )
        )
          return;
        const lead = get().leads.find((item) => item.id === id);
        if (!lead || lead.status === status) return;
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== lead.clinic_id) return;
        const timestamp = now();
        const activity: LeadActivity = {
          id: makeId("activity"),
          clinic_id: lead.clinic_id,
          lead_id: lead.id,
          kind: "status_change",
          body: `Status changed from ${lead.status.replace(/_/g, " ")} to ${status.replace(/_/g, " ")}.${reason ? ` Reason: ${reason}` : ""}`,
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
      updateLead: (id, clinicId, patch, changedBy = "system") => {
        const lead = get().leads.find((item) => item.id === id && item.clinic_id === clinicId);
        if (!lead) return;
        const actor = get().users.find((item) => item.id === changedBy);
        if (
          actor &&
          !["clinic_owner", "clinic_admin", "coordinator", "sales", "platform_admin"].includes(
            actor.role,
          )
        )
          return;
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== clinicId) return;
        const timestamp = now();
        set((state) => ({
          leads: state.leads.map((item) =>
            item.id === id
              ? { ...item, ...patch, id, clinic_id: clinicId, updated_at: timestamp }
              : item,
          ),
        }));
      },
      createPatientAndTreatmentPlan: (input, createdBy = "system") => {
        const state = get();
        const actor = state.users.find((user) => user.id === createdBy);
        if (!actor && createdBy !== "system")
          throw new Error("Treatment Plan actor is unavailable.");
        if (
          actor &&
          !["clinic_owner", "clinic_admin", "coordinator", "platform_admin"].includes(actor.role)
        )
          throw new Error("Treatment Plan creation is not permitted.");
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== input.plan.clinic_id)
          throw new Error("Treatment plan clinic ownership mismatch.");

        let patient = input.patient_id
          ? state.patients.find(
              (item) => item.id === input.patient_id && item.clinic_id === input.plan.clinic_id,
            )
          : undefined;
        let patientWasCreated = false;
        if (!patient) {
          if (!input.patient) throw new Error("Select a valid clinic Patient or Lead.");
          if (input.patient.clinic_id !== input.plan.clinic_id)
            throw new Error("Patient clinic ownership mismatch.");
          const normalizedEmail = input.patient.email?.trim().toLowerCase() ?? "";
          const normalizedPhone = (input.patient.phone ?? input.patient.whatsapp ?? "").replace(
            /\D/g,
            "",
          );
          patient = state.patients.find(
            (item) =>
              item.clinic_id === input.plan.clinic_id &&
              ((normalizedEmail && item.email?.trim().toLowerCase() === normalizedEmail) ||
                (normalizedPhone &&
                  (item.phone ?? item.whatsapp ?? "").replace(/\D/g, "") === normalizedPhone)),
          );
          if (!patient) {
            const timestamp = now();
            patient = {
              ...input.patient,
              id: makeId("pt"),
              created_at: timestamp,
              updated_at: timestamp,
              created_by: createdBy,
            };
            patientWasCreated = true;
          }
        }

        for (const assignedUserId of [
          input.plan.dentist_id ?? patient.dentist_id,
          input.plan.coordinator_id ?? patient.coordinator_id,
        ].filter(Boolean)) {
          const assignedUser = state.users.find((item) => item.id === assignedUserId);
          if (!assignedUser || assignedUser.clinic_id !== input.plan.clinic_id)
            throw new Error("Treatment Plan assignment is unavailable for this clinic.");
        }
        const lead = state.leads.find(
          (item) =>
            item.clinic_id === input.plan.clinic_id &&
            (item.id === input.plan.lead_id ||
              item.clinic_patient_id === patient.id ||
              (!!patient.user_id && item.patient_user_id === patient.user_id)),
        );
        if (input.plan.lead_id && lead?.id !== input.plan.lead_id)
          throw new Error("Treatment Plan lead is unavailable for this clinic.");
        const existingPlan = state.treatmentPlans.find(
          (plan) =>
            plan.clinic_id === input.plan.clinic_id &&
            ((lead &&
              plan.lead_id === lead.id &&
              !["declined", "expired"].includes(plan.status ?? "draft")) ||
              (plan.clinic_patient_id === patient.id &&
                (plan.status ?? "draft") === "draft" &&
                (plan.items ?? []).length === 0)),
        );
        if (existingPlan) return { patient, plan: existingPlan };

        const timestamp = now();
        const application = state.applications.find(
          (item) =>
            item.clinic_id === input.plan.clinic_id &&
            (item.id === input.plan.clinic_application_id ||
              item.id === lead?.clinic_application_id),
        );
        const roadmap = state.roadmaps.find(
          (item) =>
            item.id === (input.plan.roadmap_id ?? lead?.roadmap_id ?? application?.roadmap_id),
        );
        const plan: TreatmentPlan = {
          ...input.plan,
          clinic_id: input.plan.clinic_id,
          patient_user_id: patient.user_id ?? patient.id,
          clinic_patient_id: patient.id,
          lead_id: input.plan.lead_id ?? lead?.id,
          clinic_application_id: input.plan.clinic_application_id ?? application?.id,
          assessment_id:
            input.plan.assessment_id ?? lead?.assessment_id ?? application?.assessment_id,
          roadmap_id: input.plan.roadmap_id ?? lead?.roadmap_id ?? application?.roadmap_id,
          title:
            input.plan.title ??
            (patient.treatment_interest
              ? `${patient.treatment_interest} treatment plan`
              : `Treatment plan for ${`${patient.first_name} ${patient.last_name}`.trim()}`),
          summary: input.plan.summary ?? "Draft clinical treatment plan.",
          items: Array.isArray(input.plan.items) ? input.plan.items : [],
          visits: input.plan.visits ?? 1,
          healing_weeks: input.plan.healing_weeks ?? 0,
          status: normalizeTreatmentPlanStatus(input.plan.status),
          dentist_id: input.plan.dentist_id ?? patient.dentist_id,
          coordinator_id: input.plan.coordinator_id ?? lead?.assigned_to ?? patient.coordinator_id,
          clinical_findings: input.plan.clinical_findings ?? [],
          treatment_objectives: input.plan.treatment_objectives ?? [],
          alternatives: input.plan.alternatives ?? [],
          risks: input.plan.risks ?? [],
          exclusions: input.plan.exclusions ?? [],
          materials: input.plan.materials ?? [],
          implant_systems: input.plan.implant_systems ?? [],
          treatment_stages: input.plan.treatment_stages ?? [],
          visit_plan: input.plan.visit_plan ?? [],
          preliminary_suggestions:
            input.plan.preliminary_suggestions ??
            roadmap?.treatment_estimates?.map((item) => ({ ...item })),
          price_items: dedupeTreatmentPlanPriceItems(input.plan.price_items ?? []),
          included_services: input.plan.included_services ?? [],
          excluded_services: input.plan.excluded_services ?? [],
          payment_schedule: normalizePlanPaymentSchedule(input.plan.payment_schedule),
          currency: input.plan.currency ?? "EUR",
          hotel_total: input.plan.hotel_total ?? 0,
          transfer_total: input.plan.transfer_total ?? 0,
          optional_service_total: input.plan.optional_service_total ?? 0,
          discount_type: input.plan.discount_type ?? "none",
          discount_value: input.plan.discount_value ?? 0,
          calculated_discount: input.plan.calculated_discount ?? 0,
          patient_document_version: input.plan.patient_document_version ?? 1,
          prepared_at: input.plan.prepared_at ?? timestamp,
          id: makeId("tp"),
          created_at: timestamp,
          updated_at: timestamp,
          created_by: createdBy,
        };
        const activity: LeadActivity | undefined = lead
          ? {
              id: makeId("activity"),
              clinic_id: plan.clinic_id,
              lead_id: lead.id,
              kind: "note",
              body: `Treatment plan created: ${plan.title}`,
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
        const patients = patientWasCreated ? [...state.patients, patient] : state.patients;
        const treatmentPlans = [...state.treatmentPlans, plan];
        const activities = activity ? [...state.activities, activity] : state.activities;
        const leads = lead
          ? state.leads.map((item) =>
              item.id === lead.id
                ? {
                    ...item,
                    clinic_patient_id: patient.id,
                    status: shouldMoveLead ? "treatment_planning" : item.status,
                    last_activity_at: timestamp,
                    updated_at: timestamp,
                  }
                : item,
            )
          : state.leads;
        const nextState = { ...state, patients, treatmentPlans, activities, leads };
        persistCanonicalStateOrThrow(nextState);
        set({ patients, treatmentPlans, activities, leads });
        return { patient, plan };
      },
      addTreatmentPlan: (tp, createdBy = "system") => {
        const actor = get().users.find((user) => user.id === createdBy);
        if (!actor && createdBy !== "system")
          throw new Error("Treatment Plan actor is unavailable.");
        if (
          actor &&
          !["clinic_owner", "clinic_admin", "coordinator", "platform_admin"].includes(actor.role)
        )
          throw new Error("Treatment Plan creation is not permitted.");
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== tp.clinic_id) {
          throw new Error("Treatment plan clinic ownership mismatch.");
        }
        const clinicPatient = get().patients.find(
          (item) =>
            item.clinic_id === tp.clinic_id &&
            (item.id === tp.clinic_patient_id || item.user_id === tp.patient_user_id),
        );
        if (!clinicPatient)
          throw new Error("Treatment Plan patient is unavailable for this clinic.");
        for (const assignedUserId of [tp.dentist_id, tp.coordinator_id].filter(Boolean)) {
          const assignedUser = get().users.find((item) => item.id === assignedUserId);
          if (!assignedUser || assignedUser.clinic_id !== tp.clinic_id)
            throw new Error("Treatment Plan assignment is unavailable for this clinic.");
        }
        const lead = get().leads.find(
          (item) =>
            item.clinic_id === tp.clinic_id &&
            (item.id === tp.lead_id ||
              item.clinic_patient_id === tp.clinic_patient_id ||
              item.patient_user_id === tp.patient_user_id),
        );
        if (tp.lead_id && lead?.id !== tp.lead_id)
          throw new Error("Treatment Plan lead is unavailable for this clinic.");
        const existingPlan = get().treatmentPlans.find(
          (plan) =>
            plan.clinic_id === tp.clinic_id &&
            ((lead &&
              plan.lead_id === lead.id &&
              !["declined", "expired"].includes(plan.status ?? "draft")) ||
              (plan.clinic_patient_id === tp.clinic_patient_id &&
                (plan.status ?? "draft") === "draft" &&
                (plan.items ?? []).length === 0)),
        );
        if (existingPlan) return existingPlan;
        const timestamp = now();
        const application = get().applications.find(
          (item) =>
            item.clinic_id === tp.clinic_id &&
            (item.id === tp.clinic_application_id || item.id === lead?.clinic_application_id),
        );
        if (tp.clinic_application_id && application?.id !== tp.clinic_application_id)
          throw new Error("Treatment Plan application is unavailable for this clinic.");
        const roadmap = get().roadmaps.find(
          (item) => item.id === (tp.roadmap_id ?? lead?.roadmap_id ?? application?.roadmap_id),
        );
        if (roadmap && roadmap.patient_user_id !== tp.patient_user_id)
          throw new Error("Treatment Plan Roadmap identity mismatch.");
        if (
          tp.assessment_id &&
          !get().assessments.some(
            (item) => item.id === tp.assessment_id && item.patient_user_id === tp.patient_user_id,
          )
        )
          throw new Error("Treatment Plan Assessment identity mismatch.");
        const rec: TreatmentPlan = {
          ...tp,
          lead_id: tp.lead_id ?? lead?.id,
          clinic_application_id: tp.clinic_application_id ?? application?.id,
          assessment_id: tp.assessment_id ?? lead?.assessment_id ?? application?.assessment_id,
          roadmap_id: tp.roadmap_id ?? lead?.roadmap_id ?? application?.roadmap_id,
          preliminary_suggestions:
            tp.preliminary_suggestions ??
            roadmap?.treatment_estimates?.map((item) => ({ ...item })),
          status: normalizeTreatmentPlanStatus(tp.status),
          price_items: dedupeTreatmentPlanPriceItems(tp.price_items ?? []),
          included_services: tp.included_services ?? [],
          excluded_services: tp.excluded_services ?? [],
          payment_schedule: normalizePlanPaymentSchedule(tp.payment_schedule),
          currency: tp.currency ?? "EUR",
          hotel_total: tp.hotel_total ?? 0,
          transfer_total: tp.transfer_total ?? 0,
          optional_service_total: tp.optional_service_total ?? 0,
          discount_type: tp.discount_type ?? "none",
          discount_value: tp.discount_value ?? 0,
          calculated_discount: tp.calculated_discount ?? 0,
          patient_document_version: tp.patient_document_version ?? 1,
          prepared_at: tp.prepared_at ?? timestamp,
          id: makeId("tp"),
          created_at: timestamp,
          updated_at: timestamp,
          created_by: createdBy,
        };
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
        const actor = get().users.find((user) => user.id === changedBy);
        if (!actor && !["system", "patient_shared"].includes(changedBy)) return;
        if (
          actor &&
          !["clinic_owner", "clinic_admin", "coordinator", "dentist", "platform_admin"].includes(
            actor.role,
          )
        )
          return;
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== plan.clinic_id) return;
        if (
          [
            "id",
            "clinic_id",
            "clinic_patient_id",
            "patient_user_id",
            "created_at",
            "created_by",
          ].some((key) => key in patch)
        )
          return;
        for (const assignedUserId of [patch.dentist_id, patch.coordinator_id].filter(Boolean)) {
          const assignedUser = get().users.find((item) => item.id === assignedUserId);
          if (!assignedUser || assignedUser.clinic_id !== plan.clinic_id) return;
        }
        if (
          actor?.role === "dentist" &&
          [
            "title",
            "dentist_id",
            "coordinator_id",
            "currency",
            "price_items",
            "hotel_total",
            "transfer_total",
            "optional_service_total",
            "discount_type",
            "discount_value",
            "calculated_discount",
            "payment_schedule",
            "valid_until",
            "included_services",
            "excluded_services",
            "patient_facing_notes",
            "share_token",
            "shared_at",
          ].some((key) => key in patch)
        )
          return;
        if (
          actor?.role === "dentist" &&
          patch.status &&
          !["draft", "doctor_review", "approved"].includes(
            normalizeTreatmentPlanStatus(patch.status),
          )
        )
          return;
        if (actor?.role === "coordinator" && patch.status === "approved") return;
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
            item.id === id
              ? {
                  ...item,
                  ...patch,
                  status: patch.status ? normalizeTreatmentPlanStatus(patch.status) : item.status,
                  price_items: patch.price_items
                    ? dedupeTreatmentPlanPriceItems(patch.price_items)
                    : item.price_items,
                  share_token: patch.share_token ?? item.share_token,
                  updated_at: timestamp,
                }
              : item,
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
      upsertTreatmentPlanPriceItems: (id, clinicId, items, changedBy = "system") => {
        const plan = get().treatmentPlans.find(
          (item) => item.id === id && item.clinic_id === clinicId,
        );
        if (!plan) return;
        get().updateTreatmentPlan(
          id,
          { price_items: dedupeTreatmentPlanPriceItems(items) },
          changedBy,
        );
      },
      updateTreatmentPlanStatus: (id, clinicId, status, changedBy = "system") => {
        const plan = get().treatmentPlans.find(
          (item) => item.id === id && item.clinic_id === clinicId,
        );
        if (!plan) return;
        if (!canTransitionTreatmentPlanStatus(plan.status, status)) return;
        get().updateTreatmentPlan(id, { status }, changedBy);
      },
      ensureTreatmentPlanShareToken: (id, clinicId, changedBy = "system") => {
        const plan = get().treatmentPlans.find(
          (item) => item.id === id && item.clinic_id === clinicId,
        );
        if (!plan) return undefined;
        const actor = get().users.find((item) => item.id === changedBy);
        if (!actor && changedBy !== "system") return undefined;
        if (
          actor &&
          !["clinic_owner", "clinic_admin", "coordinator", "platform_admin"].includes(actor.role)
        )
          return undefined;
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== clinicId)
          return undefined;
        const token = plan.share_token ?? makeShareToken();
        if (!plan.share_token) get().updateTreatmentPlan(id, { share_token: token }, changedBy);
        return token;
      },
      markTreatmentPlanSent: (id, clinicId, changedBy = "system") => {
        const plan = get().treatmentPlans.find(
          (item) => item.id === id && item.clinic_id === clinicId,
        );
        if (!plan || !canTransitionTreatmentPlanStatus(plan.status, "sent")) return;
        const token = get().ensureTreatmentPlanShareToken(id, clinicId, changedBy);
        if (!token) return;
        const timestamp = now();
        get().updateTreatmentPlan(id, { status: "sent", shared_at: timestamp }, changedBy);
      },
      markTreatmentPlanViewed: (id, clinicId) => {
        const plan = get().treatmentPlans.find(
          (item) => item.id === id && item.clinic_id === clinicId,
        );
        if (!plan || plan.status !== "sent") return;
        get().updateTreatmentPlan(id, { status: "viewed", viewed_at: now() }, "patient_shared");
      },
      markTreatmentPlanAccepted: (id, clinicId) => {
        const plan = get().treatmentPlans.find(
          (item) => item.id === id && item.clinic_id === clinicId,
        );
        if (!plan || plan.status !== "viewed") return;
        get().updateTreatmentPlan(id, { status: "accepted", accepted_at: now() }, "patient_shared");
      },
      markTreatmentPlanDeclined: (id, clinicId) => {
        const plan = get().treatmentPlans.find(
          (item) => item.id === id && item.clinic_id === clinicId,
        );
        if (!plan || plan.status !== "viewed") return;
        get().updateTreatmentPlan(id, { status: "declined", declined_at: now() }, "patient_shared");
      },
      updateBranding: (clinic_id, patch) =>
        set((s) => ({
          branding: s.branding.map((b) =>
            b.clinic_id === clinic_id ? { ...b, ...patch, updated_at: now() } : b,
          ),
        })),
      addTask: (task, createdBy = "system") => {
        const actor = get().users.find((item) => item.id === createdBy);
        if (!actor && createdBy !== "system") throw new Error("Task actor is unavailable.");
        if (
          actor &&
          ![
            "clinic_owner",
            "clinic_admin",
            "coordinator",
            "dentist",
            "sales",
            "platform_admin",
          ].includes(actor.role)
        )
          throw new Error("Task creation is not permitted.");
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== task.clinic_id)
          throw new Error("Task clinic ownership mismatch.");
        const assignedTaskUserId = task.assigned_user_id ?? task.assigned_to;
        if (
          assignedTaskUserId &&
          !get().users.some(
            (item) => item.id === assignedTaskUserId && item.clinic_id === task.clinic_id,
          )
        )
          throw new Error("Task assignee is unavailable for this clinic.");
        const taskPatientId = task.patient_id ?? task.patient_user_id;
        if (
          task.lead_id &&
          !get().leads.some((item) => item.id === task.lead_id && item.clinic_id === task.clinic_id)
        )
          throw new Error("Task lead is unavailable for this clinic.");
        if (
          taskPatientId &&
          !get().patients.some(
            (item) =>
              (item.id === taskPatientId || item.user_id === taskPatientId) &&
              item.clinic_id === task.clinic_id,
          )
        )
          throw new Error("Task patient is unavailable for this clinic.");
        if (
          task.treatment_plan_id &&
          !get().treatmentPlans.some(
            (item) => item.id === task.treatment_plan_id && item.clinic_id === task.clinic_id,
          )
        )
          throw new Error("Task Treatment Plan is unavailable for this clinic.");
        const timestamp = now();
        const rec: Task = {
          ...task,
          assigned_user_id: task.assigned_user_id ?? task.assigned_to,
          assigned_to: task.assigned_to ?? task.assigned_user_id,
          patient_id: task.patient_id ?? task.patient_user_id,
          task_status: task.task_status ?? (task.done ? "completed" : "pending"),
          completed_at: task.done ? timestamp : task.completed_at,
          id: makeId("task"),
          created_at: timestamp,
          updated_at: timestamp,
          created_by: createdBy,
        };
        const activity: LeadActivity = {
          id: makeId("activity"),
          clinic_id: task.clinic_id,
          lead_id: task.lead_id,
          patient_id: task.patient_id ?? task.patient_user_id,
          treatment_plan_id: task.treatment_plan_id,
          kind: "task",
          body:
            task.category === "follow_up"
              ? `Follow-up scheduled: ${task.title}`
              : `Task created: ${task.title}`,
          internal: true,
          created_at: timestamp,
          updated_at: timestamp,
          created_by: createdBy,
        };
        set((s) => ({
          tasks: [rec, ...s.tasks],
          activities: [...s.activities, activity],
          leads: task.lead_id
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
        const actor = get().users.find((item) => item.id === changedBy);
        if (!actor && changedBy !== "system") return;
        if (
          actor &&
          (![
            "clinic_owner",
            "clinic_admin",
            "coordinator",
            "dentist",
            "sales",
            "platform_admin",
          ].includes(actor.role) ||
            (actor.role !== "platform_admin" && actor.clinic_id !== task.clinic_id))
        )
          return;
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
            item.id === id
              ? {
                  ...item,
                  done,
                  task_status: done ? "completed" : "pending",
                  completed_at: done ? timestamp : undefined,
                  updated_at: timestamp,
                }
              : item,
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
      updateTask: (id, clinicId, patch, changedBy = "system") => {
        const actor = get().users.find((item) => item.id === changedBy);
        if (!actor && changedBy !== "system") return;
        if (
          actor &&
          (![
            "clinic_owner",
            "clinic_admin",
            "coordinator",
            "dentist",
            "sales",
            "platform_admin",
          ].includes(actor.role) ||
            (actor.role !== "platform_admin" && actor.clinic_id !== clinicId))
        )
          return;
        const task = get().tasks.find((item) => item.id === id && item.clinic_id === clinicId);
        if (!task) return;
        const assignedTaskUserId = patch.assigned_user_id ?? patch.assigned_to;
        if (
          assignedTaskUserId &&
          !get().users.some((item) => item.id === assignedTaskUserId && item.clinic_id === clinicId)
        )
          return;
        const timestamp = now();
        const completing = patch.task_status === "completed" && task.task_status !== "completed";
        set((state) => ({
          tasks: state.tasks.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                  id: item.id,
                  clinic_id: item.clinic_id,
                  created_at: item.created_at,
                  created_by: item.created_by,
                  assigned_to: patch.assigned_user_id ?? patch.assigned_to ?? item.assigned_to,
                  assigned_user_id:
                    patch.assigned_user_id ?? patch.assigned_to ?? item.assigned_user_id,
                  done: patch.task_status
                    ? patch.task_status === "completed"
                    : (patch.done ?? item.done),
                  completed_at: completing ? timestamp : (patch.completed_at ?? item.completed_at),
                  updated_at: timestamp,
                }
              : item,
          ),
          activities: completing
            ? [
                ...state.activities,
                {
                  id: makeId("activity"),
                  clinic_id: clinicId,
                  lead_id: task.lead_id,
                  patient_id: task.patient_id ?? task.patient_user_id,
                  kind: "task",
                  body: `Task completed: ${task.title}`,
                  internal: true,
                  occurred_at: timestamp,
                  created_at: timestamp,
                  updated_at: timestamp,
                  created_by: changedBy,
                },
              ]
            : state.activities,
        }));
      },
      addAppointment: (record, createdBy = "system") => {
        const actor = get().users.find((item) => item.id === createdBy);
        if (!actor && createdBy !== "system") throw new Error("Appointment actor is unavailable.");
        if (
          actor &&
          ![
            "clinic_owner",
            "clinic_admin",
            "coordinator",
            "dentist",
            "sales",
            "platform_admin",
          ].includes(actor.role)
        )
          throw new Error("Appointment creation is not permitted.");
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== record.clinic_id)
          throw new Error("Appointment clinic ownership mismatch.");
        for (const assignedUserId of [record.dentist_id, record.coordinator_id].filter(Boolean)) {
          if (
            !get().users.some(
              (item) => item.id === assignedUserId && item.clinic_id === record.clinic_id,
            )
          )
            throw new Error("Appointment assignee is unavailable for this clinic.");
        }
        const appointmentPatientId = record.patient_id ?? record.patient_user_id;
        if (
          record.lead_id &&
          !get().leads.some(
            (item) => item.id === record.lead_id && item.clinic_id === record.clinic_id,
          )
        )
          throw new Error("Appointment lead is unavailable for this clinic.");
        if (
          appointmentPatientId &&
          !get().patients.some(
            (item) =>
              (item.id === appointmentPatientId || item.user_id === appointmentPatientId) &&
              item.clinic_id === record.clinic_id,
          )
        )
          throw new Error("Appointment patient is unavailable for this clinic.");
        if (
          record.treatment_plan_id &&
          !get().treatmentPlans.some(
            (item) => item.id === record.treatment_plan_id && item.clinic_id === record.clinic_id,
          )
        )
          throw new Error("Appointment Treatment Plan is unavailable for this clinic.");
        const timestamp = now();
        const rec: Appointment = {
          ...record,
          id: makeId("appointment"),
          created_at: timestamp,
          updated_at: timestamp,
          created_by: createdBy,
        };
        set((state) => ({
          appointments: [rec, ...state.appointments],
          activities: [
            ...state.activities,
            {
              id: makeId("activity"),
              clinic_id: rec.clinic_id,
              lead_id: rec.lead_id,
              patient_id: rec.patient_id ?? rec.patient_user_id,
              treatment_plan_id: rec.treatment_plan_id,
              kind: "note",
              body: `Appointment booked: ${rec.title}`,
              internal: true,
              occurred_at: timestamp,
              created_at: timestamp,
              updated_at: timestamp,
              created_by: createdBy,
            },
          ],
        }));
        return rec;
      },
      updateAppointment: (id, clinicId, patch, changedBy = "system") => {
        const actor = get().users.find((item) => item.id === changedBy);
        if (!actor && changedBy !== "system") return;
        if (
          actor &&
          (![
            "clinic_owner",
            "clinic_admin",
            "coordinator",
            "dentist",
            "sales",
            "platform_admin",
          ].includes(actor.role) ||
            (actor.role !== "platform_admin" && actor.clinic_id !== clinicId))
        )
          return;
        const appointment = get().appointments.find(
          (item) => item.id === id && item.clinic_id === clinicId,
        );
        if (!appointment) return;
        for (const assignedUserId of [patch.dentist_id, patch.coordinator_id].filter(Boolean)) {
          if (
            !get().users.some((item) => item.id === assignedUserId && item.clinic_id === clinicId)
          )
            return;
        }
        const timestamp = now();
        const statusChanged =
          patch.appointment_status && patch.appointment_status !== appointment.appointment_status;
        const rescheduled = Boolean(patch.starts_at && patch.starts_at !== appointment.starts_at);
        set((state) => ({
          appointments: state.appointments.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                  id: item.id,
                  clinic_id: item.clinic_id,
                  created_at: item.created_at,
                  created_by: item.created_by,
                  start_at: patch.starts_at ?? patch.start_at ?? item.start_at,
                  updated_at: timestamp,
                }
              : item,
          ),
          activities:
            statusChanged || rescheduled
              ? [
                  ...state.activities,
                  {
                    id: makeId("activity"),
                    clinic_id: clinicId,
                    lead_id: appointment.lead_id,
                    patient_id: appointment.patient_id ?? appointment.patient_user_id,
                    treatment_plan_id: appointment.treatment_plan_id,
                    kind: "note",
                    body: rescheduled
                      ? `Appointment rescheduled: ${appointment.title}`
                      : `Appointment ${patch.appointment_status}: ${appointment.title}`,
                    internal: true,
                    occurred_at: timestamp,
                    created_at: timestamp,
                    updated_at: timestamp,
                    created_by: changedBy,
                  },
                ]
              : state.activities,
        }));
      },
      saveCommunicationTemplate: (record, changedBy = "system") =>
        set((state) => {
          const existing = state.communicationTemplates.find(
            (item) => item.id === record.id && item.clinic_id === record.clinic_id,
          );
          const timestamp = now();
          const next = existing
            ? { ...existing, ...record, updated_at: timestamp }
            : { ...record, created_at: timestamp, updated_at: timestamp, created_by: changedBy };
          return {
            communicationTemplates: existing
              ? state.communicationTemplates.map((item) => (item.id === next.id ? next : item))
              : [next, ...state.communicationTemplates],
          };
        }),
      deleteCommunicationTemplate: (id, clinicId) =>
        set((state) => ({
          communicationTemplates: state.communicationTemplates.filter(
            (item) => item.id !== id || item.clinic_id !== clinicId,
          ),
        })),
      updateClinic: (id, patch, changedBy = "system") => {
        const actor = get().users.find((item) => item.id === changedBy);
        if (actor && !["clinic_owner", "clinic_admin", "platform_admin"].includes(actor.role))
          return;
        set((state) => ({
          clinics: state.clinics.map((item) =>
            item.id === id ? { ...item, ...patch, updated_at: now() } : item,
          ),
        }));
      },
      saveClinicUser: (record, changedBy = "system") => {
        const actor = get().users.find((item) => item.id === changedBy);
        if (
          actor &&
          actor.role !== "platform_admin" &&
          (!actor.clinic_id ||
            actor.clinic_id !== record.clinic_id ||
            !["clinic_owner", "clinic_admin"].includes(actor.role))
        )
          return;
        const timestamp = now();
        set((state) => ({
          users: state.users.some((item) => item.id === record.id)
            ? state.users.map((item) =>
                item.id === record.id && item.clinic_id === record.clinic_id
                  ? { ...item, ...record, updated_at: timestamp }
                  : item,
              )
            : [
                { ...record, created_at: timestamp, updated_at: timestamp, created_by: changedBy },
                ...state.users,
              ],
        }));
      },
      saveCrmSettings: (clinicId, patch, changedBy = "system") => {
        const actor = get().users.find((item) => item.id === changedBy);
        if (
          actor &&
          actor.role !== "platform_admin" &&
          (actor.clinic_id !== clinicId || !["clinic_owner", "clinic_admin"].includes(actor.role))
        )
          return;
        const timestamp = now();
        set((state) => {
          const existing = state.crmSettings.find((item) => item.clinic_id === clinicId);
          const next: ClinicCrmSettings = existing
            ? { ...existing, ...patch, updated_at: timestamp }
            : {
                id: `crm_settings_${clinicId}`,
                clinic_id: clinicId,
                pipeline: [],
                sources: [],
                ...patch,
                created_at: timestamp,
                updated_at: timestamp,
                created_by: changedBy,
              };
          return {
            crmSettings: existing
              ? state.crmSettings.map((item) => (item.clinic_id === clinicId ? next : item))
              : [...state.crmSettings, next],
          };
        });
      },
      syncNotifications: (clinicId, userId, records) =>
        set((state) => {
          const existing = new Map(state.notifications.map((item) => [item.id, item]));
          let changed = false;
          const next = records.map((record) => {
            const previous = existing.get(record.id);
            if (!previous) {
              changed = true;
              return record;
            }
            existing.delete(record.id);
            return { ...record, read_at: previous.read_at };
          });
          const retained = [...existing.values()].filter(
            (item) => item.clinic_id !== clinicId || item.user_id !== userId,
          );
          if (!changed && next.length + retained.length === state.notifications.length)
            return state;
          return { notifications: [...next, ...retained] };
        }),
      markNotificationRead: (id, clinicId, userId) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id &&
            item.clinic_id === clinicId &&
            (!item.user_id || item.user_id === userId)
              ? { ...item, read_at: item.read_at ?? now(), updated_at: now() }
              : item,
          ),
        })),
      markAllNotificationsRead: (clinicId, userId) => {
        const timestamp = now();
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.clinic_id === clinicId &&
            (!item.user_id || item.user_id === userId) &&
            !item.read_at
              ? { ...item, read_at: timestamp, updated_at: timestamp }
              : item,
          ),
        }));
      },
      scheduleFollowUp: (record, createdBy = "system") => {
        const lead = get().leads.find(
          (item) => item.id === record.lead_id && item.clinic_id === record.clinic_id,
        );
        if (!lead) throw new Error("Lead is unavailable for this clinic.");
        const actor = get().users.find((item) => item.id === createdBy);
        if (!actor && createdBy !== "system") throw new Error("Follow-up actor is unavailable.");
        if (
          actor &&
          !["clinic_owner", "clinic_admin", "coordinator", "sales", "platform_admin"].includes(
            actor.role,
          )
        )
          throw new Error("Follow-up scheduling is not permitted.");
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== record.clinic_id)
          throw new Error("Follow-up clinic ownership mismatch.");
        if (
          record.assigned_user_id &&
          !get().users.some(
            (item) => item.id === record.assigned_user_id && item.clinic_id === record.clinic_id,
          )
        )
          throw new Error("Follow-up assignee is unavailable for this clinic.");
        const duplicate = get().followUps.find(
          (item) =>
            item.clinic_id === record.clinic_id &&
            item.lead_id === record.lead_id &&
            item.status === "pending" &&
            item.due_at === record.due_at &&
            item.reason === record.reason &&
            item.assigned_user_id === record.assigned_user_id,
        );
        if (duplicate) return duplicate;
        const timestamp = now();
        const followUp: LeadFollowUp = {
          ...record,
          id: makeId("followup"),
          status: "pending",
          created_at: timestamp,
          updated_at: timestamp,
          created_by: createdBy,
        };
        const activity: LeadActivity = {
          id: makeId("activity"),
          clinic_id: record.clinic_id,
          lead_id: record.lead_id,
          kind: "follow_up",
          body: `Follow-up scheduled: ${record.reason} · ${record.due_at}`,
          internal: true,
          occurred_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
          created_by: createdBy,
        };
        set((state) => ({
          followUps: [...state.followUps, followUp],
          activities: [...state.activities, activity],
          leads: state.leads.map((item) =>
            item.id === lead.id
              ? { ...item, last_activity_at: timestamp, updated_at: timestamp }
              : item,
          ),
        }));
        return followUp;
      },
      completeFollowUp: (id, clinicId, changedBy = "system") => {
        const followUp = get().followUps.find(
          (item) => item.id === id && item.clinic_id === clinicId,
        );
        if (!followUp || followUp.status !== "pending") return;
        const actor = get().users.find((item) => item.id === changedBy);
        if (!actor && changedBy !== "system") return;
        if (
          actor &&
          !["clinic_owner", "clinic_admin", "coordinator", "sales", "platform_admin"].includes(
            actor.role,
          )
        )
          return;
        if (actor && actor.role !== "platform_admin" && actor.clinic_id !== clinicId) return;
        const timestamp = now();
        const activity: LeadActivity = {
          id: makeId("activity"),
          clinic_id: clinicId,
          lead_id: followUp.lead_id,
          kind: "follow_up",
          body: `Follow-up completed: ${followUp.reason}`,
          internal: true,
          occurred_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
          created_by: changedBy,
        };
        set((state) => ({
          followUps: state.followUps.map((item) =>
            item.id === id
              ? { ...item, status: "completed", completed_at: timestamp, updated_at: timestamp }
              : item,
          ),
          activities: [...state.activities, activity],
          leads: state.leads.map((item) =>
            item.id === followUp.lead_id
              ? { ...item, last_activity_at: timestamp, updated_at: timestamp }
              : item,
          ),
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
      saveRoadmapCountryPrice: (record, changedBy = "system") =>
        set((s) => {
          const existing = s.roadmapCountryPrices.find(
            (item) => item.id === record.id && item.clinic_id === record.clinic_id,
          );
          const timestamp = now();
          const next: RoadmapCountryTreatmentPrice = existing
            ? { ...existing, ...record, updated_at: timestamp }
            : { ...record, created_at: timestamp, updated_at: timestamp, created_by: changedBy };
          return {
            roadmapCountryPrices: existing
              ? s.roadmapCountryPrices.map((item) => (item.id === next.id ? next : item))
              : [...s.roadmapCountryPrices, next],
          };
        }),
      deleteRoadmapCountryPrice: (id, clinicId) =>
        set((s) => ({
          roadmapCountryPrices: s.roadmapCountryPrices.filter(
            (item) => item.id !== id || item.clinic_id !== clinicId,
          ),
        })),
      saveRoadmapTreatmentContent: (record, changedBy = "system") =>
        set((s) => {
          const existing = s.roadmapTreatmentContent.find(
            (item) => item.id === record.id && item.clinic_id === record.clinic_id,
          );
          const timestamp = now();
          const next: RoadmapTreatmentContent = existing
            ? { ...existing, ...record, updated_at: timestamp }
            : { ...record, created_at: timestamp, updated_at: timestamp, created_by: changedBy };
          return {
            roadmapTreatmentContent: existing
              ? s.roadmapTreatmentContent.map((item) => (item.id === next.id ? next : item))
              : [...s.roadmapTreatmentContent, next],
          };
        }),
    }),
    {
      name: MOCK_STORAGE_KEY,
      version: MOCK_STORAGE_VERSION,
      storage: safePersistStorage,
      partialize: canonicalStoreState,
      onRehydrateStorage: () => (_state, error) => {
        if (error) reportPersistenceError(error);
        if (import.meta.env.DEV) {
          const diagnostics = getMockStorageDiagnostics();
          if (diagnostics) console.info("SmileAbroad mock storage", diagnostics);
        }
      },
      migrate: (persistedState) => {
        const state = persistedState as LegacyPersistedStore;
        const { quotes: legacyQuotes = [], ...stateWithoutLegacyQuotes } = state;
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
        const normalizedTreatmentPlans = (state.treatmentPlans ?? []).map((plan) => {
          const quote = legacyQuotes.find((item) => item.treatment_plan_id === plan.id);
          const shareToken = plan.share_token ?? quote?.share_token ?? makeShareToken();
          const lead = leads.find(
            (item) =>
              item.clinic_id === plan.clinic_id &&
              (item.id === plan.lead_id ||
                item.clinic_patient_id === plan.clinic_patient_id ||
                item.patient_user_id === plan.patient_user_id),
          );
          const application = linkedApplications.find(
            (item) =>
              item.clinic_id === plan.clinic_id &&
              (item.id === plan.clinic_application_id || item.id === lead?.clinic_application_id),
          );
          const roadmap = (state.roadmaps ?? []).find(
            (item) => item.id === (plan.roadmap_id ?? lead?.roadmap_id ?? application?.roadmap_id),
          );
          return {
            ...plan,
            dental_plan_data:
              plan.dental_plan_data && typeof plan.dental_plan_data === "object"
                ? createDentalPlan(plan.dental_plan_data as Partial<DentalPlan>)
                : plan.dental_plan_data,
            lead_id: plan.lead_id ?? lead?.id,
            clinic_application_id: plan.clinic_application_id ?? application?.id,
            assessment_id: plan.assessment_id ?? lead?.assessment_id ?? application?.assessment_id,
            roadmap_id: plan.roadmap_id ?? lead?.roadmap_id ?? application?.roadmap_id,
            preliminary_suggestions: Array.isArray(plan.preliminary_suggestions)
              ? plan.preliminary_suggestions
              : (roadmap?.treatment_estimates ?? []),
            status: normalizeTreatmentPlanStatus(plan.status),
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
            price_items: dedupeTreatmentPlanPriceItems(plan.price_items ?? []),
            payment_schedule: normalizePlanPaymentSchedule(plan.payment_schedule),
            included_services: Array.isArray(plan.included_services) ? plan.included_services : [],
            excluded_services: Array.isArray(plan.excluded_services) ? plan.excluded_services : [],
            currency: plan.currency ?? "EUR",
            hotel_total: plan.hotel_total ?? 0,
            transfer_total: plan.transfer_total ?? 0,
            optional_service_total: plan.optional_service_total ?? 0,
            discount_type: plan.discount_type ?? "none",
            discount_value: plan.discount_value ?? 0,
            calculated_discount: plan.calculated_discount ?? 0,
            prepared_at: plan.prepared_at ?? plan.created_at,
            patient_document_version: plan.patient_document_version ?? 1,
            share_token: shareToken,
          };
        });
        const quotes = legacyQuotes.map((quote) => {
          const plan = normalizedTreatmentPlans.find((item) => item.id === quote.treatment_plan_id);
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
        const mergedTreatmentPlans = normalizedTreatmentPlans.map((plan) =>
          mergeLegacyQuoteIntoTreatmentPlan(
            plan,
            quotes.find(
              (quote) => quote.treatment_plan_id === plan.id && quote.clinic_id === plan.clinic_id,
            ),
          ),
        );
        const seenTokens = new Set<string>();
        const treatmentPlans = mergedTreatmentPlans.map((plan) => {
          const token = plan.share_token ?? makeShareToken();
          const uniqueToken = seenTokens.has(token) ? makeShareToken() : token;
          seenTokens.add(uniqueToken);
          return { ...plan, share_token: uniqueToken };
        });
        return removeDtkurtPatientJourneyRecords(
          stripEmbeddedMedia({
            ...stateWithoutLegacyQuotes,
            notifications: state.notifications ?? [],
            followUps:
              state.followUps ??
              (state.tasks ?? [])
                .filter((task) => task.category === "follow_up" && task.due_at)
                .map((task) => ({
                  id: `followup_migrated_${task.id}`,
                  clinic_id: task.clinic_id,
                  lead_id: task.lead_id ?? "",
                  patient_id: task.patient_user_id,
                  assigned_user_id: task.assigned_to,
                  due_at: task.due_at!,
                  reason: task.title,
                  status: task.done ? ("completed" as const) : ("pending" as const),
                  completed_at: task.done ? task.updated_at : undefined,
                  created_at: task.created_at,
                  updated_at: task.updated_at,
                  created_by: task.created_by,
                }))
                .filter((item) => item.lead_id),
            tasks: (state.tasks ?? [])
              .filter((task) => task.category !== "follow_up")
              .map((task) => ({
                ...task,
                patient_id: task.patient_id ?? task.patient_user_id,
                assigned_user_id: task.assigned_user_id ?? task.assigned_to,
                assigned_to: task.assigned_to ?? task.assigned_user_id,
                type: task.type ?? "other",
                priority: task.priority === "medium" ? "normal" : (task.priority ?? "normal"),
                task_status: task.task_status ?? (task.done ? "completed" : "pending"),
                completed_at: task.completed_at ?? (task.done ? task.updated_at : undefined),
              })),
            appointments: (state.appointments ?? []).map((appointment) => ({
              ...appointment,
              patient_id: appointment.patient_id ?? appointment.patient_user_id,
              type: appointment.type ?? "clinic_consultation",
              start_at: appointment.start_at ?? appointment.starts_at,
              end_at:
                appointment.end_at ??
                new Date(
                  new Date(appointment.starts_at).getTime() +
                    (appointment.duration_min ?? 30) * 60_000,
                ).toISOString(),
              duration_min: appointment.duration_min ?? 30,
              appointment_status: appointment.appointment_status ?? "scheduled",
              location_type: appointment.location_type ?? "clinic",
            })),
            communicationTemplates: state.communicationTemplates ?? [],
            crmSettings: state.crmSettings ?? [],
            clinics: (state.clinics ?? seedClinics).map((clinic) => ({
              ...clinic,
              ...(clinic.id === "clinic_istanbul"
                ? { name: "DTKURT Aesthetic Dentistry", slug: "dtkurt-aesthetic-dentistry" }
                : {}),
              languages: Array.isArray(clinic.languages) ? clinic.languages : [],
              supported_treatments: Array.isArray(clinic.supported_treatments)
                ? clinic.supported_treatments
                : (seedClinics.find((item) => item.id === clinic.id)?.supported_treatments ?? []),
              directory_source:
                clinic.directory_source ??
                (clinic.id === "clinic_istanbul" ? "platform" : "curated"),
              platform_tier:
                clinic.platform_tier ?? (clinic.id === "clinic_istanbul" ? "pro" : undefined),
              source_label:
                clinic.source_label ??
                (clinic.id === "clinic_istanbul" ? undefined : "Public clinic listing"),
              website: clinic.website ?? seedClinics.find((item) => item.id === clinic.id)?.website,
              last_reviewed_at:
                clinic.last_reviewed_at ??
                seedClinics.find((item) => item.id === clinic.id)?.last_reviewed_at,
            })),
            users: [
              ...(state.users ?? seedUsers).map((member) => {
                return member.id === "u_owner"
                  ? { ...member, name: "Dr. M. Yusuf Kurt", email: "owner@dtkurt.com" }
                  : member;
              }),
              ...seedUsers.filter(
                (seedUser) =>
                  ["dentist", "viewer", "sales", "clinic_admin"].includes(seedUser.role) &&
                  !(state.users ?? seedUsers).some((member) => member.id === seedUser.id),
              ),
            ],
            branding: (state.branding ?? seedBranding).map((item) => ({
              ...item,
              ...(item.clinic_id === DTKURT_CLINIC_ID
                ? {
                    primary_color: "#0A1626",
                    secondary_color: "#415469",
                    shared_view_accent_color: "#C8A46A",
                  }
                : {}),
              doctors: Array.isArray(item.doctors) ? item.doctors : [],
              guarantees: Array.isArray(item.guarantees) ? item.guarantees : [],
            })),
            assessments: (state.assessments ?? []).map((assessment) =>
              migrateAssessment(assessment as LegacyAssessment),
            ),
            applications: linkedApplications,
            leads,
            treatmentPlans,
            clinicTreatmentDefinitions: normalizeClinicTreatmentDefinitions(
              state.clinicTreatmentDefinitions,
            ),
            dentalPlanTemplates: (state.dentalPlanTemplates ?? []).map((item) => ({
              ...item,
              active: item.active !== false,
              plan_data:
                item.plan_data && typeof item.plan_data === "object"
                  ? createDentalPlan(item.plan_data as Partial<DentalPlan>)
                  : item.plan_data,
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
            roadmapCountryPrices: Array.isArray(state.roadmapCountryPrices)
              ? state.roadmapCountryPrices
              : DEFAULT_ROADMAP_COUNTRY_PRICES,
            roadmapTreatmentContent: Array.isArray(state.roadmapTreatmentContent)
              ? state.roadmapTreatmentContent
              : DEFAULT_ROADMAP_TREATMENT_CONTENT,
            roadmaps: (state.roadmaps ?? []).map((roadmap) => ({
              ...roadmap,
              treatment_estimates: Array.isArray(roadmap.treatment_estimates)
                ? roadmap.treatment_estimates
                : [],
              treatment_journey: Array.isArray(roadmap.treatment_journey)
                ? roadmap.treatment_journey
                : [],
              missing_price_keys: Array.isArray(roadmap.missing_price_keys)
                ? roadmap.missing_price_keys
                : [],
              recommended_clinic_ids: Array.isArray(roadmap.recommended_clinic_ids)
                ? roadmap.recommended_clinic_ids
                : [],
            })),
          }),
        );
      },
    },
  ),
);

function normalizeClinicTreatmentDefinitions(
  definitions: ClinicTreatmentDefinition[] | undefined,
): ClinicTreatmentDefinition[] {
  const source = definitions ?? [];
  const explicitZirconiumClinics = new Set(
    source
      .filter((item) => item.system && item.treatment_key === "zirconium-bridge")
      .map((item) => item.clinic_id),
  );
  const normalized = source
    .filter(
      (item) =>
        !(
          item.system &&
          item.treatment_key === "bridge" &&
          explicitZirconiumClinics.has(item.clinic_id)
        ),
    )
    .map((legacy) => {
      const { svg_asset: _obsoleteSvg, ...item } = legacy as typeof legacy & {
        svg_asset?: unknown;
      };
      const legacySystemBridge = item.system && item.treatment_key === "bridge";
      const treatmentKey = legacySystemBridge ? "zirconium-bridge" : item.treatment_key;
      const baseTreatmentKey =
        item.base_treatment_key ?? (item.system ? item.treatment_key : "other");
      const clinicalBehavior =
        item.clinical_behavior ??
        (baseTreatmentKey === "bridge" ? "bridge" : item.unit_type === "arch" ? "arch" : "tooth");
      const normalizedBaseTreatmentKey =
        clinicalBehavior === "bridge" ? "bridge" : baseTreatmentKey;
      return {
        ...item,
        treatment_key: treatmentKey,
        display_name:
          legacySystemBridge && item.display_name.trim().toLowerCase() === "bridge"
            ? "Zirconium Bridge"
            : item.display_name,
        category:
          legacySystemBridge && item.category === "System treatments"
            ? "Restorative"
            : item.category,
        prices: item.prices ?? {},
        active: item.active !== false,
        unit_type: clinicalBehavior === "arch" ? "arch" : "tooth",
        base_treatment_key: normalizedBaseTreatmentKey,
        visual_key:
          item.visual_key ??
          (clinicalBehavior === "bridge"
            ? "bridge"
            : item.system
              ? normalizedBaseTreatmentKey
              : "dental-implant"),
        rule_profile_key:
          clinicalBehavior === "bridge"
            ? "bridge"
            : (item.rule_profile_key ?? normalizedBaseTreatmentKey),
        clinical_behavior: clinicalBehavior,
        default_material:
          item.default_material ?? (clinicalBehavior === "bridge" ? "zirconium" : undefined),
      } satisfies ClinicTreatmentDefinition;
    });
  const byClinicAndKey = new Map<string, ClinicTreatmentDefinition>();
  for (const item of normalized)
    byClinicAndKey.set(`${item.clinic_id}:${item.treatment_key}`, item);
  return [...byClinicAndKey.values()];
}

function normalizePlanPaymentSchedule(schedule: TreatmentPlan["payment_schedule"]) {
  if (!Array.isArray(schedule)) return [];
  const rows = schedule.map((item, index) => ({
    ...item,
    label: index === 0 ? "Visit 1" : index === 1 ? "Visit 2" : item.label,
    amount: Number.isFinite(item.amount) ? Math.max(0, item.amount) : 0,
  }));
  if (rows.length <= 2) return rows;
  const extraAmount = rows.slice(2).reduce((sum, item) => sum + item.amount, 0);
  return rows
    .slice(0, 2)
    .map((item, index) => (index === 1 ? { ...item, amount: item.amount + extraAmount } : item));
}

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
export const selectClinicBranding = (clinicId: string) => (s: Store) =>
  s.branding.find((b) => b.clinic_id === clinicId);
