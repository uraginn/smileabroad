import { treatmentByType } from "../data/treatmentDefinitions";
import type { ToothTreatment } from "../types/dental-plan.types";
import { orderedByArch } from "../utils/toothNumbers";
export function TreatmentSummary({
  treatments,
  onDelete,
  onHighlight,
}: {
  treatments: ToothTreatment[];
  onDelete: (id: string) => void;
  onHighlight: (teeth: number[]) => void;
}) {
  if (!treatments.length)
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        No proposed treatments added.
      </div>
    );
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-3 text-sm font-semibold">Proposed Treatments</div>
      <ul className="divide-y">
        {treatments.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 p-3">
            <button
              type="button"
              className="text-left text-sm hover:text-primary"
              onClick={() => onHighlight(item.toothNumbers)}
            >
              <span className="font-medium">{treatmentByType(item.treatmentType).label}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                Teeth {orderedByArch(item.toothNumbers).join(", ")}
              </span>
              {item.bridgeRoles && (
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {Object.entries(item.bridgeRoles)
                    .map(([tooth, role]) => `${tooth}: ${role}`)
                    .join(" · ")}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="text-xs text-muted-foreground hover:text-destructive"
              aria-label={`Remove ${treatmentByType(item.treatmentType).label}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
