import type { ToothNumber } from "../types/dental-plan.types";
import { isContiguousInArch, sameArch } from "../utils/toothNumbers";
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
