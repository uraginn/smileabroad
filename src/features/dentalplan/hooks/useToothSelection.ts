import { useCallback, useRef, useState } from "react";
import type { ToothNumber } from "../types/dental-plan.types";
import { LOWER_TEETH, UPPER_TEETH } from "../utils/toothNumbers";
export function useToothSelection() {
  const [selected, setSelected] = useState<ToothNumber[]>([]);
  const dragging = useRef(false);
  const visited = useRef(new Set<ToothNumber>());
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
  const selectAll = useCallback(() => setSelected([...UPPER_TEETH, ...LOWER_TEETH]), []);
  const beginDrag = useCallback((tooth: ToothNumber, additive: boolean) => {
    dragging.current = true;
    visited.current = new Set([tooth]);
    setSelected((current) =>
      additive
        ? current.includes(tooth)
          ? current.filter((item) => item !== tooth)
          : [...current, tooth]
        : [tooth],
    );
  }, []);
  const enterDrag = useCallback((tooth: ToothNumber) => {
    if (!dragging.current || visited.current.has(tooth)) return;
    visited.current.add(tooth);
    setSelected((current) => (current.includes(tooth) ? current : [...current, tooth]));
  }, []);
  const endDrag = useCallback(() => {
    dragging.current = false;
    visited.current.clear();
  }, []);
  return {
    selected,
    setSelected,
    toggle,
    clear,
    selectAllUpper,
    selectAllLower,
    selectAll,
    beginDrag,
    enterDrag,
    endDrag,
  };
}
