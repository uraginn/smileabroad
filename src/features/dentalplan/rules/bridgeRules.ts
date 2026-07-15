import type { BridgeUnitRole, ToothNumber } from "../types/dental-plan.types";
import { getArch, LOWER_TEETH, sameArch, UPPER_TEETH } from "../utils/toothNumbers";
export type BridgeSelectionResult =
  { ok: true; span: ToothNumber[] } | { ok: false; message: string };
export function resolveBridgeSelection(teeth: ToothNumber[]): BridgeSelectionResult {
  if (teeth.length < 2)
    return { ok: false, message: "Select at least one more tooth on the same arch." };
  if (!sameArch(teeth))
    return {
      ok: false,
      message: "A Bridge cannot span both arches. Select teeth from one arch only.",
    };
  const arch = getArch(teeth[0]) === "upper" ? UPPER_TEETH : LOWER_TEETH;
  const indexes = teeth.map((tooth) => arch.indexOf(tooth));
  if (indexes.some((index) => index < 0))
    return { ok: false, message: "The Bridge selection contains an invalid tooth position." };
  return {
    ok: true,
    span: arch.slice(Math.min(...indexes), Math.max(...indexes) + 1),
  };
}

export function automaticBridgeRoles(
  span: ToothNumber[],
  implantPositions: ToothNumber[],
): Partial<Record<ToothNumber, BridgeUnitRole>> {
  const implants = new Set(implantPositions);
  return Object.fromEntries(
    span.map((tooth, index) => [
      tooth,
      implants.has(tooth)
        ? "implant-abutment"
        : index === 0 || index === span.length - 1
          ? "abutment-crown"
          : "pontic",
    ]),
  ) as Partial<Record<ToothNumber, BridgeUnitRole>>;
}
