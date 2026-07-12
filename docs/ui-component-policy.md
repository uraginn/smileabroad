# UI component policy

Use components in `src/components/ui` before creating feature UI. If a needed control is missing, add a shadcn-compatible component backed by the project's installed Radix primitives. Do not add a second design system.

Small feature wrappers are appropriate only when they compose shared components around domain-specific behavior. Keep domain components such as the dental chart when no generic component represents their business behavior.

## Preferred mapping

- Navigation and view switches: Tabs; workflow completion: Progress.
- Searchable selection: Combobox or Popover + Command. Small fixed sets: Select.
- Grouped lists: Accordion. Long content: Scroll Area.
- Forms: Dialog, Sheet, or Drawer on mobile. Destructive confirmation: Alert Dialog.
- Status and selection: Badge. Boolean choices: Switch, Checkbox, or Toggle Group.
- Files and images: Attachment; image browsing: Carousel.
- Feedback: Sonner. Warnings: Alert. Blocking conflicts: Alert Dialog.
- Desktop split workspaces: Resizable Panels with a stacked mobile fallback.

Preserve shared design tokens, typography, spacing, button variants, keyboard behavior, and focus management. Do not replace working domain controls solely for visual uniformity.
