# DentalPlan Studio source migration

DentalPlan Studio is available at `/dentalplan`. It is a native source-level migration from `https://github.com/uraginn/dentalplan-studio.git` (audited commit `85b09f05585e6cba9fb5fbc2070b96ade4ac9961` at migration time) and does not use an iframe, a second React root, or a second router.

## Migrated source

The source treatment planner hierarchy was retained under `src/features/dentalplan`: chart, inline tooth SVG, condition and treatment selectors, summaries, legend, bridge configurator, history and selection hooks, condition/treatment/bridge rules, visual-state resolution, FDI utilities, plan types, and repository abstraction. The source has no separate SVG/static asset files; its tooth artwork and overlays are inline in `components/Tooth.tsx`.

The SmileAbroad adapter component is `DentalPlanStudio`. It accepts:

```ts
interface DentalPlanStudioProps {
  initialValue?: DentalPlanData;
  onChange?: (value: DentalPlanData) => void;
  onSave?: (value: DentalPlanData) => void;
  readOnly?: boolean;
}
```

Standalone state is stored through `LocalStorageDentalPlanRepository` at `smileabroad.dentalplan.dev.v2`. The adapter boundary is intentionally independent from Zustand, CRM patients, professional treatment plans, quotes, and shared plans.

## Source parity

The migrated implementation retains the two current-condition/proposed-treatment charts, independent selections, FDI order, multi-selection modifiers, condition conflict resolution, treatment compatibility rules, bridge contiguity and role configuration, diagnosis-to-treatment visual carryover, grouped bridge removal, highlighting, reset, undo/redo, autosave, manual save, summaries, and supported SVG overlays.

The source project does not contain pricing, currency, materials, implant brands, visits/stages, or external SVG asset files. Those fields from the earlier simplified prototype were removed because they were not part of the source state or implementation. Several definitions in the source are explicitly marked `supported: false` and therefore intentionally retain only the source's placeholder/legend behaviour rather than invented clinical visuals.

## Updating from the source

For a later synchronization, compare the source `src/features/treatment-planner` tree with `src/features/dentalplan`, migrate changes within the same subfolders, keep imports feature-relative, preserve the SmileAbroad adapter props and versioned repository key, and validate the standalone route before connecting any CRM adapter.
