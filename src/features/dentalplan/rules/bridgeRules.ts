import type { BridgeType, BridgeUnitRole, ToothNumber } from "../types/dental-plan.types";
import {
  getArch,
  isContiguousInArch,
  LOWER_TEETH,
  sameArch,
  UPPER_TEETH,
} from "../utils/toothNumbers";
export type BridgeValidation = { ok: true } | { ok: false; message: string };
export function validateBridge(teeth: ToothNumber[]): BridgeValidation {
  if (teeth.length < 2)
    return { ok: false, message: "A bridge requires at least two tooth positions." };
  if (!sameArch(teeth))
    return { ok: false, message: "A bridge cannot span the upper and lower arch." };
  if (!isContiguousInArch(teeth))
    return { ok: false, message: "Bridge positions must be contiguous within the arch." };
  return { ok: true };
}

export function bridgeSpan(start: ToothNumber, end: ToothNumber): ToothNumber[] {
  if (getArch(start) !== getArch(end)) return [];
  const arch = getArch(start) === "upper" ? UPPER_TEETH : LOWER_TEETH;
  const startIndex = arch.indexOf(start);
  const endIndex = arch.indexOf(end);
  if (startIndex < 0 || endIndex < 0) return [];
  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  const span = arch.slice(from, to + 1);
  return span[0] === start ? span : span.reverse();
}

export function defaultBridgeSpan(teeth: ToothNumber[]) {
  if (!teeth.length) return [];
  if (teeth.length > 1 && sameArch(teeth)) return bridgeSpan(teeth[0], teeth.at(-1)!);
  const arch = getArch(teeth[0]) === "upper" ? UPPER_TEETH : LOWER_TEETH;
  const center = arch.indexOf(teeth[0]);
  const from = Math.max(0, center - 1);
  const to = Math.min(arch.length - 1, center + 1);
  return arch.slice(from, to + 1);
}

export function defaultBridgeRoles(
  teeth: ToothNumber[],
  bridgeType: BridgeType,
  implantPositions: ToothNumber[] = [],
): Partial<Record<ToothNumber, BridgeUnitRole>> {
  const roles: Partial<Record<ToothNumber, BridgeUnitRole>> = {};
  const implantSupports = new Set(implantPositions);
  teeth.forEach((tooth, index) => {
    const endpoint = index === 0 || index === teeth.length - 1;
    roles[tooth] =
      bridgeType === "implant-supported"
        ? implantSupports.size
          ? implantSupports.has(tooth)
            ? "implant-abutment"
            : "pontic"
          : endpoint
            ? "implant-abutment"
            : "pontic"
        : bridgeType === "cantilever"
          ? index === 0
            ? "abutment-crown"
            : "pontic"
          : endpoint
            ? "abutment-crown"
            : "pontic";
  });
  return roles;
}

export function validateBridgeDesign(
  teeth: ToothNumber[],
  roles: Partial<Record<ToothNumber, BridgeUnitRole>>,
  bridgeType: BridgeType,
): BridgeValidation {
  const spanValidation = validateBridge(teeth);
  if (!spanValidation.ok) return spanValidation;
  const values = teeth.map((tooth) => roles[tooth]);
  const pontics = values.filter((role) => role === "pontic").length;
  const supports = values.filter((role) => role && role !== "pontic").length;
  if (!pontics) return { ok: false, message: "A bridge requires at least one pontic." };
  if (!supports) return { ok: false, message: "A bridge requires at least one supporting unit." };
  if (bridgeType === "conventional" && supports < 2)
    return { ok: false, message: "A conventional bridge requires support at both ends." };
  if (bridgeType === "implant-supported" && values.some((role) => role === "abutment-crown"))
    return {
      ok: false,
      message:
        "Implant-supported bridges must use implant abutments rather than natural-tooth abutments.",
    };
  return { ok: true };
}
