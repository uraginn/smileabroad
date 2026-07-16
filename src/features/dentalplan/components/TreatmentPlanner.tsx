import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, LockKeyhole, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ConditionType,
  DentalPlan,
  PlannerMode,
  ToothCondition,
  ToothNumber,
  ToothTreatment,
  EffectiveTreatmentDefinition,
} from "../types/dental-plan.types";
import { useHistoryState } from "../hooks/useHistoryState";
import { useToothSelection } from "../hooks/useToothSelection";
import { applyCondition, removeCondition } from "../rules/conditionRules";
import {
  ALL_ON_4_PRESETS,
  ALL_ON_6_PRESETS,
  archForSelection,
  defaultTreatmentSequence,
  resolveTreatmentSupport,
  evaluateTreatmentApplication,
} from "../rules/clinicalRules";
import { treatmentLayer, treatmentMaterial, treatmentScope } from "../data/treatmentDefinitions";
import { CONDITION_DEFINITIONS } from "../data/conditionDefinitions";
import { DentalChart } from "./DentalChart";
import { ConditionSelector } from "./ConditionSelector";
import { TreatmentSelector } from "./TreatmentSelector";
import { TreatmentSummary } from "./TreatmentSummary";
import { ConditionSummary } from "./ConditionSummary";
import { derivePlanDefaults } from "../utils/derivePlanDefaults";
import { formatQuoteMoney } from "@/lib/quote";
import { automaticBridgeRoles, resolveBridgeSelection } from "../rules/bridgeRules";
import { orderedByArch } from "../utils/toothNumbers";
import { syncPricingItems } from "../utils/commercial";

