import { FDI_UPPER, FDI_LOWER, treatmentColor } from "@/lib/dental";
import { cn } from "@/lib/utils";
import type { TreatmentPlanItem } from "@/types/models";

export function DentalDiagram({
  items = [], selected, onSelect, size = "md",
}: {
  items?: TreatmentPlanItem[];
  selected?: number;
  onSelect?: (tooth: number) => void;
  size?: "sm" | "md";
}) {
  const treatmentByTooth = new Map(items.map((i) => [i.tooth, i.treatment]));
  const w = size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs";

  const renderRow = (nums: number[]) => (
    <div className="flex justify-center gap-0.5 flex-wrap">
      {nums.map((n) => {
        const t = treatmentByTooth.get(n);
        const isSelected = selected === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onSelect?.(n)}
            style={t ? { backgroundColor: treatmentColor(t), color: "white", borderColor: treatmentColor(t) } : undefined}
            className={cn(
              w,
              "rounded-md border border-border font-medium transition-all",
              "hover:border-primary hover:scale-110",
              !t && "bg-card text-foreground",
              isSelected && "ring-2 ring-accent ring-offset-2 ring-offset-background scale-110",
            )}
            title={`Tooth ${n}${t ? ` — ${t}` : ""}`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-2 select-none">
      <p className="text-[11px] text-muted-foreground text-center uppercase tracking-wider">Upper</p>
      {renderRow(FDI_UPPER)}
      <div className="h-px bg-border my-3" />
      {renderRow(FDI_LOWER)}
      <p className="text-[11px] text-muted-foreground text-center uppercase tracking-wider">Lower</p>
    </div>
  );
}
