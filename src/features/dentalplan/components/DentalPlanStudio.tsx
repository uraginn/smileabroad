import { useEffect, useMemo, useRef, useState } from "react";
import { TreatmentPlanner } from "./TreatmentPlanner";
import type { DentalPlan, DentalPlanStudioProps } from "../types/dental-plan.types";
import { createDentalPlan } from "../utils/createDentalPlan";
import { LocalStorageDentalPlanRepository } from "../adapters/LocalStorageDentalPlanRepository";
import { useAutoSave } from "../hooks/useAutoSave";

export function DentalPlanStudio(props: DentalPlanStudioProps) {
  const repository = useMemo(() => new LocalStorageDentalPlanRepository(), []);
  const [plan, setPlan] = useState<DentalPlan | null>(null);
  const initialRef = useRef(props.initialValue);
  useEffect(
    () =>
      setPlan(
        initialRef.current ?? repository.getPlan() ?? createDentalPlan({ name: "Demo Plan" }),
      ),
    [repository],
  );
  if (!plan)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading planner…
      </div>
    );
  return <PlannerShell plan={plan} setPlan={setPlan} repository={repository} {...props} />;
}
function PlannerShell({
  plan,
  setPlan,
  repository,
  onChange,
  onSave,
  readOnly,
}: {
  plan: DentalPlan;
  setPlan: (plan: DentalPlan) => void;
  repository: LocalStorageDentalPlanRepository;
  onChange?: DentalPlanStudioProps["onChange"];
  onSave?: DentalPlanStudioProps["onSave"];
  readOnly?: boolean;
}) {
  const { lastSavedAt, saving } = useAutoSave(plan, repository);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => onChangeRef.current?.(plan), [plan]);
  const save = () => {
    repository.savePlan(plan);
    onSave?.(plan);
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">Dental Treatment Planner</h1>
            <p className="text-xs text-muted-foreground">
              Source-migrated standalone planner engine
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {saving
                ? "Saving…"
                : lastSavedAt
                  ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                  : "Not saved yet"}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={readOnly}
              className="rounded border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-40"
            >
              Save Draft
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <TreatmentPlanner value={plan} onChange={setPlan} readOnly={readOnly} />
      </main>
    </div>
  );
}
