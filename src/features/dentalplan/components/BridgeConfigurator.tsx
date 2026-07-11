import { useState } from "react";
import type { BridgeUnitRole, ToothNumber } from "../types/dental-plan.types";
import { orderedByArch } from "../utils/toothNumbers";
export function BridgeConfigurator({
  teeth,
  onCancel,
  onConfirm,
}: {
  teeth: ToothNumber[];
  onCancel: () => void;
  onConfirm: (roles: Partial<Record<ToothNumber, BridgeUnitRole>>) => void;
}) {
  const ordered = orderedByArch(teeth);
  const [roles, setRoles] = useState<Partial<Record<ToothNumber, BridgeUnitRole>>>(() => {
    const initial: Partial<Record<ToothNumber, BridgeUnitRole>> = {};
    ordered.forEach((tooth, index) => {
      initial[tooth] = index === 0 || index === ordered.length - 1 ? "abutment-crown" : "pontic";
    });
    return initial;
  });
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="text-sm font-semibold">Configure Bridge</div>
      <p className="text-xs text-muted-foreground">
        Select each unit role. At least one abutment is required.
      </p>
      {ordered.map((tooth) => (
        <div key={tooth} className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Tooth {tooth}</span>
          <select
            className="rounded border bg-background px-2 py-1 text-xs"
            value={roles[tooth] ?? "pontic"}
            onChange={(event) =>
              setRoles((current) => ({ ...current, [tooth]: event.target.value as BridgeUnitRole }))
            }
          >
            <option value="abutment-crown">Abutment Crown</option>
            <option value="pontic">Pontic</option>
            <option value="implant-abutment">Implant Abutment</option>
          </select>
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-3 py-1.5 text-xs hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(roles)}
          className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground"
        >
          Create Bridge
        </button>
      </div>
    </div>
  );
}
