import type {
  ConditionType,
  PlannerMode,
  ToothCondition,
  ToothNumber,
  ToothTreatment,
} from "../types/dental-plan.types";
import { resolveToothVisualState } from "../utils/resolveToothVisualState";
import { conditionByType } from "../data/conditionDefinitions";
import { treatmentByType } from "../data/treatmentDefinitions";

type Props = {
  toothNumber: ToothNumber;
  currentConditions: Partial<Record<ToothNumber, ToothCondition>>;
  proposedTreatments: ToothTreatment[];
  mode: PlannerMode;
  selected: boolean;
  readOnly?: boolean;
  allowReadOnlySelection?: boolean;
  onSelect: (tooth: ToothNumber, additive: boolean, anchor?: HTMLButtonElement) => void;
  onDragStart?: (tooth: ToothNumber, additive: boolean) => void;
  onDragEnter?: (tooth: ToothNumber) => void;
  onDragEnd?: () => void;
};
const W = 40,
  H = 56;
export function Tooth({
  toothNumber,
  currentConditions,
  proposedTreatments,
  mode,
  selected,
  readOnly,
  allowReadOnlySelection,
  onSelect,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: Props) {
  const visual = resolveToothVisualState({
    toothNumber,
    currentConditions,
    proposedTreatments,
    mode,
  });
  const isUpper = toothNumber >= 11 && toothNumber <= 28;
  const label = buildAriaLabel(toothNumber, visual.currentConditions, visual.proposedTreatments);
  return (
    <button
      type="button"
      onClick={(event) =>
        (!readOnly || allowReadOnlySelection) &&
        (allowReadOnlySelection || event.detail === 0) &&
        onSelect(toothNumber, event.shiftKey || event.metaKey || event.ctrlKey, event.currentTarget)
      }
      onPointerDown={(event) => {
        if (readOnly) return;
        event.preventDefault();
        onDragStart?.(toothNumber, event.metaKey || event.ctrlKey);
      }}
      onPointerEnter={() => !readOnly && onDragEnter?.(toothNumber)}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      draggable={false}
      disabled={readOnly && !allowReadOnlySelection}
      aria-label={label}
      aria-pressed={selected}
      className={`group relative flex flex-col items-center focus:outline-none ${readOnly && !allowReadOnlySelection ? "cursor-default opacity-90" : "cursor-pointer touch-manipulation select-none"}`}
    >
      {isUpper ? (
        <>
          <span className="mb-0.5 text-[10px] leading-none text-muted-foreground">
            {toothNumber}
          </span>
          <ToothSvg visual={visual} selected={selected} isUpper />
        </>
      ) : (
        <>
          <ToothSvg visual={visual} selected={selected} isUpper={false} />
          <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">
            {toothNumber}
          </span>
        </>
      )}
    </button>
  );
}
function ToothSvg({
  visual,
  selected,
  isUpper,
}: {
  visual: ReturnType<typeof resolveToothVisualState>;
  selected: boolean;
  isUpper: boolean;
}) {
  const flip = isUpper ? "" : "scale(1,-1) translate(0,-56)";
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="drop-shadow-sm"
      aria-hidden="true"
    >
      <g transform={flip}>
        {selected && (
          <rect
            x={1}
            y={1}
            width={W - 2}
            height={H - 2}
            rx={6}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="3 2"
          />
        )}
        {visual.showBaseTooth ? (
          <>
            <path d="M12 26 L14 52 Q20 55 26 52 L28 26 Z" fill="#f0ead6" stroke="#8a7f52" />
            <path
              d="M8 26 Q8 8 20 6 Q32 8 32 26 Z"
              fill={visual.currentConditions.includes("existing-implant") ? "#e5e7eb" : "#fafaf5"}
              stroke="#8a7f52"
            />
          </>
        ) : (
          <rect
            x={10}
            y={20}
            width={20}
            height={20}
            rx={2}
            fill="none"
            stroke="#cbd5e1"
            strokeDasharray="2 2"
          />
        )}
        {visual.currentConditions.includes("decay") && (
          <circle cx={16} cy={18} r={3} fill="#78350f" opacity={0.75} />
        )}
        {visual.currentConditions.includes("existing-filling") && (
          <rect x={16} y={14} width={8} height={6} fill="#0ea5e9" opacity={0.75} />
        )}
        {visual.currentConditions.includes("root-canal-treated") && (
          <>
            <line x1={17} y1={28} x2={16} y2={50} stroke="#dc2626" strokeWidth={1.5} />
            <line x1={23} y1={28} x2={24} y2={50} stroke="#dc2626" strokeWidth={1.5} />
          </>
        )}
        {visual.currentConditions.includes("existing-crown") && (
          <path d="M7 26 Q7 7 20 5 Q33 7 33 26 Z" fill="none" stroke="#f59e0b" strokeWidth={2} />
        )}
        {visual.currentConditions.includes("existing-implant") && <Implant color="#6366f1" />}
        {visual.currentConditions.includes("extraction-required") && <Cross color="#ef4444" />}
        {visual.proposedTreatments.includes("extraction") && <Cross color="#ef4444" />}
        {visual.proposedTreatments.includes("dental-implant") && <Implant color="#4f46e5" />}
        {visual.proposedTreatments.includes("implant-crown") && <Crown color="#7c3aed" />}
        {visual.proposedTreatments.includes("zirconium-crown") && <Crown color="#0284c7" />}
        {visual.proposedTreatments.includes("emax-crown") && <Crown color="#0891b2" />}
        {visual.proposedTreatments.includes("porcelain-crown") && <Crown color="#06b6d4" />}
        {visual.proposedTreatments.includes("temporary-crown") && <Crown color="#a3a3a3" />}
        {visual.proposedTreatments.includes("veneer") && (
          <path d="M10 24 Q10 10 20 8 Q30 10 30 24 Z" fill="#14b8a6" opacity={0.7} />
        )}
        {visual.proposedTreatments.includes("composite-filling") && (
          <rect x={15} y={12} width={10} height={8} fill="#22c55e" opacity={0.85} />
        )}
        {visual.proposedTreatments.includes("composite-bonding") && (
          <path d="M9 18 Q20 6 31 18 L31 24 Q20 12 9 24 Z" fill="#84cc16" opacity={0.7} />
        )}
        {visual.proposedTreatments.includes("root-canal-treatment") && (
          <>
            <line x1={17} y1={28} x2={16} y2={50} stroke="#e11d48" strokeWidth={2} />
            <line x1={23} y1={28} x2={24} y2={50} stroke="#e11d48" strokeWidth={2} />
          </>
        )}
        {visual.proposedTreatments.includes("pontic") && <Pontic />}
        {visual.bridgeRole === "pontic" && <Pontic />}
        {visual.bridgeRole === "abutment-crown" && <Crown color="#0369a1" />}
        {visual.bridgeRole === "implant-abutment" && (
          <>
            <Implant color="#4f46e5" />
            <Crown color="#0369a1" />
          </>
        )}
      </g>
    </svg>
  );
}
const Crown = ({ color }: { color: string }) => (
  <path d="M8 26 Q8 8 20 6 Q32 8 32 26 Z" fill={color} opacity={0.85} stroke="#0c4a6e" />
);
const Pontic = () => (
  <path
    d="M8 22 Q8 12 20 10 Q32 12 32 22 Q32 30 20 32 Q8 30 8 22 Z"
    fill="#0369a1"
    opacity={0.85}
  />
);
const Cross = ({ color }: { color: string }) => (
  <g stroke={color} strokeWidth={3} strokeLinecap="round">
    <line x1={8} y1={10} x2={32} y2={44} />
    <line x1={32} y1={10} x2={8} y2={44} />
  </g>
);
const Implant = ({ color }: { color: string }) => (
  <>
    <rect x={17} y={28} width={6} height={24} fill={color} />
    {[32, 36, 40, 44, 48].map((y) => (
      <line key={y} x1={15} y1={y} x2={25} y2={y} stroke="#312e81" strokeWidth={0.7} />
    ))}
  </>
);
function buildAriaLabel(tooth: ToothNumber, current: ConditionType[], proposed: string[]) {
  const parts = [`Tooth ${tooth}`];
  if (current.length) parts.push(current.map((item) => conditionByType(item).label).join(", "));
  if (proposed.length)
    parts.push(
      `proposed ${proposed.map((item) => treatmentByType(item as never).label).join(", ")}`,
    );
  return parts.join(", ");
}
