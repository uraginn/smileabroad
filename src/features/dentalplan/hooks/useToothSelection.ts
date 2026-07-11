import { useCallback, useState } from "react";
import type { ToothNumber } from "../types/dental-plan.types";
import { LOWER_TEETH, UPPER_TEETH } from "../utils/toothNumbers";
export function useToothSelection() {
  const [selected, setSelected] = useState<ToothNumber[]>([]);
  const toggle = useCallback(
    (tooth: ToothNumber, additive: boolean) =>
      setSelected((previous) =>
        !additive
          ? previous.length === 1 && previous[0] === tooth
            ? []
            : [tooth]
          : previous.includes(tooth)
            ? previous.filter((item) => item !== tooth)
            : [...previous, tooth],
      ),
    [],
  );
  const clear = useCallback(() => setSelected([]), []);
  const selectAllUpper = useCallback(() => setSelected([...UPPER_TEETH]), []);
  const selectAllLower = useCallback(() => setSelected([...LOWER_TEETH]), []);
  return { selected, setSelected, toggle, clear, selectAllUpper, selectAllLower };
}
