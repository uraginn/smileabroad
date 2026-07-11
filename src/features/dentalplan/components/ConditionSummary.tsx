import { conditionByType } from "../data/conditionDefinitions";
import type { ToothCondition, ToothNumber } from "../types/dental-plan.types";
import { getArch } from "../utils/toothNumbers";
export function ConditionSummary({
  conditions,
  onRemove,
}: {
  conditions: Partial<Record<ToothNumber, ToothCondition>>;
  onRemove: (tooth: ToothNumber, condition: string) => void;
}) {
  const entries = Object.values(conditions).filter(
    (item): item is ToothCondition => !!item && item.conditions.length > 0,
  );
  if (!entries.length)
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        No current conditions recorded.
      </div>
    );
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-3 text-sm font-semibold">Current Conditions</div>
      {(["upper", "lower"] as const).map((arch) => (
        <section key={arch}>
          <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
            {arch} arch
          </div>
          <ul className="divide-y">
            {entries
              .filter((entry) => getArch(entry.toothNumber) === arch)
              .sort((a, b) => a.toothNumber - b.toothNumber)
              .map((entry) => (
                <li
                  key={entry.toothNumber}
                  className="flex flex-wrap items-center gap-2 p-3 text-sm"
                >
                  <span className="font-medium">Tooth {entry.toothNumber}:</span>
                  {entry.conditions.map((condition) => (
                    <span
                      key={condition}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
                      style={{ borderColor: conditionByType(condition).color }}
                    >
                      {conditionByType(condition).label}
                      <button
                        type="button"
                        onClick={() => onRemove(entry.toothNumber, condition)}
                        className="ml-1 hover:text-destructive"
                        aria-label={`Remove ${conditionByType(condition).label} from tooth ${entry.toothNumber}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
