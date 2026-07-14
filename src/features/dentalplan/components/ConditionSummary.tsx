import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { conditionByType } from "../data/conditionDefinitions";
import type { ToothCondition, ToothNumber } from "../types/dental-plan.types";

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
  const count = entries.reduce((sum, item) => sum + item.conditions.length, 0);
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Recorded conditions</p>
        <Badge variant="secondary">{count} findings</Badge>
      </div>
      {entries.length ? (
        <div className="flex flex-wrap gap-2">
          {entries.flatMap((entry) =>
            entry.conditions.map((condition) => (
              <div
                key={`${entry.toothNumber}-${condition}`}
                className="inline-flex items-center rounded-full border bg-background"
                style={{ borderColor: conditionByType(condition).color }}
              >
                <span className="px-3 py-1.5 text-xs font-medium">
                  {entry.toothNumber} · {conditionByType(condition).label}
                </span>
                <button
                  type="button"
                  className="mr-1 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onRemove(entry.toothNumber, condition)}
                  aria-label={`Remove ${conditionByType(condition).label} from tooth ${entry.toothNumber}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            )),
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select teeth, then record the current clinical condition.
        </p>
      )}
    </div>
  );
}
