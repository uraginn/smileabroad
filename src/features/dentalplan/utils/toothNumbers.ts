import type { ToothNumber } from "../types/dental-plan.types";
export const UPPER_TEETH: ToothNumber[] = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
export const LOWER_TEETH: ToothNumber[] = [
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];
export const ALL_TEETH: ToothNumber[] = [...UPPER_TEETH, ...LOWER_TEETH];
export function getArch(t: ToothNumber): "upper" | "lower" {
  return UPPER_TEETH.includes(t) ? "upper" : "lower";
}
export function orderedByArch(teeth: ToothNumber[]): ToothNumber[] {
  const arch = teeth.every((t) => UPPER_TEETH.includes(t))
    ? UPPER_TEETH
    : teeth.every((t) => LOWER_TEETH.includes(t))
      ? LOWER_TEETH
      : null;
  if (!arch) return [...teeth];
  return [...teeth].sort((a, b) => arch.indexOf(a) - arch.indexOf(b));
}
export function sameArch(teeth: ToothNumber[]): boolean {
  if (!teeth.length) return true;
  const arch = getArch(teeth[0]);
  return teeth.every((t) => getArch(t) === arch);
}
export function isContiguousInArch(teeth: ToothNumber[]): boolean {
  if (!sameArch(teeth)) return false;
  const arch = getArch(teeth[0]) === "upper" ? UPPER_TEETH : LOWER_TEETH;
  const indices = teeth.map((t) => arch.indexOf(t)).sort((a, b) => a - b);
  return indices.every((value, index) => index === 0 || value === indices[index - 1] + 1);
}
