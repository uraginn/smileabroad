import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  BridgeUnitRole,
  ConditionType,
  DentalPlan,
  PlannerMode,
  ToothCondition,
  ToothNumber,
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
import { treatmentComposition } from "../data/treatmentDefinitions";
import { CONDITION_DEFINITIONS } from "../data/conditionDefinitions";
import { DentalChart } from "./DentalChart";
import { ConditionSelector } from "./ConditionSelector";
import { TreatmentSelector } from "./TreatmentSelector";
import { TreatmentSummary } from "./TreatmentSummary";
import { ConditionSummary } from "./ConditionSummary";
import { derivePlanDefaults } from "../utils/derivePlanDefaults";
import { BridgeConfigurator } from "./BridgeConfigurator";
import { formatQuoteMoney } from "@/lib/quote";

export type TreatmentPlannerProps = {
  value: DentalPlan;
  onChange: (plan: DentalPlan) => void;
  readOnly?: boolean;
  pricingReadOnly?: boolean;
  definitions: EffectiveTreatmentDefinition[];
};
export function TreatmentPlanner({
  value,
  onChange,
  readOnly,
  pricingReadOnly,
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
  const [selectedCondition, setSelectedCondition] = useState<ConditionType>();
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingWarning, setPendingWarning] = useState<{
    definition: EffectiveTreatmentDefinition;
    messages: string[];
  }>();
  const currentSelection = useToothSelection();
  const proposedSelection = useToothSelection();
  const selection = mode === "current" ? currentSelection : proposedSelection;
  const selectedTreatment = definitions.find((item) => item.id === selectedTreatmentId);
  const selectedConditionLabel = CONDITION_DEFINITIONS.find(
    (item) => item.type === selectedCondition,
  )?.label;
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
      const composition = treatmentComposition(treatment);
      if (composition.length > 1) {
        const generatedGroups: DentalPlan["treatmentGroups"] = [];
        const generatedTreatments: DentalPlan["proposedTreatments"] = [];
        for (const tooth of selection.selected) {
          const existingTypes = history.state.proposedTreatments
            .filter((item) => item.toothNumbers.includes(tooth))
            .map((item) => item.treatmentType);
          const missingComponents = composition.filter((type) => !existingTypes.includes(type));
          if (!missingComponents.length) continue;
          const groupId = missingComponents.length > 1 ? crypto.randomUUID() : undefined;
          const items = missingComponents.map((component) => {
            const componentDefinition =
              definitions.find((item) => item.baseTreatmentKey === component && item.system) ??
              selectedDefinition;
            return {
              id: crypto.randomUUID(),
              toothNumbers: [tooth],
              treatmentType: component,
              treatmentDefinitionId: componentDefinition.id,
              treatmentKey: componentDefinition.treatmentKey,
              visualKey: componentDefinition.visualKey,
              displayName: componentDefinition.displayName,
              treatmentGroupId: groupId,
            };
          });
          generatedTreatments.push(...items);
          if (groupId)
            generatedGroups.push({
              id: groupId,
              type: "implant-restoration",
              arch: archForSelection([tooth]),
              affectedTeeth: [tooth],
              generatedTreatmentIds: items.map((item) => item.id),
              implantPositions: [tooth],
              supportType: "implant",
            });
        }
        if (!generatedTreatments.length) {
          setMessage(`${selectedDefinition.displayName} is already included for the selection.`);
          return;
        }
        history.commit((previous) => ({
          ...previous,
          proposedTreatments: [...previous.proposedTreatments, ...generatedTreatments],
          treatmentGroups: [...previous.treatmentGroups, ...generatedGroups],
          updatedAt: new Date().toISOString(),
        }));
        setMessage("Implant and implant-supported crown added as one linked treatment.");
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
        if (selectedDefinition.perTooth)
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
    [definitions, history, selection.selected],
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
  const deleteTreatments = useCallback(
    (ids: string[]) =>
      history.commit((previous) => {
        const idSet = new Set(ids);
        const groupIds = new Set(
          previous.proposedTreatments
            .filter((item) => idSet.has(item.id) && item.treatmentGroupId)
            .map((item) => item.treatmentGroupId as string),
        );
        return {
          ...previous,
          proposedTreatments: previous.proposedTreatments.filter(
            (item) =>
              !idSet.has(item.id) &&
              !(item.treatmentGroupId && groupIds.has(item.treatmentGroupId)),
          ),
          treatmentGroups: previous.treatmentGroups.filter((group) => !groupIds.has(group.id)),
          updatedAt: new Date().toISOString(),
        };
      }),
    [history],
  );
  const editTreatments = useCallback(
    (ids: string[], notes: string) =>
      history.commit((previous) => {
        const idSet = new Set(ids);
        return {
          ...previous,
          proposedTreatments: previous.proposedTreatments.map((item) =>
            idSet.has(item.id) ? { ...item, notes } : item,
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
    <section className="space-y-4 rounded-xl border bg-card p-3 sm:p-5">
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <h2 className="font-semibold">Clinical Planning</h2>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(value) => value && setMode(value as PlannerMode)}
          variant="outline"
          className="rounded-lg bg-muted/50 p-1"
          aria-label="Clinical planning mode"
        >
          <ToggleGroupItem value="current" className="px-4">
            Current condition
          </ToggleGroupItem>
          <ToggleGroupItem value="proposed" className="px-4">
            Proposed treatment
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <ToolButton onClick={history.undo} disabled={!history.canUndo || readOnly}>
            Undo
          </ToolButton>
          <ToolButton onClick={history.redo} disabled={!history.canRedo || readOnly}>
            Redo
          </ToolButton>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" size="sm" variant="ghost" disabled={readOnly}>
                Reset clinical plan
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset the clinical plan?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes all recorded conditions and proposed treatments. Patient, travel and
                  pricing information will remain unchanged.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetPlan}>Reset clinical plan</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="space-y-4">
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
          onBoxSelect={selection.selectBox}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">
              {selection.selected.length
                ? `${selection.selected.length} teeth selected`
                : "No teeth selected"}
            </Badge>
            {selection.selected.length > 0 && selection.selected.length <= 5
              ? selection.selected.map((tooth) => (
                  <Badge key={tooth} variant="outline">
                    {tooth}
                  </Badge>
                ))
              : null}
            {selection.selected.length > 5 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant="ghost">
                    View teeth
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64">
                  <p className="mb-2 text-sm font-medium">Selected teeth</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selection.selected.map((tooth) => (
                      <Badge key={tooth} variant="outline">
                        {tooth}
                      </Badge>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="ghost" onClick={selection.selectAllUpper}>
              Upper
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={selection.selectAllLower}>
              Lower
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
            <Button
              type="button"
              size="sm"
              disabled={
                !!readOnly ||
                !selection.selected.length ||
                (mode === "current" ? !selectedCondition : !selectedTreatment)
              }
              onClick={() => {
                if (mode === "current" && selectedCondition) {
                  applyConditionToSelection(selectedCondition);
                  setSelectedCondition(undefined);
                } else if (mode === "proposed" && selectedTreatment) {
                  applyTreatmentToSelection(selectedTreatment);
                  setSelectedTreatmentId(undefined);
                }
              }}
            >
              {mode === "current"
                ? `Apply ${selectedConditionLabel ?? "condition"}`
                : `Apply ${selectedTreatment?.displayName ?? "treatment"}`}
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="border-t pt-4">
            {message && (
              <div
                role="alert"
                className="mb-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {message}
              </div>
            )}
            {mode === "current" ? (
              <ConditionSelector selectedType={selectedCondition} onSelect={setSelectedCondition} />
            ) : (
              <TreatmentSelector
                definitions={definitions}
                selectedId={selectedTreatmentId}
                onSelect={setSelectedTreatmentId}
              />
            )}
          </div>
          {bridgeTeeth && (
            <div>
              <BridgeConfigurator
                teeth={bridgeTeeth}
                onCancel={() => {
                  setBridgeTeeth(null);
                  setBridgeDefinition(null);
                }}
                onConfirm={confirmBridge}
              />
            </div>
          )}
        </div>
      </div>
      {mode === "current" ? (
        <ConditionSummary
          conditions={history.state.currentConditions}
          onRemove={(tooth, condition) =>
            !readOnly && removeConditionFromTooth(tooth, condition as ConditionType)
          }
        />
      ) : (
        <>
          <TreatmentSummary
            treatments={history.state.proposedTreatments}
            readOnly={readOnly}
            onDelete={(ids) => !readOnly && deleteTreatments(ids)}
            onEdit={(ids, notes) => !readOnly && editTreatments(ids, notes)}
            onHighlight={highlightTeeth}
          />
          <UnitPricing
            plan={history.state}
            readOnly={readOnly || pricingReadOnly}
            onPriceChange={(treatmentId, unitPrice) =>
              history.set(
                (current) => ({
                  ...current,
                  commercial: {
                    ...current.commercial,
                    items: current.commercial.items.map((item) =>
                      item.treatmentId === treatmentId
                        ? { ...item, unitPrice, priceOverridden: true }
                        : item,
                    ),
                  },
                  updatedAt: new Date().toISOString(),
                }),
                { commit: false },
              )
            }
          />
        </>
      )}
      <Collapsible className="border-t px-1 pt-1">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="w-full justify-between px-0">
            <span className="flex items-center gap-2">
              <LockKeyhole className="size-4" /> Clinic-only clinical notes
            </span>
            <ChevronDown className="size-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pb-4">
          <MedicalSafetyPanel plan={history.state} />
          <Textarea
            aria-label="Clinic-only clinical notes"
            value={history.state.travel.internalNotes ?? ""}
            onChange={(event) =>
              history.set(
                (current) => ({
                  ...current,
                  travel: { ...current.travel, internalNotes: event.target.value },
                  updatedAt: new Date().toISOString(),
                }),
                { commit: false },
              )
            }
            rows={3}
            placeholder="Clinical rationale, internal cautions or coordinator instructions"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Internal clinic information. Never shown in the patient view.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

function UnitPricing({
  plan,
  readOnly,
  onPriceChange,
}: {
  plan: DentalPlan;
  readOnly?: boolean;
  onPriceChange: (treatmentId: string, unitPrice: number) => void;
}) {
  if (!plan.commercial.items.length)
    return (
      <section className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Treatment unit pricing will appear after a proposed treatment is applied.
      </section>
    );
  const categories = [...new Set(plan.commercial.items.map((item) => item.category ?? "Other"))];
  return (
    <section className="overflow-hidden border-t pt-4" aria-labelledby="unit-pricing-heading">
      <div className="px-1 pb-3">
        <h3 id="unit-pricing-heading" className="font-semibold">
          Unit pricing
        </h3>
        <p className="text-xs text-muted-foreground">
          Plan-specific prices. Clinic defaults remain unchanged.
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Treatment</TableHead>
              <TableHead className="w-24">Units</TableHead>
              <TableHead className="w-40">Unit price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.flatMap((category) => [
              <TableRow key={`category-${category}`} className="bg-muted/40 hover:bg-muted/40">
                <TableCell
                  colSpan={4}
                  className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {category}
                </TableCell>
              </TableRow>,
              ...plan.commercial.items
                .filter((item) => (item.category ?? "Other") === category)
                .map((item) => (
                  <TableRow key={item.treatmentId}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>
                      <Input
                        aria-label={`${item.label} unit price`}
                        type="number"
                        min={0}
                        disabled={readOnly}
                        value={item.unitPrice}
                        onChange={(event) =>
                          onPriceChange(item.treatmentId, Math.max(0, Number(event.target.value)))
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQuoteMoney(item.qty * item.unitPrice, plan.commercial.currency)}
                    </TableCell>
                  </TableRow>
                )),
            ])}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
function MedicalSafetyPanel({ plan }: { plan: DentalPlan }) {
  const medical = plan.importedAssessment;
  const hasDetails =
    medical.medicalConditions.length ||
    medical.medications ||
    medical.allergies ||
    medical.smoking ||
    medical.pregnancy ||
    medical.panoramicAvailable ||
    medical.dentalPhotosAvailable;
  if (!hasDetails) return null;
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
      <div className="mt-3 flex flex-wrap gap-2">
        {medical.medicalConditions.map((item) => (
          <Badge key={item} variant="secondary">
            {item}
          </Badge>
        ))}
        {medical.medications && <Badge variant="outline">Medications: {medical.medications}</Badge>}
        {medical.allergies && <Badge variant="outline">Allergies: {medical.allergies}</Badge>}
        {medical.smoking && <Badge variant="destructive">Smoking reported</Badge>}
        {medical.pregnancy && <Badge variant="outline">Pregnancy reported</Badge>}
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
