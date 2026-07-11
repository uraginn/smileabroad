import { CONDITION_DEFINITIONS } from "../data/conditionDefinitions";
import type { ConditionType } from "../types/dental-plan.types";
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
      <div className="grid grid-cols-2 gap-2">
        {CONDITION_DEFINITIONS.map((condition) => (
          <button
            key={condition.type}
            type="button"
            disabled={disabled}
            onClick={() => onApply(condition.type)}
            className="flex items-center gap-2 rounded border px-2 py-1.5 text-left text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            title={`${condition.label}${condition.supported ? "" : " (placeholder visual)"}`}
          >
            <span className="size-3 rounded-sm border" style={{ background: condition.color }} />
            <span className="truncate">{condition.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
