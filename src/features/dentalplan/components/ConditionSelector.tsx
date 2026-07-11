import { CONDITION_DEFINITIONS } from "../data/conditionDefinitions";
import type { ConditionType } from "../types/dental-plan.types";
const GROUPS: Array<{ label: string; types: ConditionType[] }> = [
  {
    label: "Tooth status",
    types: ["healthy", "missing", "fractured", "mobility", "extraction-required"],
  },
  {
    label: "Existing restorations",
    types: ["existing-filling", "existing-crown", "existing-bridge", "existing-implant"],
  },
  {
    label: "Endodontic and pathology",
    types: ["root-canal-treated", "decay", "impacted", "periodontal-problem", "other"],
  },
];
export function ConditionSelector({
  disabled,
  onApply,
}: {
  disabled: boolean;
  onApply: (condition: ConditionType) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Apply current condition
      </div>
      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {GROUPS.map((group) => (
          <section key={group.label}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{group.label}</p>
            <div className="grid grid-cols-2 gap-2">
              {group.types
                .map((type) => CONDITION_DEFINITIONS.find((item) => item.type === type))
                .filter(Boolean)
                .map(
                  (condition) =>
                    condition && (
                      <button
                        key={condition.type}
                        type="button"
                        disabled={disabled}
                        onClick={() => onApply(condition.type)}
                        className="flex items-center gap-2 rounded border px-2 py-1.5 text-left text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                        title={`${condition.label}${condition.supported ? "" : " (placeholder visual)"}`}
                      >
                        <span
                          className="size-3 rounded-sm border"
                          style={{ background: condition.color }}
                        />
                        <span className="truncate">{condition.label}</span>
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
