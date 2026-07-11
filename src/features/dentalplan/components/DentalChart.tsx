import type {
  PlannerMode,
  ToothCondition,
  ToothNumber,
  ToothTreatment,
} from "../types/dental-plan.types";
import { LOWER_TEETH, UPPER_TEETH, orderedByArch } from "../utils/toothNumbers";
import { Tooth } from "./Tooth";
type Props = {
  title: string;
  mode: PlannerMode;
  currentConditions: Partial<Record<ToothNumber, ToothCondition>>;
  proposedTreatments: ToothTreatment[];
  selected: ToothNumber[];
  readOnly?: boolean;
  onSelect: (tooth: ToothNumber, additive: boolean) => void;
  onSelectAllUpper?: () => void;
  onSelectAllLower?: () => void;
  onClearSelection?: () => void;
};
export function DentalChart({
  title,
  mode,
  currentConditions,
  proposedTreatments,
  selected,
  readOnly,
  onSelect,
  onSelectAllUpper,
  onSelectAllLower,
  onClearSelection,
}: Props) {
  return (
    <div
      className={`rounded-lg border bg-card p-4 ${readOnly ? "opacity-90" : ""}`}
      aria-label={title}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {readOnly ? (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Read-only
          </span>
        ) : (
          <div className="flex gap-1">
            <Mini onClick={onSelectAllUpper}>Upper</Mini>
            <Mini onClick={onSelectAllLower}>Lower</Mini>
            <Mini onClick={onClearSelection}>Clear</Mini>
          </div>
        )}
      </div>
      <div className="space-y-3 overflow-x-auto">
        <Arch
          teeth={orderedByArch(UPPER_TEETH)}
          {...{ mode, currentConditions, proposedTreatments, selected, readOnly, onSelect }}
        />
        <div className="border-t border-dashed" />
        <Arch
          teeth={orderedByArch(LOWER_TEETH)}
          {...{ mode, currentConditions, proposedTreatments, selected, readOnly, onSelect }}
        />
      </div>
    </div>
  );
}
function Mini({ children, onClick }: { children: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border px-2 py-0.5 text-[10px] hover:bg-accent"
    >
      {children}
    </button>
  );
}
function Arch(props: {
  teeth: ToothNumber[];
  currentConditions: Partial<Record<ToothNumber, ToothCondition>>;
  proposedTreatments: ToothTreatment[];
  mode: PlannerMode;
  selected: ToothNumber[];
  readOnly?: boolean;
  onSelect: (tooth: ToothNumber, additive: boolean) => void;
}) {
  return (
    <div className="flex min-w-[650px] justify-center gap-1">
      {props.teeth.map((tooth) => (
        <Tooth
          key={tooth}
          toothNumber={tooth}
          currentConditions={props.currentConditions}
          proposedTreatments={props.proposedTreatments}
          mode={props.mode}
          selected={props.selected.includes(tooth)}
          readOnly={props.readOnly}
          onSelect={props.onSelect}
        />
      ))}
    </div>
  );
}
