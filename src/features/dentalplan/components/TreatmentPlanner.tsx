import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  BridgeUnitRole,
  ConditionType,
  DentalPlan,
  PlannerMode,
  ToothCondition,
  ToothNumber,
  TreatmentType,
  EffectiveTreatmentDefinition,
} from "../types/dental-plan.types";
import { useHistoryState } from "../hooks/useHistoryState";
import { useToothSelection } from "../hooks/useToothSelection";
import { applyCondition, removeCondition } from "../rules/conditionRules";
import { validateTreatment } from "../rules/treatmentRules";
import { validateBridge } from "../rules/bridgeRules";
import {
  ALL_ON_4_PRESETS,
  archForSelection,
  validateClinicalTreatment,
} from "../rules/clinicalRules";
import { treatmentByType } from "../data/treatmentDefinitions";
import { DentalChart } from "./DentalChart";
import { ConditionSelector } from "./ConditionSelector";
import { TreatmentSelector } from "./TreatmentSelector";
import { TreatmentSummary } from "./TreatmentSummary";
import { ConditionSummary } from "./ConditionSummary";
import { TreatmentLegend } from "./TreatmentLegend";
import { derivePlanDefaults } from "../utils/derivePlanDefaults";
import { BridgeConfigurator } from "./BridgeConfigurator";

