import { TREATMENT_DEFINITIONS } from "../data/treatmentDefinitions";
import type { EffectiveTreatmentDefinition, TreatmentType } from "../types/dental-plan.types";
const GROUPS: Array<{ label: string; types: TreatmentType[] }> = [
  {
    label: "Restorative",
    types: [
      "composite-filling",
      "composite-bonding",
      "veneer",
      "zirconium-crown",
      "emax-crown",
      "porcelain-crown",
      "root-canal-treatment",
    ],
  },
  {
    label: "Surgical and implant",
    types: ["extraction", "dental-implant", "implant-crown", "bone-graft", "sinus-lift"],
  },
  { label: "Prosthetic", types: ["bridge", "pontic", "all-on-4", "all-on-6", "denture"] },
  { label: "Cosmetic", types: ["whitening"] },
];
export function TreatmentSelector({
  disabled,
  onApply,
  definitions,
}: {
  disabled: boolean;
  onApply: (treatment: EffectiveTreatmentDefinition) => void;
  definitions: EffectiveTreatmentDefinition[];
}) {
  const customGroups = [
    ...new Set(definitions.filter((item) => !item.system).map((item) => item.category)),
  ].map((category) => ({
    label: category,
    types: [] as TreatmentType[],
    definitions: definitions.filter((item) => !item.system && item.category === category),
  }));
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Apply proposed treatment
      </div>
      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {[
          ...GROUPS.map((group) => ({
            ...group,
            definitions: definitions.filter(
              (item) => item.system && group.types.includes(item.baseTreatmentKey),
            ),
          })),
          ...customGroups,
        ].map((group) => (
          <section key={group.label}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{group.label}</p>
            <div className="grid grid-cols-2 gap-2">
              {group.definitions.map((treatment) => {
                const visual = TREATMENT_DEFINITIONS.find(
                  (item) => item.type === treatment.visualKey,
                );
                return (
                  <button
                    key={treatment.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onApply(treatment)}
                    className="flex items-center gap-2 rounded border px-2 py-1.5 text-left text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                    title={`${treatment.displayName} · behaves like ${treatment.baseTreatmentKey}`}
                  >
                    <span
                      className="size-3 rounded-sm border"
                      style={{ background: visual?.color }}
                    />
                    <span className="truncate">{treatment.displayName}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
