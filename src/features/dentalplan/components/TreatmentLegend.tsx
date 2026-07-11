import { CONDITION_DEFINITIONS } from "../data/conditionDefinitions";
import { TREATMENT_DEFINITIONS } from "../data/treatmentDefinitions";
export function TreatmentLegend() {
  const items = [
    ...CONDITION_DEFINITIONS.filter((item) => item.supported),
    ...TREATMENT_DEFINITIONS.filter((item) => item.supported),
  ];
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Visual legend
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {items.map((item) => (
          <div key={`${item.type}-${item.label}`} className="flex items-center gap-2 text-[11px]">
            <span
              className="size-2.5 shrink-0 rounded-sm border"
              style={{ background: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