export type TreatmentPlannerProps = {
  value: DentalPlan;
  onChange: (plan: DentalPlan) => void;
  readOnly?: boolean;
  definitions: EffectiveTreatmentDefinition[];
};
export function TreatmentPlanner({
  value,
  onChange,
  readOnly,
  definitions,
}: TreatmentPlannerProps) {
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
  const [pendingWarning, setPendingWarning] = useState<{
    definition: EffectiveTreatmentDefinition;
    messages: string[];
  }>();
  const currentSelection = useToothSelection();
  const proposedSelection = useToothSelection();
  const selection = mode === "current" ? currentSelection : proposedSelection;
  const [bridgeTeeth, setBridgeTeeth] = useState<ToothNumber[] | null>(null);
  const [bridgeDefinition, setBridgeDefinition] = useState<EffectiveTreatmentDefinition | null>(
    null,
  );
  const defaults = derivePlanDefaults(history.state);
  useEffect(() => {
    history.set(
      (current) => {
        const preferences = current.planningPreferences;
        const next = {
          ...preferences,
          visits:
            preferences.visits.mode === "automatic"
              ? { ...preferences.visits, value: String(defaults.recommendedVisits) }
              : preferences.visits,
          visitDuration:
            preferences.visitDuration.mode === "automatic"
              ? { ...preferences.visitDuration, value: defaults.visitDurationSummary }
              : preferences.visitDuration,
          healingPeriod:
            preferences.healingPeriod.mode === "automatic"
              ? { ...preferences.healingPeriod, value: defaults.healingPeriodSummary }
              : preferences.healingPeriod,
          estimatedStay:
            preferences.estimatedStay.mode === "automatic"
              ? { ...preferences.estimatedStay, value: defaults.estimatedStaySummary ?? "" }
              : preferences.estimatedStay,
        };
        if (JSON.stringify(next) === JSON.stringify(preferences)) return current;
        return {
          ...current,
          planningPreferences: next,
          travel: {
            ...current.travel,
            visits:
              next.visits.mode === "automatic" ? defaults.recommendedVisits : current.travel.visits,
          },
        };
      },
      { commit: false },
    );
    // Derived suggestions update only automatic fields; custom overrides are retained.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    defaults.recommendedVisits,
    defaults.visitDurationSummary,
    defaults.healingPeriodSummary,
    defaults.estimatedStaySummary,
  ]);
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
    (selectedDefinition: EffectiveTreatmentDefinition, warningConfirmed = false) => {
      const treatment = selectedDefinition.baseTreatmentKey;
      if (!selection.selected.length) {
        setMessage("Select at least one tooth first.");
        return;
      }
      const definition = treatmentByType(treatment);
      const ruleResults = validateClinicalTreatment(history.state, treatment, selection.selected);
      const blocked = ruleResults.find((result) => !result.allowed && result.severity === "block");
      if (blocked) {
        setMessage(blocked.message);
        return;
      }
      const warnings = ruleResults.filter((result) => result.severity === "warning");
      if (warnings.length && !warningConfirmed) {
        setPendingWarning({
          definition: selectedDefinition,
          messages: warnings.map((result) => result.message),
        });
        return;
      }
      if (treatment === "all-on-4") {
        const arch = archForSelection(selection.selected);
        if (
          history.state.treatmentGroups.some(
            (group) => group.type === "all-on-4" && group.arch === arch,
          )
        ) {
          setMessage(`An All-on-4 treatment already exists for the ${arch} arch.`);
          return;
        }
        const preset = ALL_ON_4_PRESETS[arch];
        const groupId = crypto.randomUUID();
        history.commit((previous) => {
          const generated = preset.implantPositions.map((tooth) => ({
            id: crypto.randomUUID(),
            toothNumbers: [tooth],
            treatmentType: "dental-implant" as const,
            treatmentGroupId: groupId,
          }));
          return {
            ...previous,
            proposedTreatments: [...previous.proposedTreatments, ...generated],
            treatmentGroups: [
              ...previous.treatmentGroups,
              {
                id: groupId,
                type: "all-on-4",
                arch,
                affectedTeeth: [...preset.prostheticRange],
                generatedTreatmentIds: generated.map((item) => item.id),
                implantPositions: [...preset.implantPositions],
              },
            ],
            updatedAt: new Date().toISOString(),
          };
        });
        setMessage(null);
        return;
      }
      if (treatment === "whitening") {
        const arches = new Set(selection.selected.map((tooth) => archForSelection([tooth])));
        const teeth = [
          ...(arches.has("upper") ? ALL_ON_4_PRESETS.upper.prostheticRange : []),
          ...(arches.has("lower") ? ALL_ON_4_PRESETS.lower.prostheticRange : []),
        ].filter(
          (tooth) =>
            !(history.state.currentConditions[tooth]?.conditions ?? []).some((condition) =>
              ["missing", "existing-crown", "existing-implant", "existing-filling"].includes(
                condition,
              ),
            ),
        );
        if (
          history.state.proposedTreatments.some(
            (item) =>
              item.treatmentType === "whitening" &&
              item.toothNumbers.some((tooth) => teeth.includes(tooth)),
          )
        ) {
          setMessage("Whitening is already included for the selected arch.");
          return;
        }
        const id = crypto.randomUUID();
        const groupId = crypto.randomUUID();
        history.commit((previous) => ({
          ...previous,
          proposedTreatments: [
            ...previous.proposedTreatments,
            { id, toothNumbers: teeth, treatmentType: "whitening", treatmentGroupId: groupId },
          ],
          treatmentGroups: [
            ...previous.treatmentGroups,
            {
              id: groupId,
              type: "full-arch",
              arch: arches.has("lower") && !arches.has("upper") ? "lower" : "upper",
              affectedTeeth: teeth,
              generatedTreatmentIds: [id],
            },
          ],
          updatedAt: new Date().toISOString(),
        }));
        setMessage("Whitening added at arch level; restorations were excluded.");
        return;
      }
      if (treatment === "bridge") {
        if (
          history.state.proposedTreatments.some(
            (item) =>
              item.treatmentType === "bridge" &&
              selection.selected.some((tooth) => item.toothNumbers.includes(tooth)),
          )
        ) {
          setMessage("A bridge is already included for one or more selected teeth.");
          return;
        }
        const result = validateBridge(selection.selected);
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
        setBridgeTeeth([...selection.selected]);
        setBridgeDefinition(selectedDefinition);
        return;
      }
      const duplicateTreatment = history.state.proposedTreatments.find(
        (item) =>
          (item.treatmentDefinitionId
            ? item.treatmentDefinitionId === selectedDefinition.id
            : item.treatmentType === treatment) &&
          selection.selected.some((tooth) => item.toothNumbers.includes(tooth)),
      );
      if (duplicateTreatment) {
        setMessage(`${selectedDefinition.displayName} is already included for a selected tooth.`);
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
              treatmentDefinitionId: selectedDefinition.id,
              treatmentKey: selectedDefinition.treatmentKey,
              visualKey: selectedDefinition.visualKey,
              displayName: selectedDefinition.displayName,
              toothNumbers: [tooth],
            });
        else
          next.proposedTreatments.push({
            id: crypto.randomUUID(),
            treatmentType: treatment,
            treatmentDefinitionId: selectedDefinition.id,
            treatmentKey: selectedDefinition.treatmentKey,
            visualKey: selectedDefinition.visualKey,
            displayName: selectedDefinition.displayName,
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
      if (
        !Object.values(roles).includes("pontic") ||
        !Object.values(roles).some((role) => role !== "pontic")
      ) {
        setMessage("A bridge requires at least one pontic and one supporting abutment.");
        return;
      }
      const groupId = crypto.randomUUID();
      const treatmentId = crypto.randomUUID();
      history.commit((previous) => ({
        ...previous,
        proposedTreatments: [
          ...previous.proposedTreatments,
          {
            id: treatmentId,
            treatmentType: "bridge",
            treatmentDefinitionId: bridgeDefinition?.id,
            treatmentKey: bridgeDefinition?.treatmentKey,
            visualKey: bridgeDefinition?.visualKey,
            displayName: bridgeDefinition?.displayName,
            toothNumbers: [...bridgeTeeth],
            treatmentGroupId: groupId,
            bridgeRoles: roles,
          },
        ],
        treatmentGroups: [
          ...previous.treatmentGroups,
          {
            id: groupId,
            type: "bridge",
            arch: archForSelection(bridgeTeeth),
            affectedTeeth: [...bridgeTeeth],
            generatedTreatmentIds: [treatmentId],
            abutments: bridgeTeeth.filter((tooth) => roles[tooth] !== "pontic"),
            pontics: bridgeTeeth.filter((tooth) => roles[tooth] === "pontic"),
            supportType: Object.values(roles).includes("implant-abutment") ? "implant" : "natural",
          },
        ],
        updatedAt: new Date().toISOString(),
      }));
      setBridgeTeeth(null);
      setBridgeDefinition(null);
    },
    [bridgeDefinition, bridgeTeeth, history],
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
          treatmentGroups: target.treatmentGroupId
            ? previous.treatmentGroups.filter((group) => group.id !== target.treatmentGroupId)
            : previous.treatmentGroups,
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
      <AlertDialog
        open={!!pendingWarning}
        onOpenChange={(open) => !open && setPendingWarning(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clinical warning</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {pendingWarning?.messages.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
                <p>Continue only when the treating clinician has reviewed this exception.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingWarning) applyTreatmentToSelection(pendingWarning.definition, true);
                setPendingWarning(undefined);
              }}
            >
              Continue with clinician override
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Planning for{" "}
          <span className="font-medium text-foreground">
            {history.state.patient.fullName || "patient"}
          </span>
        </p>
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
      <Tabs value={mode} onValueChange={(value) => setMode(value as PlannerMode)}>
        <TabsList className="h-auto max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="current">Current Dental Condition</TabsTrigger>
          <TabsTrigger value="proposed">Proposed Treatment Plan</TabsTrigger>
        </TabsList>
      </Tabs>
      <p className="text-sm text-muted-foreground">
        {mode === "current"
          ? "Record the patient’s present dental condition. These observations are not priced procedures."
          : "Plan procedures on top of the inherited current condition without changing the original diagnosis."}
      </p>
      <MedicalSafetyPanel plan={history.state} />
      {message && (
        <div
          role="alert"
          className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {message}
        </div>
      )}
      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{selection.selected.length} selected</Badge>
          {selection.selected.slice(0, 6).map((tooth) => (
            <Badge key={tooth} variant="outline">
              {tooth}
            </Badge>
          ))}
          {selection.selected.length > 6 && (
            <Badge variant="outline">+{selection.selected.length - 6}</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={selection.selectAllUpper}>
            Upper arch
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={selection.selectAllLower}>
            Lower arch
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!selection.selected.length}
            onClick={selection.clear}
          >
            Clear
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <DentalChart
          title={mode === "current" ? "Current Dental Condition" : "Proposed Treatment Plan"}
          mode={mode}
          currentConditions={history.state.currentConditions}
          proposedTreatments={history.state.proposedTreatments}
          selected={selection.selected}
          readOnly={readOnly}
          showSelectionTools={false}
          onSelect={selection.toggle}
          onSelectAllUpper={selection.selectAllUpper}
          onSelectAllLower={selection.selectAllLower}
          onSelectAll={selection.selectAll}
          onClearSelection={selection.clear}
          onDragStart={selection.beginDrag}
          onDragEnter={selection.enterDrag}
          onDragEnd={selection.endDrag}
        />
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            {mode === "current" ? (
              <ConditionSelector
                disabled={!!readOnly || !selection.selected.length}
                onApply={applyConditionToSelection}
              />
            ) : (
              <TreatmentSelector
                disabled={!!readOnly}
                canApply={selection.selected.length > 0}
                onApply={applyTreatmentToSelection}
                definitions={definitions}
              />
            )}
          </div>
          {bridgeTeeth && (
            <BridgeConfigurator
              teeth={bridgeTeeth}
              onCancel={() => {
                setBridgeTeeth(null);
                setBridgeDefinition(null);
              }}
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
function MedicalSafetyPanel({ plan }: { plan: DentalPlan }) {
  const medical = plan.importedAssessment;
  const hasDetails =
    medical.medicalConditions.length ||
    medical.medications ||
    medical.allergies ||
    medical.smoking ||
    medical.pregnancy;
  return (
    <div
      className={`rounded-lg border p-4 ${hasDetails ? "border-warning/50 bg-warning/10" : "bg-card"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Patient safety information</p>
        <div className="flex gap-2">
          {medical.panoramicAvailable && <Badge variant="outline">Panoramic available</Badge>}
          {medical.dentalPhotosAvailable && (
            <Badge variant="outline">Dental photos available</Badge>
          )}
        </div>
      </div>
      {hasDetails ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {medical.medicalConditions.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
          {medical.medications && (
            <Badge variant="outline">Medications: {medical.medications}</Badge>
          )}
          {medical.allergies && <Badge variant="outline">Allergies: {medical.allergies}</Badge>}
          {medical.smoking && <Badge variant="destructive">Smoking reported</Badge>}
          {medical.pregnancy && <Badge variant="outline">Pregnancy reported</Badge>}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No assessment medical details are available.
        </p>
      )}
    </div>
  );
}
function PlanningDefaultsPanel({
  plan,
  defaults,
  onChange,
}: {
  plan: DentalPlan;
  defaults: ReturnType<typeof derivePlanDefaults>;
  onChange: (
    key: keyof DentalPlan["planningPreferences"],
    mode: "automatic" | "custom",
    value: string,
  ) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4">
        <h3 className="font-semibold">Suggested visit and healing plan</h3>
        <p className="text-xs text-muted-foreground">
          Suggested from selected treatments — confirm clinically.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(["visits", "visitDuration", "healingPeriod", "estimatedStay"] as const).map((key) => {
          const preference = plan.planningPreferences[key];
          const automatic =
            key === "visits"
              ? String(defaults.recommendedVisits)
              : key === "visitDuration"
                ? defaults.visitDurationSummary
                : key === "healingPeriod"
                  ? defaults.healingPeriodSummary
                  : (defaults.estimatedStaySummary ?? "");
          return (
            <div key={key} className="space-y-2">
              <p className="text-sm font-medium">{key.replace(/([A-Z])/g, " $1")}</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={`rounded border px-2 py-1 text-xs ${preference.mode === "automatic" ? "bg-secondary" : ""}`}
                  onClick={() => onChange(key, "automatic", automatic)}
                >
                  Automatic
                </button>
                <button
                  type="button"
                  className={`rounded border px-2 py-1 text-xs ${preference.mode === "custom" ? "bg-secondary" : ""}`}
                  onClick={() => onChange(key, "custom", preference.value || automatic)}
                >
                  Custom
                </button>
              </div>
              <Input
                value={preference.mode === "automatic" ? automatic : preference.value}
                disabled={preference.mode === "automatic"}
                onChange={(event) => onChange(key, "custom", event.target.value)}
              />
            </div>
          );
        })}
      </div>
      {defaults.reasons.length > 0 && (
        <ul className="mt-4 list-disc pl-5 text-xs text-muted-foreground">
          {defaults.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {defaults.warnings.map((warning) => (
        <p key={warning} className="mt-2 rounded bg-warning/15 p-2 text-sm">
          {warning}
        </p>
      ))}
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
