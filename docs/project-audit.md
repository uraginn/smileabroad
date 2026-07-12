# SmileAbroad project audit

Audit date: 2026-07-12

## Architecture summary

SmileAbroad is a React/TypeScript TanStack Router application with public assessment and clinic-discovery routes, clinic and platform-admin layouts, a clinic-scoped CRM, Dental Planner, quotes, and status-gated shared plans. Development data and authentication are persisted in browser localStorage through Zustand. That architecture is suitable only for mock development.

## Findings by severity

### Critical

- Fixed: `/dentalplan?assessmentId=...` could read a locally persisted assessment without proving that it belonged to an application in the active clinic. Direct assessment loading now requires an active clinic-linked application, lead, or patient.
- Fixed: Treatment Plan editor patient and quote lookups did not both include clinic scope. Direct URL access now resolves only same-clinic related records.
- Verified: public shared plans allow only approved, sent, viewed, and accepted quotes. Draft, review, declined, expired, invalid-token, missing-plan, and missing-clinic cases remain unavailable.
- Verified: clinic-only draft preview requires an authenticated same-clinic user or platform administrator and does not mark the quote viewed.

### High

- Production blocker: medical, identity, contact, quote, and CRM data are stored unencrypted in localStorage. Move persistence to an authenticated backend with server-side authorization and tenant policies before real patient use.
- Production blocker: uploaded images use local data URLs. Real X-rays and photographs require private object storage, malware/type validation, signed access, retention, deletion, and audit controls.
- Fixed: new share tokens now use cryptographically strong UUID material when available. Existing tokens are preserved for compatibility and require a future revocation/rotation policy.
- Fixed: assessment submission now has a synchronous guard against double-click/Enter duplicate assessment and roadmap creation.
- Fixed: quote totals now reject non-finite/negative components, cap discount at gross value, and cannot become negative.

### Medium

- Zustand write actions are development actions rather than a security boundary. UI selectors are clinic-scoped, but a real backend must verify tenant ownership for every mutation.
- The Settings and Dental Planner route components are large and should be split only as a controlled maintainability refactor with regression testing.
- Legacy model fields remain in persisted hotel, plan, assessment, and quote records. They were retained where historical snapshots or migrations may still depend on them.
- The quote approval workflow and Treatment Plan doctor approval are separate state machines. Whether quote approval must require an approved clinical plan is a product decision.
- Existing public assessment/roadmap identifiers are bearer-like local references. A backend needs ownership/session binding and expiry.

### Low

- Intentional patient-portal redirect routes remain for compatibility.
- Placeholder CRM routes such as Templates and Team remain reachable and should not be deleted without a product navigation decision.
- Repository-wide lint is unusually slow and should be profiled separately; scoped lint remains the reliable development check.

## Fixes completed

- Centralized quote public visibility is used by the shared route and CRM shared actions.
- Draft/review quote actions use authenticated clinic preview; public statuses use the public view.
- Shared preview waits for auth hydration before deciding access.
- Treatment Plan related patient and quote lookups enforce matching clinic IDs.
- Dental Planner assessment imports require active-clinic linkage.
- Assessment submission is idempotent against immediate repeated UI events.
- Quote arithmetic is finite, non-negative, and discount bounded.
- New share tokens are non-predictable.
- Invalid confirmation and shared tokens retain safe unavailable states.

## Retained legacy fields

- Hotel location, room, board, currency, and descriptive fields are retained because existing plan snapshots and travel calculations can still read them.
- Treatment patient/internal labels remain optional for persisted-record compatibility, although current settings no longer expose them.
- Legacy lead statuses remain accepted and are normalized by migration.
- Patient redirect routes remain to avoid breaking old links.

## Production blockers

- Real authentication, session management, password/MFA policy, and account recovery.
- Server-side role and tenant authorization for every read and write.
- Database row-level tenant policies and immutable audit logs.
- Encryption in transit and at rest, key management, backups, and disaster recovery.
- Secure private file storage and upload scanning.
- Consent, privacy notices, lawful processing, data export, retention, and deletion workflows.
- Share-token expiry, revocation, rotation, access logging, and rate limiting.
- Server-side schema validation and clinical/commercial authorization.
- Monitoring, incident response, abuse prevention, and legal/regulatory review for medical tourism data.

## Manual tests still required

- Browser testing at 320, 375, 430, tablet, and desktop widths.
- Signed-out direct access to every `/pro`, `/admin`, and clinic-preview URL.
- Cross-clinic URL manipulation using a second populated clinic account.
- Assessment through confirmation in a fresh/incognito browser.
- Dental selection drag/Ctrl/Cmd behavior and every clinical conflict combination.
- Bridge and All-on-4 serialization, deletion, and pricing.
- Template apply/overwrite and patient-data exclusion.
- Dentist/hotel/custom-treatment creation followed by planner refresh.
- Quote approval, sent-to-viewed transition, acceptance, declined/expired rejection, and invalid token.
- Storage migration from every previously released mock-store version.
