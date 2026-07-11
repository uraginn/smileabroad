# DentalPlan Studio integration

DentalPlan Studio is a native, isolated development feature available at `/dentalplan`. It does not use the CRM Zustand store, change treatment-plan models, or register a second router.

The feature boundary is `src/features/dentalplan`. `DentalPlanStudio` accepts optional `initialValue`, `onChange`, and `onSave` adapter props. Its standalone route persists only to `smileabroad.dentalplan.dev.v1` in browser local storage.

The implementation was behaviourally adapted from the referenced DentalPlan Studio project after reviewing its FDI chart, selection, treatment-rule, history, and repository patterns. No source files were copied because the referenced repository did not include a license file. SmileAbroad's existing React, TanStack Router, Tailwind, shadcn/Radix, and Lucide dependencies are reused; no packages were added.

This route is intentionally separate from `/pro/treatment-plans` and must not be treated as a production CRM record editor until a future explicit adapter is approved.
