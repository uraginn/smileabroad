# Unified Treatment Plan architecture

## Document boundaries

- **Roadmap** is an anonymous, preliminary public estimate. Clinics cannot edit it and its estimates remain `preliminary_suggestions`, never confirmed clinical treatment.
- **TreatmentPlan** is clinic-owned and is the canonical clinical, travel, commercial, workflow and sharing record.
- **Patient Shared View** is a read-only projection of TreatmentPlan. The mapper excludes internal notes, medical records, CRM activity, tasks and raw identifiers.

## Active architecture

TreatmentPlan is the only active clinic document. It owns clinical content, travel and services, pricing, payment schedule, workflow status and the stable patient share token. Totals are derived by `calculateTreatmentPlanTotals()`; price item IDs are deduplicated on save and migration.

The public token route resolves TreatmentPlan directly and renders only `mapTreatmentPlanToPatientDocument()`. Public access is limited to approved, sent, viewed and accepted plans. An authenticated same-clinic user, or platform administrator, may use clinic preview for non-public plans without changing their status.

## Legacy compatibility

Store migration v15 consumes linked legacy Quote records once, copies their commercial values, status history and share tokens into TreatmentPlan, and removes the old Quote array from persisted state. Migration-only Quote types and the compatibility mapper remain isolated under the mock migration layer; the active application does not read or write Quote records.

Old `/pro/quotes` bookmarks redirect to Treatment Plans. An old detail URL resolves only through the stored `legacy_quote_id` on a TreatmentPlan owned by the active clinic. Existing `/shared/treatment-plan/:token` links keep the same URL and resolve the migrated TreatmentPlan directly.

## Status and privacy

Status transitions are centrally guarded: draft to doctor review, approval, sent, viewed, and accepted or declined, with explicit reopen and expiry paths. Public viewing marks a sent plan as viewed once; preview never mutates status. The patient mapper excludes internal notes, medical history, medications, allergies, tasks, CRM activity, staff warnings and raw internal identifiers.
