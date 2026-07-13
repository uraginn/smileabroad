import type { Role } from "@/types/models";

export type ClinicPermission =
  | "dashboard.view"
  | "leads.view"
  | "leads.manage"
  | "patients.view"
  | "patients.manage"
  | "treatment_plans.view"
  | "treatment_plans.create"
  | "treatment_plans.edit_clinical"
  | "treatment_plans.edit_commercial"
  | "treatment_plans.submit_review"
  | "treatment_plans.approve"
  | "treatment_plans.share"
  | "tasks.view"
  | "tasks.manage"
  | "appointments.view"
  | "appointments.manage"
  | "communication.view"
  | "communication.manage"
  | "reports.view"
  | "settings.clinic"
  | "settings.users"
  | "settings.dental_planner"
  | "settings.pipeline"
  | "settings.templates";

const ALL: ClinicPermission[] = [
  "dashboard.view",
  "leads.view",
  "leads.manage",
  "patients.view",
  "patients.manage",
  "treatment_plans.view",
  "treatment_plans.create",
  "treatment_plans.edit_clinical",
  "treatment_plans.edit_commercial",
  "treatment_plans.submit_review",
  "treatment_plans.approve",
  "treatment_plans.share",
  "tasks.view",
  "tasks.manage",
  "appointments.view",
  "appointments.manage",
  "communication.view",
  "communication.manage",
  "reports.view",
  "settings.clinic",
  "settings.users",
  "settings.dental_planner",
  "settings.pipeline",
  "settings.templates",
];
const ROLE_PERMISSIONS: Partial<Record<Role, ClinicPermission[]>> = {
  clinic_owner: ALL,
  clinic_admin: ALL,
  coordinator: ALL.filter(
    (item) =>
      ![
        "treatment_plans.approve",
        "settings.clinic",
        "settings.users",
        "settings.dental_planner",
        "settings.pipeline",
        "settings.templates",
        "reports.view",
      ].includes(item),
  ),
  dentist: [
    "dashboard.view",
    "leads.view",
    "patients.view",
    "treatment_plans.view",
    "treatment_plans.edit_clinical",
    "treatment_plans.submit_review",
    "treatment_plans.approve",
    "tasks.view",
    "tasks.manage",
    "appointments.view",
    "appointments.manage",
    "communication.view",
    "communication.manage",
  ],
  viewer: [
    "dashboard.view",
    "leads.view",
    "patients.view",
    "treatment_plans.view",
    "tasks.view",
    "appointments.view",
    "communication.view",
  ],
  sales: [
    "dashboard.view",
    "leads.view",
    "leads.manage",
    "patients.view",
    "patients.manage",
    "tasks.view",
    "tasks.manage",
    "appointments.view",
    "appointments.manage",
    "communication.view",
    "communication.manage",
  ],
};

export function canUser(
  user: { role: Role; clinic_id?: string } | null | undefined,
  permission: ClinicPermission,
) {
  return Boolean(user?.clinic_id && ROLE_PERMISSIONS[user.role]?.includes(permission));
}

export function canAccessClinicRecord(
  user: { role: Role; clinic_id?: string } | null | undefined,
  clinicId: string,
) {
  return user?.role === "platform_admin" || Boolean(user?.clinic_id && user.clinic_id === clinicId);
}

export function permissionForProPath(pathname: string): ClinicPermission {
  if (pathname.startsWith("/pro/settings")) return "settings.clinic";
  if (pathname.startsWith("/pro/reports")) return "reports.view";
  if (pathname.startsWith("/pro/communication")) return "communication.view";
  if (pathname.startsWith("/pro/appointments")) return "appointments.view";
  if (pathname.startsWith("/pro/tasks")) return "tasks.view";
  if (pathname.startsWith("/pro/treatment-plans") || pathname.startsWith("/pro/quotes"))
    return "treatment_plans.view";
  if (pathname.startsWith("/pro/patients")) return "patients.view";
  if (pathname.startsWith("/pro/leads")) return "leads.view";
  return "dashboard.view";
}
