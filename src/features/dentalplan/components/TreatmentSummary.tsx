import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { treatmentByType } from "../data/treatmentDefinitions";
import type { ToothTreatment } from "../types/dental-plan.types";

export function TreatmentSummary({
  treatments,
  onDelete,
  onHighlight,
}: {
  treatments: ToothTreatment[];
  onDelete: (id: string) => void;
  onHighlight: (teeth: number[]) => void;
}) {
  const groups = groupTreatments(treatments);
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Applied treatments</p>
        <Badge variant="secondary">{treatments.length} items</Badge>
      </div>
      {groups.length ? (
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <div
              key={group.key}
              className="inline-flex items-center rounded-full border bg-background"
            >
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-medium hover:text-primary"
                onClick={() => onHighlight(group.teeth)}
              >
                {group.label} ×{group.quantity}
              </button>
              <button
                type="button"
                className="mr-1 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove ${group.label}`}
                onClick={() => group.ids.forEach(onDelete)}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select teeth, then apply a treatment to build the case.
        </p>
      )}
    </div>
  );
}

function groupTreatments(treatments: ToothTreatment[]) {
  const groups = new Map<
    string,
    { key: string; label: string; ids: string[]; teeth: number[]; quantity: number }
  >();
  treatments.forEach((treatment) => {
    const key = treatment.treatmentDefinitionId ?? treatment.treatmentType;
    const current = groups.get(key) ?? {
      key,
      label: treatment.displayName ?? treatmentByType(treatment.treatmentType).label,
      ids: [],
      teeth: [],
      quantity: 0,
    };
    current.ids.push(treatment.id);
    current.teeth = [...new Set([...current.teeth, ...treatment.toothNumbers])];
    current.quantity += Math.max(1, treatment.toothNumbers.length);
    groups.set(key, current);
  });
  return [...groups.values()];
}
