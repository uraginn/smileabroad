import { TREATMENT_DEFINITIONS } from "../data/treatmentDefinitions";
import type { TreatmentType } from "../types/dental-plan.types";
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
}: {
  disabled: boolean;
  onApply: (treatment: TreatmentType) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Apply proposed treatment
      </div>
      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {GROUPS.map((group) => (
          <section key={group.label}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{group.label}</p>
            <div className="grid grid-cols-2 gap-2">
              {group.types
                .map((type) => TREATMENT_DEFINITIONS.find((item) => item.type === type))
                .filter(Boolean)
                .map(
                  (treatment) =>
                    treatment && (
                      <button
                        key={treatment.type}
                        type="button"
                        disabled={disabled}
                        onClick={() => onApply(treatment.type)}
                        className="flex items-center gap-2 rounded border px-2 py-1.5 text-left text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                        title={`${treatment.label}${treatment.supported ? "" : " (placeholder visual)"}`}
                      >
                        <span
                          className="size-3 rounded-sm border"
                          style={{ background: treatment.color }}
                        />
                        <span className="truncate">{treatment.label}</span>
                      </button>
                    ),
                )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
