import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BridgeUnitRole,
  ConditionType,
  DentalPlan,
  PlannerMode,
  ToothCondition,
  ToothNumber,
  TreatmentType,
} from "../types/dental-plan.types";
import { useHistoryState } from "../hooks/useHistoryState";
import { useToothSelection } from "../hooks/useToothSelection";
import { applyCondition, removeCondition } from "../rules/conditionRules";
import { validateTreatment } from "../rules/treatmentRules";
import { validateBridge } from "../rules/bridgeRules";
import { treatmentByType } from "../data/treatmentDefinitions";
import { DentalChart } from "./DentalChart";
import { ConditionSelector } from "./ConditionSelector";
import { TreatmentSelector } from "./TreatmentSelector";
import { TreatmentSummary } from "./TreatmentSummary";
import { ConditionSummary } from "./ConditionSummary";
import { TreatmentLegend } from "./TreatmentLegend";
import { BridgeConfigurator } from "./BridgeConfigurator";

export type TreatmentPlannerProps = {
  value: DentalPlan;
  onChange: (plan: DentalPlan) => void;
  readOnly?: boolean;
};
export function TreatmentPlanner({ value, onChange, readOnly }: TreatmentPlannerProps) {
  const history = useHistoryState(value);
  const initialized = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (!initialized.current) {
      history.reset(value);
      initialized.current = true;
    } else if (value.id !== history.state.id) history.reset(value);
    // The source planner intentionally resets history only when the plan identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.id]);
  useEffect(() => onChangeRef.current(history.state), [history.state]);
  const [mode, setMode] = useState<PlannerMode>("current");
  const [message, setMessage] = useState<string | null>(null);
  const currentSelection = useToothSelection();
  const proposedSelection = useToothSelection();
  const selection = mode === "current" ? currentSelection : proposedSelection;
  const [bridgeTeeth, setBridgeTeeth] = useState<ToothNumber[] | null>(null);
  const applyConditionToSelection = useCallback(
    (condition: ConditionType) => {
      if (!selection.selected.length) {
        setMessage("Select at least one tooth first.");
        return;
      }
      history.commit((previous) => {
        const next = { ...previous, currentConditions: { ...previous.currentConditions } };
        for (const tooth of selection.selected) {
          const existing = next.currentConditions[tooth]?.conditions ?? [];
          next.currentConditions[tooth] = {
            toothNumber: tooth,
            conditions: applyCondition(existing, condition),
          } as ToothCondition;
        }
        next.updatedAt = new Date().toISOString();
        return next;
      });
      setMessage(null);
    },
    [history, selection.selected],
  );
  const removeConditionFromTooth = useCallback(
    (tooth: ToothNumber, condition: ConditionType) =>
      history.commit((previous) => {
        const next = { ...previous, currentConditions: { ...previous.currentConditions } };
        const remaining = removeCondition(
          next.currentConditions[tooth]?.conditions ?? [],
          condition,
        );
        if (!remaining.length) delete next.currentConditions[tooth];
        else next.currentConditions[tooth] = { toothNumber: tooth, conditions: remaining };
        next.updatedAt = new Date().toISOString();
        return next;
      }),
    [history],
  );
  const applyTreatmentToSelection = useCallback(
    (treatment: TreatmentType) => {
      if (!selection.selected.length) {
        setMessage("Select at least one tooth first.");
        return;
      }
      const definition = treatmentByType(treatment);
      if (treatment === "bridge") {
        const result = validateBridge(selection.selected);
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
        setBridgeTeeth([...selection.selected]);
        return;
      }
      for (const tooth of selection.selected) {
        const result = validateTreatment(
          treatment,
          tooth,
          history.state.currentConditions,
          history.state.proposedTreatments,
        );
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
      }
      history.commit((previous) => {
        const next = { ...previous, proposedTreatments: [...previous.proposedTreatments] };
        if (definition.perTooth)
          for (const tooth of selection.selected)
            next.proposedTreatments.push({
              id: crypto.randomUUID(),
              treatmentType: treatment,
              toothNumbers: [tooth],
            });
        else
          next.proposedTreatments.push({
            id: crypto.randomUUID(),
            treatmentType: treatment,
            toothNumbers: [...selection.selected],
          });
        next.updatedAt = new Date().toISOString();
        return next;
      });
      setMessage(null);
    },
    [history, selection.selected],
  );
  const confirmBridge = useCallback(
    (roles: Partial<Record<ToothNumber, BridgeUnitRole>>) => {
      if (!bridgeTeeth) return;
      const groupId = crypto.randomUUID();
      history.commit((previous) => ({
        ...previous,
        proposedTreatments: [
          ...previous.proposedTreatments,
          {
            id: crypto.randomUUID(),
            treatmentType: "bridge",
            toothNumbers: [...bridgeTeeth],
            treatmentGroupId: groupId,
            bridgeRoles: roles,
          },
        ],
        updatedAt: new Date().toISOString(),
      }));
      setBridgeTeeth(null);
    },
    [bridgeTeeth, history],
  );
  const deleteTreatment = useCallback(
    (id: string) =>
      history.commit((previous) => {
        const target = previous.proposedTreatments.find((item) => item.id === id);
        if (!target) return previous;
        return {
          ...previous,
          proposedTreatments: previous.proposedTreatments.filter((item) =>
            target.treatmentGroupId
              ? item.treatmentGroupId !== target.treatmentGroupId
              : item.id !== id,
          ),
          updatedAt: new Date().toISOString(),
        };
      }),
    [history],
  );
  const resetPlan = useCallback(() => {
    history.commit((previous) => ({
      ...previous,
      currentConditions: {},
      proposedTreatments: [],
      updatedAt: new Date().toISOString(),
    }));
    currentSelection.clear();
    proposedSelection.clear();
  }, [currentSelection, history, proposedSelection]);
  const highlightTeeth = useCallback(
    (teeth: number[]) => {
      proposedSelection.setSelected(teeth as ToothNumber[]);
      setMode("proposed");
    },
    [proposedSelection],
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Patient
          <input
            type="text"
            value={history.state.patientName ?? ""}
            onChange={(event) =>
              history.set((previous) => ({ ...previous, patientName: event.target.value }), {
                commit: false,
              })
            }
            placeholder="Patient name"
            className="rounded border bg-background px-2 py-1 text-sm"
            disabled={readOnly}
          />
        </label>
        <div className="flex items-center gap-2">
          <ToolButton onClick={history.undo} disabled={!history.canUndo || readOnly}>
            Undo
          </ToolButton>
          <ToolButton onClick={history.redo} disabled={!history.canRedo || readOnly}>
            Redo
          </ToolButton>
          <ToolButton onClick={resetPlan} disabled={readOnly}>
            Reset Plan
          </ToolButton>
        </div>
      </div>
      <div
        role="tablist"
        aria-label="Planner mode"
        className="inline-flex rounded-lg border bg-card p-1"
      >
        <ModeButton active={mode === "current"} onClick={() => setMode("current")}>
          Current Dental Condition
        </ModeButton>
        <ModeButton active={mode === "proposed"} onClick={() => setMode("proposed")}>
          Proposed Treatment Plan
        </ModeButton>
      </div>
      {message && (
        <div
          role="alert"
          className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {message}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_320px]">
        <DentalChart
          title="Current Dental Condition"
          mode="current"
          currentConditions={history.state.currentConditions}
          proposedTreatments={history.state.proposedTreatments}
          selected={currentSelection.selected}
          readOnly={mode !== "current" || readOnly}
          onSelect={currentSelection.toggle}
          onSelectAllUpper={currentSelection.selectAllUpper}
          onSelectAllLower={currentSelection.selectAllLower}
          onClearSelection={currentSelection.clear}
        />
        <DentalChart
          title="Proposed Treatment Plan"
          mode="proposed"
          currentConditions={history.state.currentConditions}
          proposedTreatments={history.state.proposedTreatments}
          selected={proposedSelection.selected}
          readOnly={mode !== "proposed" || readOnly}
          onSelect={proposedSelection.toggle}
          onSelectAllUpper={proposedSelection.selectAllUpper}
          onSelectAllLower={proposedSelection.selectAllLower}
          onClearSelection={proposedSelection.clear}
        />
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 text-xs text-muted-foreground">
              Selected: {selection.selected.length ? selection.selected.join(", ") : "none"}
            </div>
            {mode === "current" ? (
              <ConditionSelector
                disabled={!!readOnly || !selection.selected.length}
                onApply={applyConditionToSelection}
              />
            ) : (
              <TreatmentSelector
                disabled={!!readOnly || !selection.selected.length}
                onApply={applyTreatmentToSelection}
              />
            )}
          </div>
          {bridgeTeeth && (
            <BridgeConfigurator
              teeth={bridgeTeeth}
              onCancel={() => setBridgeTeeth(null)}
              onConfirm={confirmBridge}
            />
          )}
          <TreatmentLegend />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ConditionSummary
          conditions={history.state.currentConditions}
          onRemove={(tooth, condition) =>
            !readOnly && removeConditionFromTooth(tooth, condition as ConditionType)
          }
        />
        <TreatmentSummary
          treatments={history.state.proposedTreatments}
          onDelete={(id) => !readOnly && deleteTreatment(id)}
          onHighlight={highlightTeeth}
        />
      </div>
    </div>
  );
}
function ToolButton({
  children,
  onClick,
  disabled,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-40"
    >
      {children}
    </button>
  );
}
function ModeButton({
  children,
  active,
  onClick,
}: {
  children: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
    >
      {children}
    </button>
  );
}
