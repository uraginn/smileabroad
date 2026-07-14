# SmileAbroad Manual Validation Checklist

Use a clean browser profile unless a scenario explicitly requires persisted data. Record failures with the route, role, viewport, console message, and reproduction steps.

## Setup

1. Run `npm run dev` and open `http://localhost:8080`.
2. Keep DevTools Console and Application > Local Storage open.
3. Test clinic roles separately: Owner, Clinic Admin, Coordinator, Dentist, Viewer, Sales, Platform Admin.
4. Before destructive scenarios, note the current localStorage record counts.

## Public patient flow

| Step | Action | Expected result | Failure notes |
| --- | --- | --- | --- |
| Landing | Open `/` and start the assessment. | Assessment opens without authentication. | Record dead links or authentication redirects. |
| Assessment | Complete every step, select upload metadata, and submit once. | Exactly one Assessment is created and all entered fields survive refresh. | Compare stored assessment before/after refresh. |
| Roadmap | Open the generated Roadmap and refresh directly. | Roadmap loads from the submitted Assessment; it is clearly preliminary. | Record blank hydration or invalid estimate state. |
| Clinic Search | Continue to `/clinics`, filter, open a clinic, then go back. | Roadmap context and filters remain associated with the active journey. | Record context loss or Assessment restart. |
| Application | Apply once, then repeat the submit action. | One Application, one Lead, and one clinic-scoped Patient exist. | Record duplicate IDs/counts. |
| Confirmation | Open the returned confirmation ID and refresh. | The real Application is confirmed. | Invalid IDs must not show success. |
| New journey | Start a new Assessment after completion. | A new anonymous submission identity is used. | Confirm the previous patient is not silently reused. |

## CRM intake and tenant isolation

1. Log in as a clinic Owner and open the Application-created Lead.
2. Confirm `assessment_id`, `roadmap_id`, `clinic_application_id`, and `clinic_patient_id` point to the same journey.
3. Confirm Assessment and Roadmap context is visible from Lead and Patient workspaces.
4. Copy a Patient, Lead, Treatment Plan, Task, and Appointment ID from another clinic and try direct URLs/mutations.

Expected: one Lead and one Patient per application/clinic; foreign records show a safe unavailable state and cannot be modified. Viewer cannot mutate. Platform Admin cannot enter clinic CRM accidentally.

## Follow-up

| Action | Expected result |
| --- | --- |
| Schedule for today | Appears as due today, creates one activity, and updates the next follow-up. |
| Schedule in the past | Appears overdue and produces one notification. |
| Complete | Moves to completed once; Dashboard and notification state update. |
| Repeat completion/refresh | No duplicate activity, notification, or follow-up appears. |

## Treatment Plan creation

Test from an existing Lead, an existing Patient, and New Patient mode.

- New Patient requires Full name only; date of birth and WhatsApp remain optional.
- Exactly one Patient and one Treatment Plan are created.
- New Patient mode does not create a fake Lead, Assessment, or Roadmap.
- Dentist and Coordinator choices contain only active-clinic users.
- Repeating Create/Open resolves the same active or empty draft instead of duplicating it.
- Direct refresh opens the same plan.

## Dental Planner

### Patient & Case

- Verify full name, optional contact fields, source context, Dentist, and Coordinator.
- Dentist can view but cannot edit patient, assignment, Package, Commercial, or share-token data.
- Viewer is read-only. Owner/Admin/Coordinator permissions match the visible actions.

### Clinical Planning

Test Current Condition and Proposed Treatment with the same diagram layout:

- single tooth selection;
- Ctrl/Cmd multi-selection;
- rectangle selection;
- upper arch, lower arch, and clear selection;
- search and category filtering;
- apply, edit, and remove treatment;
- clinic custom treatments;
- implant + crown;
- extraction + implant;
- bridge;
- whitening;
- All-on-4/full arch;
- contradictory-state warning behavior.

Expected: the selected-teeth toolbar and applied-treatment summary remain synchronized, no duplicate items appear, and changing plan IDs never shows the previous plan.

### Package