export type TreatmentPlannerProps = {
  value: DentalPlan;
  onChange: (plan: DentalPlan) => void;
  readOnly?: boolean;
  pricingReadOnly?: boolean;
  definitions: EffectiveTreatmentDefinition[];
  clinicUsers?: Array<{ id: string; name: string; role: string }>;
};
export function TreatmentPlanner({
  value,
  onChange,
  readOnly,
  pricingReadOnly,
  definitions,
  clinicUsers = [],
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
  const [advisory, setAdvisory] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{
    treatmentIds: string[];
    dependentIds: string[];
    implantTeeth: ToothNumber[];
  }>();
  const [pendingArchPlan, setPendingArchPlan] = useState<{
    definition: EffectiveTreatmentDefinition;
    tooth: ToothNumber;
  }>();
  const currentSelection = useToothSelection();
  const proposedSelection = useToothSelection();
  const clearCurrentSelection = currentSelection.clear;
  const clearProposedSelection = proposedSelection.clear;
  const selection = mode === "current" ? currentSelection : proposedSelection;
  useEffect(() => {
    const clearSelectionShortcut = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select, [contenteditable='true']") ||
        document.querySelector("[role='dialog']")
      )
        return;
      if (mode === "current") clearCurrentSelection();
      else clearProposedSelection();
      setMessage(null);
    };
    window.addEventListener("keydown", clearSelectionShortcut);
    return () => window.removeEventListener("keydown", clearSelectionShortcut);
  }, [clearCurrentSelection, clearProposedSelection, mode]);
  const selectedTreatment = definitions.find((item) => item.id === selectedTreatmentId);
  const implantDefinitions = definitions.filter(
    (item) => item.baseTreatmentKey === "dental-implant",
  );
  const activeImplantDefinitionId =
    history.state.proposedTreatments.find(
      (item) => item.treatmentType === "dental-implant" && item.treatmentDefinitionId,
    )?.treatmentDefinitionId ?? implantDefinitions[0]?.id;
  const selectedConditionLabel = CONDITION_DEFINITIONS.find(
    (item) => item.type === selectedCondition,
  )?.label;
  const [editingBridgeId, setEditingBridgeId] = useState<string>();
  useEffect(() => {
    history.set(
      (current) => {
        const items = syncPricingItems(current, definitions);
        if (JSON.stringify(items) === JSON.stringify(current.commercial.items)) return current;
        return { ...current, commercial: { ...current.commercial, items } };
      },
      { commit: false },
    );
    // Pricing is derived from the planner-owned treatment state and definition defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.state.proposedTreatments, history.state.commercial.currency, definitions]);
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
    (condition: ConditionType, teeth = selection.selected) => {
      if (!teeth.length) {
        setMessage("Select at least one tooth first.");
        return;
      }
      history.commit((previous) => {
        const next = { ...previous, currentConditions: { ...previous.currentConditions } };
        for (const tooth of teeth) {
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
      setAdvisory(null);
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
    (
      selectedDefinition: EffectiveTreatmentDefinition,
      warningConfirmed = false,
      teeth = selection.selected,
    ) => {
      const treatment = selectedDefinition.baseTreatmentKey;
      if (!teeth.length) {
        setMessage("Select at least one tooth first.");
        return;
      }
      const evaluation = evaluateTreatmentApplication({
        plan: history.state,
        treatment,
        selectedTeeth: teeth,
      });
      const ruleResults = evaluation.results;
      if (evaluation.status === "blocked") {
        setMessage(evaluation.reason ?? "This treatment cannot be applied to the selection.");
        return;
      }
      const warnings = ruleResults.filter(
        (result) => result.severity === "warning" && result.outcome !== "suggestion",
      );
      const suggestions = ruleResults.filter((result) => result.outcome === "suggestion");
      if (warnings.length && !warningConfirmed)
        setAdvisory(warnings.map((result) => result.message).join(" "));
      if (treatment === "all-on-4" || treatment === "all-on-6") {
        const arch = archForSelection(teeth);
        if (
          history.state.treatmentGroups.some(
            (group) => group.type === treatment && group.arch === arch,
          )
        ) {
          setMessage(
            `An ${treatment === "all-on-4" ? "All-on-4" : "All-on-6"} treatment already exists for the ${arch} arch.`,
          );
          return;
        }
        const preset = treatment === "all-on-4" ? ALL_ON_4_PRESETS[arch] : ALL_ON_6_PRESETS[arch];
        const groupId = crypto.randomUUID();
        history.commit((previous) => {
          const conflictingIds = new Set(
            previous.proposedTreatments
              .filter(
                (item) =>
                  item.toothNumbers.some((tooth) => preset.prostheticRange.includes(tooth)) &&
                  ["restoration", "prosthetic"].includes(item.layer ?? ""),
              )
              .map((item) => item.id),
          );
          const conflictingGroupIds = new Set(
            previous.proposedTreatments
              .filter((item) => conflictingIds.has(item.id) && item.treatmentGroupId)
              .map((item) => item.treatmentGroupId as string),
          );
          const implantDefinition = definitions.find(
            (item) => item.id === activeImplantDefinitionId,
          );
          const bridgeDefinition = definitions.find((item) => item.clinicalBehavior === "bridge");
          const implants = preset.implantPositions.map((tooth) => ({
            id: crypto.randomUUID(),
            toothNumbers: [tooth],
            treatmentType: "dental-implant" as const,
            treatmentDefinitionId: implantDefinition?.id,
            treatmentKey: implantDefinition?.treatmentKey,
            visualKey: "dental-implant" as const,
            displayName: implantDefinition?.displayName ?? "Dental Implant",
            implantBrand: implantDefinition?.implantBrand,
            treatmentGroupId: groupId,
            layer: "foundation" as const,
            scope: "tooth" as const,
          }));
          const bridge = {
            id: crypto.randomUUID(),
            toothNumbers: [...preset.prostheticRange],
            treatmentType: "bridge" as const,
            treatmentDefinitionId: bridgeDefinition?.id,
            treatmentKey: bridgeDefinition?.treatmentKey,
            visualKey: "bridge" as const,
            displayName: bridgeDefinition?.displayName ?? "Zirconium Bridge",
            treatmentGroupId: groupId,
            layer: "prosthetic" as const,
            scope: "span" as const,
            bridgeRoles: automaticBridgeRoles(preset.prostheticRange, preset.implantPositions),
            bridgeType: "implant-supported" as const,
            material: bridgeDefinition?.defaultMaterial ?? ("zirconium" as const),
            supportType: "implant" as const,
            ...defaultTreatmentSequence("bridge"),
          };
          const generated = [...implants, bridge];
          return {
            ...previous,
            proposedTreatments: [
              ...previous.proposedTreatments.filter((item) => !conflictingIds.has(item.id)),
              ...generated,
            ],
            treatmentGroups: [
              ...previous.treatmentGroups.filter((group) => !conflictingGroupIds.has(group.id)),
              {
                id: groupId,
                type: treatment,
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
        const arches = new Set(teeth.map((tooth) => archForSelection([tooth])));
        const archTeeth = [
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
              item.toothNumbers.some((tooth) => archTeeth.includes(tooth)),
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
            {
              id,
              toothNumbers: archTeeth,
              treatmentType: "whitening",
              treatmentGroupId: groupId,
              layer: "restoration",
              scope: "arch",
            },
          ],
          treatmentGroups: [
            ...previous.treatmentGroups,
            {
              id: groupId,
              type: "full-arch",
              arch: arches.has("lower") && !arches.has("upper") ? "lower" : "upper",
              affectedTeeth: archTeeth,
              generatedTreatmentIds: [id],
            },
          ],
          updatedAt: new Date().toISOString(),
        }));
        setMessage("Whitening added at arch level; restorations were excluded.");
        return;
      }
      if (selectedDefinition.clinicalBehavior === "bridge") {
        const resolved = resolveBridgeSelection(teeth);
        if (!resolved.ok) {
          setMessage(resolved.message);
          return;
        }
        const existingTreatment = editingBridgeId
          ? history.state.proposedTreatments.find((item) => item.id === editingBridgeId)
          : undefined;
        const hasBridgeOnExactSpan = history.state.proposedTreatments.some(
          (item) =>
            item.id !== editingBridgeId &&
            item.treatmentType === "bridge" &&
            orderedByArch(item.toothNumbers).join(",") === resolved.span.join(","),
        );
        if (hasBridgeOnExactSpan) {
          setMessage("A Bridge already exists on this exact span. Edit or remove it first.");
          return;
        }
        const spanEvaluation = evaluateTreatmentApplication({
          plan: editingBridgeId
            ? {
                ...history.state,
                proposedTreatments: history.state.proposedTreatments.filter(
                  (item) => item.id !== editingBridgeId,
                ),
              }
            : history.state,
          treatment: "bridge",
          selectedTeeth: resolved.span,
        });
        if (spanEvaluation.status === "blocked") {
          setMessage(
            spanEvaluation.reason ?? "This span already contains a conflicting final restoration.",
          );
          return;
        }
        const implantPositions = resolved.span.filter(
          (tooth) =>
            (history.state.currentConditions[tooth]?.conditions ?? []).includes(
              "existing-implant",
            ) ||
            history.state.proposedTreatments.some(
              (item) =>
                item.treatmentType === "dental-implant" && item.toothNumbers.includes(tooth),
            ),
        );
        const roles = automaticBridgeRoles(resolved.span, implantPositions);
        const groupId = existingTreatment?.treatmentGroupId ?? crypto.randomUUID();
        const treatmentId = existingTreatment?.id ?? crypto.randomUUID();
        const bridgeType = implantPositions.length >= 2 ? "implant-supported" : "conventional";
        const supportType =
          implantPositions.length === 0
            ? "natural"
            : implantPositions.length === resolved.span.length
              ? "implant"
              : "mixed";
        history.commit((previous) => ({
          ...previous,
          proposedTreatments: [
            ...previous.proposedTreatments.filter((item) => item.id !== treatmentId),
            {
              ...existingTreatment,
              id: treatmentId,
              treatmentType: "bridge",
              treatmentDefinitionId: selectedDefinition.id,
              treatmentKey: selectedDefinition.treatmentKey,
              visualKey: selectedDefinition.visualKey,
              displayName: selectedDefinition.displayName,
              toothNumbers: [...resolved.span],
              treatmentGroupId: groupId,
              layer: "prosthetic",
              scope: "span",
              bridgeRoles: roles,
              bridgeType,
              material:
                selectedDefinition.defaultMaterial ?? existingTreatment?.material ?? "zirconium",
              supportType: supportType === "mixed" ? undefined : supportType,
              ...defaultTreatmentSequence("bridge"),
            },
          ],
          treatmentGroups: [
            ...previous.treatmentGroups.filter((group) => group.id !== groupId),
            {
              id: groupId,
              type: "bridge",
              arch: archForSelection(resolved.span),
              affectedTeeth: [...resolved.span],
              generatedTreatmentIds: [treatmentId],
              abutments: resolved.span.filter((tooth) => roles[tooth] !== "pontic"),
              pontics: resolved.span.filter((tooth) => roles[tooth] === "pontic"),
              implantPositions,
              supportType,
              bridgeType,
              material:
                selectedDefinition.defaultMaterial ?? existingTreatment?.material ?? "zirconium",
            },
          ],
          updatedAt: new Date().toISOString(),
        }));
        setEditingBridgeId(undefined);
        setMessage(null);
        setAdvisory(null);
        return;
      }
      const targetTeeth = teeth.filter(
        (tooth) =>
          !history.state.proposedTreatments.some(
            (item) =>
              (item.treatmentDefinitionId
                ? item.treatmentDefinitionId === selectedDefinition.id
                : item.treatmentType === treatment) && item.toothNumbers.includes(tooth),
          ),
      );
      if (!targetTeeth.length) {
        setMessage(`${selectedDefinition.displayName} is already included for a selected tooth.`);
        return;
      }
      history.commit((previous) => {
        const next = { ...previous, proposedTreatments: [...previous.proposedTreatments] };
        const sequence = defaultTreatmentSequence(treatment);
        if (selectedDefinition.perTooth)
          for (const tooth of targetTeeth)
            next.proposedTreatments.push({
              id: crypto.randomUUID(),
              treatmentType: treatment,
              treatmentDefinitionId: selectedDefinition.id,
              treatmentKey: selectedDefinition.treatmentKey,
              visualKey: selectedDefinition.visualKey,
              displayName: selectedDefinition.displayName,
              implantBrand: selectedDefinition.implantBrand,
              toothNumbers: [tooth],
              layer: treatmentLayer(treatment),
              scope: treatmentScope(treatment),
              supportType: resolveTreatmentSupport(previous, treatment, tooth),
              material: selectedDefinition.defaultMaterial ?? treatmentMaterial(treatment),
              clinicianOverrideReason: undefined,
              ...sequence,
            });
        else
          next.proposedTreatments.push({
            id: crypto.randomUUID(),
            treatmentType: treatment,
            treatmentDefinitionId: selectedDefinition.id,
            treatmentKey: selectedDefinition.treatmentKey,
            visualKey: selectedDefinition.visualKey,
            displayName: selectedDefinition.displayName,
            implantBrand: selectedDefinition.implantBrand,
            toothNumbers: [...targetTeeth],
            layer: treatmentLayer(treatment),
            scope: treatmentScope(treatment),
            supportType: undefined,
            material: selectedDefinition.defaultMaterial ?? treatmentMaterial(treatment),
            clinicianOverrideReason: undefined,
            ...sequence,
          });
        next.updatedAt = new Date().toISOString();
        return next;
      });
      setMessage(null);
      setAdvisory(suggestions.map((result) => result.message).join(" ") || null);
    },
    [activeImplantDefinitionId, definitions, editingBridgeId, history, selection.selected],
  );
  const editBridge = useCallback(
    (id: string) => {
      const bridge = history.state.proposedTreatments.find(
        (item) => item.id === id && item.treatmentType === "bridge",
      );
      if (!bridge) return;
      proposedSelection.setSelected([...bridge.toothNumbers]);
      const definition = definitions.find(
        (item) =>
          item.id === bridge.treatmentDefinitionId || item.treatmentKey === bridge.treatmentKey,
      );
      setSelectedTreatmentId(definition?.id);
      setEditingBridgeId(bridge.id);
      setMode("proposed");
      setMessage(null);
    },
    [definitions, history.state.proposedTreatments, proposedSelection],
  );
  const deleteTreatments = useCallback(
    (ids: string[]) =>
      history.commit((previous) => {
        const idSet = new Set(ids);
        const touchedGroupIds = new Set(
          previous.proposedTreatments
            .filter((item) => idSet.has(item.id) && item.treatmentGroupId)
            .map((item) => item.treatmentGroupId as string),
        );
        const cascadeGroupIds = new Set(
          previous.treatmentGroups
            .filter(
              (group) =>
                touchedGroupIds.has(group.id) &&
                ["bridge", "all-on-4", "all-on-6", "full-arch"].includes(group.type),
            )
            .map((group) => group.id),
        );
        let proposedTreatments = previous.proposedTreatments.filter(
          (item) =>
            !idSet.has(item.id) &&
            !(item.treatmentGroupId && cascadeGroupIds.has(item.treatmentGroupId)),
        );
        const treatmentGroups = previous.treatmentGroups
          .filter((group) => !cascadeGroupIds.has(group.id))
          .map((group) => ({
            ...group,
            generatedTreatmentIds: group.generatedTreatmentIds.filter((id) => !idSet.has(id)),
          }))
          .filter(
            (group) =>
              group.generatedTreatmentIds.length > 1 || group.type !== "implant-restoration",
          );
        const retainedGroupIds = new Set(treatmentGroups.map((group) => group.id));
        proposedTreatments = proposedTreatments.map((item) =>
          item.treatmentGroupId && !retainedGroupIds.has(item.treatmentGroupId)
            ? { ...item, treatmentGroupId: undefined }
            : item,
        );
        return {
          ...previous,
          proposedTreatments,
          treatmentGroups,
          updatedAt: new Date().toISOString(),
        };
      }),
    [history],
  );
  const requestDeleteTreatments = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      const implantTeeth = [
        ...new Set(
          history.state.proposedTreatments
            .filter((item) => idSet.has(item.id) && item.treatmentType === "dental-implant")
            .flatMap((item) => item.toothNumbers),
        ),
      ];
      if (!implantTeeth.length) {
        deleteTreatments(ids);
        return;
      }
      const dependentIds = history.state.proposedTreatments
        .filter((item) => {
          if (idSet.has(item.id)) return false;
          if (item.treatmentType === "bridge")
            return implantTeeth.some((tooth) => item.bridgeRoles?.[tooth] === "implant-abutment");
          if (
            !["implant-abutment", "implant-crown"].includes(item.treatmentType) &&
            item.supportType !== "implant"
          )
            return false;
          return item.toothNumbers.some((tooth) => implantTeeth.includes(tooth));
        })
        .map((item) => item.id);
      if (!dependentIds.length) {
        deleteTreatments(ids);
        return;
      }
      setPendingRemoval({ treatmentIds: ids, dependentIds, implantTeeth });
    },
    [deleteTreatments, history.state.proposedTreatments],
  );
  const editTreatments = useCallback(
    (ids: string[], patch: Pick<ToothTreatment, "notes" | "stage" | "material">) =>
      history.commit((previous) => {
        const idSet = new Set(ids);
        return {
          ...previous,
          proposedTreatments: previous.proposedTreatments.map((item) =>
            idSet.has(item.id) ? { ...item, ...patch } : item,
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
      treatmentGroups: [],
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
  const highlightCurrentTeeth = useCallback(
    (teeth: ToothNumber[]) => {
      currentSelection.setSelected(teeth);
      setMode("current");
    },
    [currentSelection],
  );
  const bridgeSelection =
    mode === "proposed" && selectedTreatment?.clinicalBehavior === "bridge"
      ? resolveBridgeSelection(selection.selected)
      : undefined;
  const bridgeSelectionMessage =
    bridgeSelection && !bridgeSelection.ok ? bridgeSelection.message : undefined;
  const bridgeSelectionSummary =
    bridgeSelection?.ok && selectedTreatment
      ? `${selectedTreatment.displayName} · ${formatToothSpan(bridgeSelection.span)} · ${bridgeSelection.span.length} units`
      : undefined;
  return (
    <section className="space-y-4 rounded-xl border bg-card p-3 sm:p-5">
      <AlertDialog
        open={!!pendingArchPlan}
        onOpenChange={(open) => !open && setPendingArchPlan(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingArchPlan
                ? `${archForSelection([pendingArchPlan.tooth]) === "upper" ? "Upper" : "Lower"} ${pendingArchPlan.definition.displayName}`
                : "Full-arch treatment"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This creates the canonical implant positions and one implant-supported full-arch
              bridge using the selected implant brand and default bridge material. Existing final
              restorations on this arch will be replaced; support procedures are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingArchPlan)
                  applyTreatmentToSelection(pendingArchPlan.definition, false, [
                    pendingArchPlan.tooth,
                  ]);
                setPendingArchPlan(undefined);
              }}
            >
              Apply full-arch plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={!!pendingRemoval}
        onOpenChange={(open) => !open && setPendingRemoval(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove supporting implant?</AlertDialogTitle>
            <AlertDialogDescription>
              The implant at {pendingRemoval?.implantTeeth.join(", ")} supports another proposed
              restoration. Choose whether to keep that restoration for replanning or remove the
              related layers too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-wrap">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (pendingRemoval) deleteTreatments(pendingRemoval.treatmentIds);
                setPendingRemoval(undefined);
              }}
            >
              Remove implant only
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemoval)
                  deleteTreatments([
                    ...pendingRemoval.treatmentIds,
                    ...pendingRemoval.dependentIds,
                  ]);
                setPendingRemoval(undefined);
              }}
            >
              Remove implant and related layers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <h2 className="font-semibold">Clinical Planning</h2>
        <div className="flex flex-wrap gap-2">
          {implantDefinitions.length > 0 && (
            <Select
              value={activeImplantDefinitionId}
              disabled={readOnly}
              onValueChange={(id) => {
                const definition = implantDefinitions.find((item) => item.id === id);
                if (!definition) return;
                history.commit((plan) => ({
                  ...plan,
                  proposedTreatments: plan.proposedTreatments.map((item) =>
                    item.treatmentType === "dental-implant"
                      ? {
                          ...item,
                          treatmentDefinitionId: definition.id,
                          treatmentKey: definition.treatmentKey,
                          displayName: definition.displayName,
                          implantBrand: definition.implantBrand,
                        }
                      : item,
                  ),
                  updatedAt: new Date().toISOString(),
                }));
                setSelectedTreatmentId(id);
              }}
            >
              <SelectTrigger className="h-9 w-56" aria-label="Implant brand">
                <SelectValue placeholder="Implant brand" />
              </SelectTrigger>
              <SelectContent>
                {implantDefinitions.map((definition) => (
                  <SelectItem key={definition.id} value={definition.id}>
                    {definition.implantBrand ?? definition.displayName} ·{" "}
                    {formatQuoteMoney(
                      definition.prices[history.state.commercial.currency] ?? 0,
                      history.state.commercial.currency,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <AssignmentSelect
            label="Dentist"
            value={history.state.patient.dentistId}
            users={clinicUsers.filter((user) => user.role === "dentist")}
            disabled={readOnly}
            onChange={(dentistId) =>
              history.commit((plan) => ({
                ...plan,
                patient: { ...plan.patient, dentistId },
                updatedAt: new Date().toISOString(),
              }))
            }
          />
          <AssignmentSelect
            label="Coordinator"
            value={history.state.patient.coordinatorId}
            users={clinicUsers.filter((user) =>
              ["coordinator", "clinic_owner", "clinic_admin"].includes(user.role),
            )}
            disabled={readOnly}
            onChange={(coordinatorId) =>
              history.commit((plan) => ({
                ...plan,
                patient: { ...plan.patient, coordinatorId },
                updatedAt: new Date().toISOString(),
              }))
            }
          />
        </div>
      </div>
      {(selectedCondition || selectedTreatment) && (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Badge variant="secondary">Active tool</Badge>
            <span className="truncate font-medium">
              {mode === "current" ? selectedConditionLabel : selectedTreatment?.displayName}
            </span>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 shrink-0"
            aria-label="Clear active tool"
            onClick={() => {
              setSelectedCondition(undefined);
              setSelectedTreatmentId(undefined);
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
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
              aria-keyshortcuts="Escape"
              title="Clear selection (Esc)"
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                !!readOnly ||
                !selection.selected.length ||
                (mode === "current" ? !selectedCondition : !selectedTreatment) ||
                !!bridgeSelectionMessage
              }
              title={bridgeSelectionMessage}
              onClick={() => {
                if (mode === "current" && selectedCondition) {
                  applyConditionToSelection(selectedCondition);
                  setSelectedCondition(undefined);
                  return;
                }
                if (!selectedTreatment) return;
                if (["all-on-4", "all-on-6"].includes(selectedTreatment.baseTreatmentKey)) {
                  setPendingArchPlan({
                    definition: selectedTreatment,
                    tooth: selection.selected[0],
                  });
                } else {
                  applyTreatmentToSelection(selectedTreatment);
                }
                setSelectedTreatmentId(undefined);
              }}
            >
              {mode === "current"
                ? `Apply ${selectedConditionLabel ?? "condition"}`
                : selectedTreatment?.clinicalBehavior === "bridge"
                  ? "Confirm bridge span"
                  : `Apply ${selectedTreatment?.displayName ?? "treatment"}`}
            </Button>
          </div>
        </div>
        {(bridgeSelectionSummary || bridgeSelectionMessage) && (
          <div
            role={bridgeSelectionMessage ? "alert" : "status"}
            className={`rounded-md border px-3 py-2 text-sm ${
              bridgeSelectionMessage
                ? "border-warning/50 bg-warning/10 text-foreground"
                : "border-accent-blue/50 bg-accent-blue/15 text-foreground"
            }`}
          >
            {bridgeSelectionMessage ?? bridgeSelectionSummary}
            {editingBridgeId && bridgeSelection?.ok ? " · Editing selected span" : null}
          </div>
        )}
        <div className="space-y-3">
          <div className="border-t pt-4">
            {advisory && (
              <div className="mb-3 rounded border border-accent-blue/60 bg-accent-blue/20 px-3 py-2 text-sm text-foreground">
                <span className="font-medium">Clinical suggestion: </span>
                {advisory}
              </div>
            )}
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
        </div>
      </div>
      {mode === "current" ? (
        <ConditionSummary
          conditions={history.state.currentConditions}
          onRemove={(tooth, condition) => !readOnly && removeConditionFromTooth(tooth, condition)}
          onHighlight={highlightCurrentTeeth}
        />
      ) : (
        <>
          <TreatmentSummary
            treatments={history.state.proposedTreatments}
            readOnly={readOnly}
            onDelete={(ids) => !readOnly && requestDeleteTreatments(ids)}
            onEdit={(ids, patch) => !readOnly && editTreatments(ids, patch)}
            onEditSpan={(id) => !readOnly && editBridge(id)}
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

function AssignmentSelect({
  label,
  value,
  users,
  disabled,
  onChange,
}: {
  label: string;
  value?: string;
  users: Array<{ id: string; name: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 w-44" aria-label={`Assigned ${label.toLowerCase()}`}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function formatToothSpan(teeth: ToothNumber[]) {
  const ordered = orderedByArch(teeth);
  const first = ordered[0];
  const last = ordered.at(-1);
  if (!first || !last) return "";
  return Math.floor(first / 10) === Math.floor(last / 10)
    ? `${Math.min(first, last)}–${Math.max(first, last)}`
    : `${first}–${last}`;
}
