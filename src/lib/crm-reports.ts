import { calculateTreatmentPlanTotals } from "@/lib/treatment-plan-commercial";
import type {
  Appointment,
  ClinicApplication,
  Lead,
  LeadFollowUp,
  Patient,
  TreatmentPlan,
  User,
} from "@/types/models";

export type ReportRange = "7" | "30" | "90" | "year";
export function reportStart(range: ReportRange, now = new Date()) {
  if (range === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getTime() - Number(range) * 86_400_000);
}
const inRange = (value: string, start: Date, end: Date) => {
  const date = new Date(value);
  return date >= start && date <= end;
};
export function buildClinicReport(input: {
  clinicId: string;
  range: ReportRange;
  applications: ClinicApplication[];
  leads: Lead[];
  patients: Patient[];
  plans: TreatmentPlan[];
  appointments: Appointment[];
  followUps: LeadFollowUp[];
  users: User[];
  now?: Date;
}) {
  const end = input.now ?? new Date();
  const start = reportStart(input.range, end);
  const applications = input.applications.filter(
    (x) => x.clinic_id === input.clinicId && inRange(x.created_at, start, end),
  );
  const leads = input.leads.filter(
    (x) => x.clinic_id === input.clinicId && inRange(x.created_at, start, end),
  );
  const patients = input.patients.filter(
    (x) => x.clinic_id === input.clinicId && inRange(x.created_at, start, end),
  );
  const plans = input.plans.filter(
    (x) => x.clinic_id === input.clinicId && inRange(x.created_at, start, end),
  );
  const appointments = input.appointments.filter(
    (x) =>
      x.clinic_id === input.clinicId &&
      inRange(x.created_at, start, end) &&
      x.appointment_status !== "cancelled",
  );
  const sent = plans.filter((x) => ["sent", "viewed", "accepted"].includes(x.status ?? ""));
  const accepted = plans.filter((x) => x.status === "accepted");
  const value = (records: TreatmentPlan[]) =>
    records.reduce((sum, plan) => sum + calculateTreatmentPlanTotals(plan).total, 0);
  const by = (values: string[]) =>
    Object.entries(
      values.reduce<Record<string, number>>((acc, key) => {
        const label = key || "Unknown";
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);
  const sourceRows = by(leads.map((x) => x.source)).map(([source, count]) => {
    const sourceLeads = leads.filter((x) => x.source === source);
    const sourcePlans = plans.filter((p) => sourceLeads.some((l) => l.id === p.lead_id));
    const sourceAccepted = sourcePlans.filter((p) => p.status === "accepted");
    return {
      source,
      leads: count,
      plans: sourcePlans.length,
      accepted: sourceAccepted.length,
      value: value(sourceAccepted),
    };
  });
  const team = input.users
    .filter((u) => u.clinic_id === input.clinicId)
    .map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      assignedLeads: leads.filter((l) => l.assigned_to === user.id).length,
      completedFollowUps: input.followUps.filter(
        (f) =>
          f.clinic_id === input.clinicId &&
          f.assigned_user_id === user.id &&
          f.status === "completed" &&
          inRange(f.completed_at ?? f.updated_at, start, end),
      ).length,
      upcomingAppointments: input.appointments.filter(
        (a) =>
          a.clinic_id === input.clinicId &&
          (a.dentist_id === user.id || a.coordinator_id === user.id) &&
          new Date(a.starts_at) > end &&
          !["cancelled", "completed", "no_show"].includes(a.appointment_status ?? "scheduled"),
      ).length,
    }));
  return {
    start,
    end,
    overview: {
      applications: applications.length,
      leads: leads.length,
      patients: patients.length,
      plans: plans.length,
      sent: sent.length,
      accepted: accepted.length,
      value: value(plans),
      appointments: appointments.length,
    },
    funnel: [
      ["Applications", applications.length],
      ["Contacted Leads", leads.filter((x) => x.status !== "new_lead").length],
      ["Plans Created", plans.length],
      ["Plans Sent", sent.length],
      ["Plans Accepted", accepted.length],
      ["Appointments Booked", appointments.length],
    ] as [string, number][],
    planStatuses: by(plans.map((x) => x.status ?? "draft")),
    sourceRows,
    team,
    countries: by(patients.map((x) => x.country)),
    interests: by(patients.map((x) => x.treatment_interest ?? "Unknown")),
    acceptedValue: value(accepted),
    averagePlanValue: plans.length ? value(plans) / plans.length : 0,
  };
}
