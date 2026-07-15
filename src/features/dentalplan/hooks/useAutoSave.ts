import { useCallback, useEffect, useRef, useState } from "react";
import type { DentalPlan } from "../types/dental-plan.types";
import type { DentalPlanRepository } from "../adapters/DentalPlanRepository";
import { toast } from "sonner";

export type AutoSaveStatus = "saved" | "unsaved" | "saving";

export function useAutoSave(plan: DentalPlan, repository: DentalPlanRepository, delay = 500) {
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(plan.updatedAt ?? null);
  const [status, setStatus] = useState<AutoSaveStatus>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observedPlan = useRef(plan);
  const observedPlanId = useRef(plan.id);

  const clearTimers = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (savingTimer.current) clearTimeout(savingTimer.current);
    timer.current = null;
    savingTimer.current = null;
  }, []);

  const persist = useCallback(
    (value: DentalPlan) => {
      const saved = { ...value, updatedAt: new Date().toISOString() };
      try {
        repository.savePlan(saved);
        setLastSavedAt(saved.updatedAt);
        setStatus("saved");
      } catch (error) {
        setStatus("unsaved");
        toast.error(error instanceof Error ? error.message : "The plan could not be saved.");
      }
      return saved;
    },
    [repository],
  );

  useEffect(() => {
    if (observedPlanId.current !== plan.id) {
      clearTimers();
      observedPlanId.current = plan.id;
      observedPlan.current = plan;
      setLastSavedAt(plan.updatedAt ?? null);
      setStatus("saved");
      return;
    }
    if (observedPlan.current === plan) return;
    observedPlan.current = plan;
    clearTimers();
    setStatus("unsaved");
    timer.current = setTimeout(() => {
      setStatus("saving");
      savingTimer.current = setTimeout(() => persist(plan), 100);
    }, delay);
  }, [clearTimers, delay, persist, plan]);

  useEffect(() => clearTimers, [clearTimers]);

  const saveNow = useCallback(() => {
    clearTimers();
    setStatus("saving");
    return persist(plan);
  }, [clearTimers, persist, plan]);

  return { lastSavedAt, status, saving: status === "saving", saveNow };
}
