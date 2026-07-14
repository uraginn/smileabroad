import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  allowReadOnlySelection?: boolean;
  showSelectionTools?: boolean;
  onSelect: (tooth: ToothNumber, additive: boolean, anchor?: HTMLButtonElement) => void;
  onSelectAllUpper?: () => void;
  onSelectAllLower?: () => void;
  onClearSelection?: () => void;
  onSelectAll?: () => void;
  onDragStart?: (tooth: ToothNumber, additive: boolean) => void;
  onDragEnter?: (tooth: ToothNumber) => void;
  onDragEnd?: () => void;
  onBoxSelect?: (teeth: ToothNumber[], additive: boolean) => void;
};
export function DentalChart({
  title,
  mode,
  currentConditions,
  proposedTreatments,
  selected,
  readOnly,
  allowReadOnlySelection,
  showSelectionTools = true,
  onSelect,
  onSelectAllUpper,
  onSelectAllLower,
  onClearSelection,
  onSelectAll,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onBoxSelect,
}: Props) {
  return (
    <div
      className={`rounded-xl bg-muted/20 px-2 py-4 sm:p-6 ${readOnly ? "opacity-90" : ""}`}
      role="group"
      aria-label={title}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {readOnly && !allowReadOnlySelection ? (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Read-only
          </span>
        ) : !readOnly && showSelectionTools ? (
          <div className="flex gap-1">
            <Mini onClick={onSelectAllUpper}>Upper</Mini>
            <Mini onClick={onSelectAllLower}>Lower</Mini>
            <Mini onClick={onClearSelection}>Clear</Mini>
            <Mini onClick={onSelectAll}>All</Mini>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto overscroll-x-contain">
        <SelectionSurface
          enabled={!readOnly && !!onBoxSelect}
          onBoxSelect={onBoxSelect}
          onPointerEnd={onDragEnd}
        >
          <Arch
            teeth={orderedByArch(UPPER_TEETH)}
            {...{
              mode,
              currentConditions,
              proposedTreatments,
              selected,
              readOnly,
              allowReadOnlySelection,
              onSelect,
              onDragStart,
              onDragEnter,
              onDragEnd,
            }}
          />
          <div className="border-t border-dashed" />
          <Arch
            teeth={orderedByArch(LOWER_TEETH)}
            {...{
              mode,
              currentConditions,
              proposedTreatments,
              selected,
              readOnly,
              allowReadOnlySelection,
              onSelect,
              onDragStart,
              onDragEnter,
              onDragEnd,
            }}
          />
        </SelectionSurface>
      </div>
      {!readOnly && onBoxSelect && (
        <p className="mt-3 text-xs text-muted-foreground">
          Drag across empty chart space to box-select. Hold Ctrl or Cmd to add to the selection.
        </p>
      )}
    </div>
  );
}

type SelectionRect = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
};

function SelectionSurface({
  enabled,
  onBoxSelect,
  onPointerEnd,
  children,
}: {
  enabled: boolean;
  onBoxSelect?: (teeth: ToothNumber[], additive: boolean) => void;
  onPointerEnd?: () => void;
  children: React.ReactNode;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const intersectingTeeth = useRef<ToothNumber[]>([]);
  const [selectionRect, setSelectionRect] = useState<SelectionRect>();
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !enabled ||
      event.pointerType === "touch" ||
      (event.target as HTMLElement).closest("button")
    )
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can be unavailable in embedded or synthetic interaction environments.
    }
    setSelectionRect({
      startX: event.clientX - bounds.left,
      startY: event.clientY - bounds.top,
      currentX: event.clientX - bounds.left,
      currentY: event.clientY - bounds.top,
      additive: event.metaKey || event.ctrlKey,
    });
    intersectingTeeth.current = [];
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!selectionRect || !surfaceRef.current) return;
    event.preventDefault();
    const bounds = surfaceRef.current.getBoundingClientRect();
    const next = {
      ...selectionRect,
      currentX: event.clientX - bounds.left,
      currentY: event.clientY - bounds.top,
    };
    setSelectionRect(next);
    if (Math.hypot(next.currentX - next.startX, next.currentY - next.startY) < 5) return;
    const selectionBounds = {
      left: bounds.left + Math.min(next.startX, next.currentX),
      right: bounds.left + Math.max(next.startX, next.currentX),
      top: bounds.top + Math.min(next.startY, next.currentY),
      bottom: bounds.top + Math.max(next.startY, next.currentY),
    };
    intersectingTeeth.current = [
      ...surfaceRef.current.querySelectorAll<HTMLElement>("[data-tooth-number]"),
    ]
      .filter((element) => intersects(selectionBounds, element.getBoundingClientRect()))
      .map((element) => Number(element.dataset.toothNumber) as ToothNumber);
  };
  const endSelection = () => {
    if (selectionRect) onBoxSelect?.(intersectingTeeth.current, selectionRect.additive);
    intersectingTeeth.current = [];
    setSelectionRect(undefined);
    onPointerEnd?.();
  };
  const left = selectionRect ? Math.min(selectionRect.startX, selectionRect.currentX) : 0;
  const top = selectionRect ? Math.min(selectionRect.startY, selectionRect.currentY) : 0;
  const width = selectionRect ? Math.abs(selectionRect.currentX - selectionRect.startX) : 0;
  const height = selectionRect ? Math.abs(selectionRect.currentY - selectionRect.startY) : 0;
  return (
    <div
      ref={surfaceRef}
      className="relative min-w-[650px] space-y-3 select-none"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={endSelection}
      onPointerCancel={endSelection}
    >
      {children}
      {selectionRect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-20 rounded border border-primary bg-primary/10"
          style={{ left, top, width, height }}
        />
      )}
    </div>
  );
}

function intersects(
  selection: { left: number; right: number; top: number; bottom: number },
  target: DOMRect,
) {
  return !(
    target.right < selection.left ||
    target.left > selection.right ||
    target.bottom < selection.top ||
    target.top > selection.bottom
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
  allowReadOnlySelection?: boolean;
  onSelect: (tooth: ToothNumber, additive: boolean, anchor?: HTMLButtonElement) => void;
  onDragStart?: (tooth: ToothNumber, additive: boolean) => void;
  onDragEnter?: (tooth: ToothNumber) => void;
  onDragEnd?: () => void;
}) {
  return (
    <div className="flex justify-center gap-1">
      {props.teeth.map((tooth) => (
        <Tooth
          key={tooth}
          toothNumber={tooth}
          currentConditions={props.currentConditions}
          proposedTreatments={props.proposedTreatments}
          mode={props.mode}
          selected={props.selected.includes(tooth)}
          readOnly={props.readOnly}
          allowReadOnlySelection={props.allowReadOnlySelection}
          onSelect={props.onSelect}
          onDragStart={props.onDragStart}
          onDragEnter={props.onDragEnter}
          onDragEnd={props.onDragEnd}
        />
      ))}
    </div>
  );
}
