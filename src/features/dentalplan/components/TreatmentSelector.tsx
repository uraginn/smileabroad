import { TREATMENT_DEFINITIONS } from "../data/treatmentDefinitions";
import type { TreatmentType } from "../types/dental-plan.types";
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
      <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1">
        {TREATMENT_DEFINITIONS.map((treatment) => (
          <button
            key={treatment.type}
            type="button"
            disabled={disabled}
            onClick={() => onApply(treatment.type)}
            className="flex items-center gap-2 rounded border px-2 py-1.5 text-left text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            title={`${treatment.label}${treatment.supported ? "" : " (placeholder visual)"}`}
          >
            <span className="size-3 rounded-sm border" style={{ background: treatment.color }} />
            <span className="truncate">{treatment.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
