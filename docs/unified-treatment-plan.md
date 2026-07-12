# Unified Treatment Plan architecture

## Document boundaries

- **Roadmap** is an anonymous, preliminary public estimate. Clinics cannot edit it and its estimates remain `preliminary_suggestions`, never confirmed clinical treatment.
- **TreatmentPlan** is clinic-owned and is the canonical clinical, travel, commercial, workflow and sharing record.
- **Patient shared view** is a read-only projection of TreatmentPlan. The mapper excludes internal notes, medical records, CRM activity, tasks and raw identifiers.

## Legacy Quote compatibility

Store migration v14 preserves every Quote and copies its commercial and sharing data into the linked TreatmentPlan without creating another plan. Clinical fields always remain owned by TreatmentPlan. Quote commercial data and valid public token/status take precedence; travel/service fields use the newer `updated_at` record.

Quote routes remain available during Phases 1–2. Their writes synchronize back to TreatmentPlan through `legacy-quote-compat.ts`. Dental Planner now finalizes directly into TreatmentPlan and only updates a Quote when that legacy record already exists; it never creates a new Quote.

Totals are derived centrally by `calculateTreatmentPlanTotals()` rather than persisted as competing values. Price item IDs remain stable and are deduplicated on save and migration.

## Phase 3 end state

The public token route will resolve TreatmentPlan directly and render `mapTreatmentPlanToPatientDocument()`. Once legacy links are no longer required, Quote records and UI can be retired without changing the unified plan or patient document contract.
