## SmileAbroad — Phase 1 Foundation

A multi-tenant SaaS foundation with three connected experiences (Public site, Patient Portal, Clinic Pro Portal, Admin), a complete end-to-end mock flow, and Supabase-ready architecture.

### Scope (Phase 1)

Deliver a polished frontend foundation with mock data & mock auth. No real AI, payments, messaging, or PDF engines. Architecture prepped for Supabase multi-tenant isolation later.

### Tech & Architecture

- TanStack Start (existing stack) + TypeScript + Tailwind v4 + shadcn.
- File-based routing under `src/routes/` grouped by area.
- Mock data services in `src/lib/mock/` returning promises (swap-in ready for Supabase).
- TypeScript models in `src/types/models.ts` (every clinic-owned record has `clinic_id`; every record has `id`, `status`, `created_at`, `updated_at`, `created_by`).
- Mock auth + role switcher via Zustand store in `src/lib/auth/mock-auth.ts` with roles: `patient | clinic_owner | clinic_admin | coordinator | dentist | sales | platform_admin`.
- Reusable components in `src/components/` split by domain (`clinic-card`, `lead-card`, `dental-diagram`, `stat-card`, `empty-state`, etc.). No page-owned business logic.
- Design system: warm, trustworthy medical aesthetic — deep teal primary, soft cream background, coral accent, refined serif display + clean sans body. Tokens live in `src/styles.css` `@theme`.

### Routes

```
/                       public landing
/about /how-it-works /treatments /destinations /clinics /for-clinics /faq
/start /login /register

/assessment             multi-step, 1-question-at-a-time for Q1–Q3
/assessment/upload
/roadmap/$id

/patient/dashboard /patient/applications /patient/offers
/patient/messages /patient/profile /patient/roadmaps

/pro/dashboard /pro/leads /pro/patients /pro/patients/$id
/pro/treatment-plans /pro/treatment-plans/$id
/pro/quotes /pro/quotes/$id /pro/tasks /pro/appointments
/pro/templates /pro/settings /pro/branding

/admin/dashboard /admin/clinics /admin/users /admin/settings

/shared/treatment-plan/$token   public branded plan
```

Layouts: `_public.tsx`, `_patient.tsx`, `_pro.tsx` (sidebar), `_admin.tsx`.

### Key flows

- **Public landing**: Hero, How It Works, Treatments, Destinations, Verified Clinics, Why SmileAbroad, For Clinics, FAQ, Final CTA.
- **Assessment**: Steps Q1 (treatment), Q2 (country), Q3 (cities, multi) with Enter-to-advance; then grouped forms (Dental / Personal / Medical / Travel); then Upload (dental photos, pano, CBCT, prev plan, prev report) with local previews.
- **Roadmap**: deterministic mock generator → Summary, Est. Treatment, Visits, Healing, Price Range, Disclaimer, Recommended Clinics, Apply CTA.
- **Clinic cards**: name, country/city, image, verified badge, Google/Trustpilot ratings, languages, price range, response time, hotel, transfers, guarantee; actions Apply / Compare / View.
- **Apply** → creates a `clinic_application` + a `lead` in the target clinic's CRM.
- **Pro CRM**: Kanban with statuses New Lead → … → Completed / Lost. Lead cards show patient/country/treatment/budget/assigned/status/priority/source.
- **Patient profile (pro)**: Tabs Overview / Assessment / Medical / Files / Notes / Tasks / Treatment Plans / Quotes / Activity. Internal notes flagged `internal=true`, never rendered on shared plan.
- **Treatment Planner**: FDI numbering (upper 18–11, 21–28; lower 48–41, 31–38). Click tooth → side panel with treatment select (Implant, Crown, Extraction, Bridge, Pontic, Veneer, Composite, Filling, Root Canal, Bone Graft, Sinus Lift, Whitening, Denture). Never expands page vertically (panel fixed).
- **Quote Builder**: items from plan, unit prices, totals, hotel/transfer add-ons, payment schedule, notes, disclaimer.
- **Clinic Branding**: logo, name, primary/secondary color, contact, doctors, guarantees, hotel, transfer, terms. Shared plan pulls from branding.
- **Shared Treatment Plan**: public URL renders branded plan + diagram + breakdown + visits + guarantees + hotel + transfers + payment plan + disclaimer + Download PDF (placeholder).
- **Admin**: mock dashboard, clinics list, users list, settings.

### Data Models (TS interfaces, mock CRUD services)

`User, Profile, Clinic, ClinicMember, Patient, Assessment, MedicalHistory, TravelPreferences, UploadedFile, ClinicApplication, Lead, LeadActivity, Task, Appointment, TreatmentPlan, TreatmentPlanItem, Quote, QuoteItem, ClinicBranding, ClinicPricing, Message`.

Mock store lives in-memory + seeds realistic data (3 clinics across Turkey/Hungary/Mexico, 6 leads at various stages, 2 treatment plans, 2 quotes). Tenant isolation enforced at the service layer (`listLeads({ clinicId })` filters), mirroring future RLS.

### Reusable components

`Sidebar, TopNav, PageHeader, StatCard, EmptyState, LoadingState, ErrorState, ClinicCard, LeadCard, KanbanBoard, KanbanColumn, DentalDiagram, ToothPanel, PriceBreakdown, UploadDropzone, StepIndicator, RoleSwitcher, VerifiedBadge, RatingPill`.

### Explicitly NOT in Phase 1

Real AI, Stripe, subscriptions, WhatsApp, live reviews, email automation, real-time chat, advanced PDF, mobile app, CBCT viewer, auto ranking.

### Deliverable

A polished, cohesive, production-feeling SaaS foundation where the full patient→clinic mock journey works end-to-end, with a role switcher to jump between Patient / Clinic / Admin views for demo.

This is a large build — I'll ship it in one pass and then you can iterate on any area (design, specific flow, or a feature to deepen).