import type {
  Appointment,
  ClinicApplication,
  ClinicNotification,
  Lead,
  Task,
  TreatmentPlan,
} from "@/types/models";

export function deriveClinicNotifications({
  clinicId,
  userId,
  userRole,
  applications,
  leads,
  tasks,
  plans,
  appointments,
  now = new Date(),
}: {
  clinicId: string;
  userId: string;
  userRole: string;
  applications: ClinicApplication[];
  leads: Lead[];
  tasks: Task[];
  plans: TreatmentPlan[];
  appointments: Appointment[];
  now?: Date;
}): ClinicNotification[] {
  const records: ClinicNotification[] = [];
  const add = (record: Omit<ClinicNotification, "clinic_id" | "created_by" | "updated_at">) =>
    records.push({
      ...record,
      clinic_id: clinicId,
      created_by: "system",
      updated_at: record.created_at,
    });

  applications
    .filter((item) => item.clinic_id === clinicId && item.status === "submitted")
    .forEach((item) => {
      const lead = leads.find((candidate) => candidate.clinic_application_id === item.id);
      add({
        id: `notification_application_${item.id}`,
        type: "new_application",
        title: "New application received",
        message: lead?.patient_name ?? "A patient submitted a clinic application.",
        entity_type: "lead",
        entity_id: lead?.id ?? item.id,
        action_url: "/pro/leads",
        created_at: item.created_at,
      });
    });

  const canSeeAllTasks = ["clinic_owner", "clinic_admin"].includes(userRole);
  tasks
    .filter(
      (item) =>
        item.clinic_id === clinicId &&
        (canSeeAllTasks || !item.assigned_to || item.assigned_to === userId) &&
        !item.done &&
        item.due_at &&
        new Date(item.due_at) < now,
    )
    .forEach((item) =>
      add({
        id: `notification_${item.category === "follow_up" ? "follow_up" : "task"}_${item.id}`,
        type: item.category === "follow_up" ? "follow_up_overdue" : "task_overdue",
        title: item.category === "follow_up" ? "Follow-up overdue" : "Task overdue",
        message: item.title,
        entity_type: "task",
        entity_id: item.id,
        action_url: "/pro/tasks",
        created_at: item.due_at!,
      }),
    );

  plans
    .filter(
      (item) =>
        item.clinic_id === clinicId &&
        ["doctor_review", "approved", "viewed", "accepted"].includes(item.status ?? ""),
    )
    .forEach((item) => {
      const type =
        item.status === "doctor_review"
          ? "plan_review"
          : item.status === "approved"
            ? "plan_approved"
            : item.status === "viewed"
              ? "plan_viewed"
              : "plan_accepted";
      const title =
        item.status === "doctor_review"
          ? "Treatment Plan awaiting review"
          : item.status === "approved"
            ? "Treatment Plan approved"
            : item.status === "viewed"
              ? "Patient viewed Treatment Plan"
              : "Patient accepted Treatment Plan";
      add({
        id: `notification_plan_${item.id}_${item.status}`,
        type,
        title,
        message: item.title,
        entity_type: "treatment_plan",
        entity_id: item.id,
        action_url: `/pro/treatment-plans/${item.id}`,
        created_at: item.updated_at,
      });
    });

  const upcomingLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  appointments
    .filter(
      (item) =>
        item.clinic_id === clinicId &&
        new Date(item.starts_at) >= now &&
        new Date(item.starts_at) <= upcomingLimit,
    )
    .forEach((item) =>
      add({
        id: `notification_appointment_${item.id}`,
        type: "upcoming_appointment",
        title: "Upcoming appointment",
        message: item.title,
        entity_type: "appointment",
        entity_id: item.id,
        action_url: "/pro/appointments",
        created_at: item.starts_at,
      }),
    );

  return records.map((record) => ({
    ...record,
    id: `${record.id}_${userId}`,
    user_id: userId,
  }));
}
