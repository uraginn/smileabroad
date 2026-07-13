import type { Lead, LeadActivity, LeadFollowUp, Patient, TreatmentPlan } from "@/types/models";

export const PATIENT_OPERATIONAL_STATUSES = [
  "new",
  "active",
  "treatment_planning",
  "plan_sent",
  "accepted",
  "scheduled",
  "in_treatment",
  "completed",
  "inactive",
] as const;

export function derivePatientOperationalStatus({
  patient,
  lead,
  plan,
  hasUpcomingAppointment,
}: {
  patient: Patient;
  lead?: Lead;
  plan?: TreatmentPlan;
  hasUpcomingAppointment?: boolean;
}) {
  if (patient.status === "inactive") return "inactive";
  if (lead?.status === "completed") return "completed";
  if (lead?.status === "treatment_started") return "in_treatment";
  if (hasUpcomingAppointment || lead?.status === "booked") return "scheduled";
  if (plan?.status === "accepted") return "accepted";
  if (["sent", "viewed"].includes(plan?.status ?? "")) return "plan_sent";
  if (plan) return "treatment_planning";
  if (lead?.status === "new_lead") return "new";
  return "active";
}

export function getPatientActivity({
  activities,
  patient,
  leadIds,
}: {
  activities: LeadActivity[];
  patient: Patient;
  leadIds: string[];
}) {
  return activities
    .filter(
      (item) =>
        item.clinic_id === patient.clinic_id &&
        (item.patient_id === patient.id || (!!item.lead_id && leadIds.includes(item.lead_id))),
    )
    .sort(
      (a, b) => +new Date(b.occurred_at ?? b.created_at) - +new Date(a.occurred_at ?? a.created_at),
    );
}

export function getPatientNextFollowUp(
  followUps: LeadFollowUp[],
  patient: Patient,
  leadIds: string[],
) {
  return followUps
    .filter(
      (item) =>
        item.clinic_id === patient.clinic_id &&
        item.status === "pending" &&
        (item.patient_id === patient.id || leadIds.includes(item.lead_id)),
    )
    .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at))[0];
}

export function getActivePatientPlan(plans: TreatmentPlan[], patient: Patient) {
  return plans
    .filter(
      (item) =>
        item.clinic_id === patient.clinic_id &&
        (item.clinic_patient_id === patient.id ||
          (!item.clinic_patient_id && item.patient_user_id === patient.user_id)),
    )
    .sort(
      (a, b) =>
        Number(["declined", "expired"].includes(a.status ?? "")) -
          Number(["declined", "expired"].includes(b.status ?? "")) ||
        +new Date(b.updated_at) - +new Date(a.updated_at),
    )[0];
}
