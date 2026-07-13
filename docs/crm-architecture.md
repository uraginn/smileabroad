# SmileAbroad CRM Architecture

## Modules and workflow

The clinic CRM contains Dashboard, Leads, Patients, Treatment Plans, Tasks, Appointments,
Communication, Reports and Settings. Its operational flow is Application → Lead → Follow-up →
Patient → Treatment Plan → Doctor Review → Patient View → Accepted → Appointment → Treatment.

A Roadmap is an anonymous, automatically generated preliminary assessment result. It is not a
clinic-owned clinical document and clinics cannot edit it. A Treatment Plan is clinic-owned and is
the single editable clinical, commercial and patient-facing document. Legacy Quote routes remain
redirect-only compatibility routes and Quote is not an active CRM concept.

## Roles and permissions

Permissions are defined centrally in `src/lib/auth/permissions.ts`.

- Clinic Owner and Clinic Admin manage the clinic, users, settings, reports and all CRM records.
- Coordinators manage intake, patients, draft plans, commercial content and operations, but cannot
  approve plans or manage clinic-wide configuration.
- Dentists manage clinical plan review, assigned appointments and relevant clinical tasks, but not
  clinic-wide or commercial settings.
- Viewers have read-only access to permitted clinic modules.
- Platform Admin is separate and cannot use clinic routes as a clinic member.

Route visibility is permission-based. Records and mutations also carry `clinic_id`; direct record
access must match the active user's clinic. This client-side enforcement is for the mock environment
only and is not a substitute for server authorization.

## Settings and runtime configuration

Clinic Profile updates clinic and shared-view branding records. Users & Roles controls local mock
access without claiming invitation delivery. Dental Planner settings remain the canonical location
for treatments, dentist profiles, clinical templates and hotels. CRM Workflow preserves stable
pipeline keys while allowing display label, order and optional-stage activation changes. Sources
preserve historical keys and can be deactivated. Communication Templates reuse the same canonical
records consumed by Communication logging.

Reports are calculated from distinct, clinic-scoped Applications, Leads, Patients, unified Treatment
Plans and non-cancelled Appointments. They do not read or double-count legacy Quote records and do
not present fabricated trends.

## Development-only storage limitations

The current Zustand mock store persists data in the local browser. Authentication, authorization,
medical file storage, activity history and notifications are development demonstrations. The system
does not claim HIPAA or GDPR compliance, encrypted cloud storage, delivery of invitations or
communications, or production-grade auditability.

Production use still requires server-side authentication and authorization, a secure tenant-aware
database, protected medical-file storage, immutable audit logs, backups, monitoring, retention and
deletion policies, secrets management, tested recovery procedures, and real communication provider
integrations with consent and delivery tracking.
