import { useCallback, useEffect, useRef, useState } from "react";
import { dentalPlanStorage } from "../adapters/local-storage";
import { createDentalPlan } from "../core";
import type { DentalPlanData, DentalPlanInput } from "../types";

export function useDentalPlan(
  initialValue?: DentalPlanInput,
  onChange?: (plan: DentalPlanData) => void,
) {
  const [plan, setPlan] = useState<DentalPlanData>(() => createDentalPlan(initialValue));
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string>();
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(initialValue);
  onChangeRef.current = onChange;

  useEffect(() => {
    setPlan(dentalPlanStorage.load() ?? createDentalPlan(initialValueRef.current));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) onChangeRef.current?.(plan);
  }, [hydrated, plan]);

  const update = useCallback((recipe: (current: DentalPlanData) => DentalPlanData) => {
    setPlan((current) => ({ ...recipe(current), updatedAt: new Date().toISOString() }));
  }, []);

  const save = useCallback(() => {
    dentalPlanStorage.save(plan);
    setSavedAt(new Date().toISOString());
    return plan;
  }, [plan]);

  return { plan, update, save, hydrated, savedAt };
}