Verify hotel, nights, hotel images, website, airport transfer, hotel transfer, flight inclusion, default services, and Settings-created services. Refresh and confirm persistence. Clinic-only notes must never appear publicly.

### Commercial

Verify currency, unit price, quantity, fixed/percentage discount, subtotal, total, Visit 1, and Visit 2. Automatic distribution must equal the total. Manual adjustment must remain valid. There must be no Final Delivery or duplicate payment row.

### Review & Share

1. Review readiness warnings and patient-visible/private separation.
2. Send for Doctor Review.
3. Approve with Dentist, Owner, or Admin as allowed.
4. Confirm preview does not auto-approve or expose a draft publicly.
5. Copy the patient link and mark sent with an authorized role.
6. Open the public link once, refresh, accept/decline as appropriate.

Expected: viewed activity occurs once; draft/review/declined/expired states are not publicly available; token creation is permission checked.

## Shared Patient View

Open `/shared/treatment-plan/share_sofia_upper` and verify:

- clinic logo, banner, palette, and coordinator avatar fallback;
- one treatment table source with correct quantities, units, and totals;
- Treatment Viewer synchronization with Current and Proposed diagrams;
- tooth interaction and multi-treatment selector;
- journey, hotel carousel, included services, payment schedule, FAQ, CTA, and print;
- no internal notes, raw IDs, CRM controls, or private activity;
- `/shared/treatment-plan/invalid-token` shows a safe unavailable page.

## Tasks, Appointments, and Communication

| Module | Checks | Expected result |
| --- | --- | --- |
| Tasks | Create, assign, edit, complete, refresh. | Correct Patient/Lead/Plan relationship; one completion activity; foreign assignees rejected. |
| Appointments | Book, reschedule, change status, test conflict, refresh. | Correct clinic users and Patient/Plan links; one activity per meaningful change. |
| Communication | Log Call, WhatsApp, Email, and Internal Note; use a template. | Records are logs only, remain clinic-scoped, and do not claim a real send. |

## Settings runtime integration

- Add/deactivate a Dentist and confirm Planner assignment options update.
- Add/edit a treatment and diagram visual; confirm Clinical Planning uses it.
- Add a hotel and images; confirm Package and Shared Patient View use them.
- Add an included service; confirm Planner selection uses it.
- Change pipeline labels and sources; confirm Leads/new forms update.
- Change clinic branding; confirm Shared Patient View updates.
- Verify inactive historical configuration remains readable.

## Reports

Test multiple date ranges and verify Applications, Leads, distinct Patients, Treatment Plans, sent/accepted value, Appointments, sources, team, countries, and treatments. Confirm no Quote double counting, no Roadmap estimate counted as confirmed treatment, and no other-clinic data.

## Responsive matrix

Run each critical page at 320, 375, 430, 768, 1024, and 1440 px:

| Page group | Required checks |
| --- | --- |
| Assessment / Roadmap | No page overflow; primary action visible; cards and upload controls fit. |
| Dental Planner | Diagram usable; step/header/actions wrap; no sticky overlap; dialogs fit. |
| Shared Patient View | Treatment table adapts; diagrams/viewer remain usable; print action visible. |
| CRM tables | Tables scroll inside their region; page itself does not overflow; row actions remain reachable. |
| Settings | Tabs, dialogs, image controls, and save actions remain reachable. |

For every size also verify touch targets, keyboard focus visibility, dialog focus trapping, Sheet close controls, and that sticky elements do not cover content.

## Console validation

Check `/assessment`, a generated `/roadmap/:id`, `/pro/treatment-plans`, `/dentalplan?treatmentPlanId=tp_1`, `/shared/treatment-plan/share_sofia_upper`, `/pro/tasks`, `/pro/appointments`, and `/pro/settings` for:

- uncaught exceptions or failed route matches;
- hydration errors;
- `Maximum update depth exceeded`;
- `getSnapshot should be cached`;
- duplicate keys;
- controlled/uncontrolled input warnings;
- failed SVG/image loads or dynamic imports;
- repeated notifications, activities, or migrations;
- infinite reload/navigation loops.

## Completion record

Record browser/version, tested role, viewport, localStorage starting counts, failures, screenshots, and final pass/fail for every section above.
