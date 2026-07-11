import { useEffect, useRef, useState } from "react";
import type { DentalPlan } from "../types/dental-plan.types";
import type { DentalPlanRepository } from "../adapters/DentalPlanRepository";
export function useAutoSave(plan: DentalPlan, repository: DentalPlanRepository, delay = 500) {
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setSaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const saved = { ...plan, updatedAt: new Date().toISOString() };
      repository.savePlan(saved);
      setLastSavedAt(saved.updatedAt);
      setSaving(false);
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [plan, repository, delay]);
  return { lastSavedAt, saving };
}
