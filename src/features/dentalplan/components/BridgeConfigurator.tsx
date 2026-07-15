import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  BridgeType,
  BridgeUnitRole,
  ToothNumber,
  ToothTreatment,
} from "../types/dental-plan.types";
import {
  bridgeSpan,
  defaultBridgeRoles,
  defaultBridgeSpan,
  validateBridgeDesign,
} from "../rules/bridgeRules";
import { getArch, LOWER_TEETH, UPPER_TEETH } from "../utils/toothNumbers";

export type BridgeConfiguration = {
  teeth: ToothNumber[];
  roles: Partial<Record<ToothNumber, BridgeUnitRole>>;
  bridgeType: BridgeType;
  material?: ToothTreatment["material"];
};

export function BridgeConfigurator({
  teeth,
  implantPositions = [],
  selectionWasNonContiguous,
  initialRoles,
  initialBridgeType,
  initialMaterial = "zirconium",
  onCancel,
  onConfirm,
}: {
  teeth: ToothNumber[];
  implantPositions?: ToothNumber[];
  selectionWasNonContiguous?: boolean;
  initialRoles?: Partial<Record<ToothNumber, BridgeUnitRole>>;
  initialBridgeType?: BridgeType;
  initialMaterial?: ToothTreatment["material"];
  onCancel: () => void;
  onConfirm: (configuration: BridgeConfiguration) => void;
}) {
  const initialSpan = useMemo(() => defaultBridgeSpan(teeth), [teeth]);
  const implantPositionKey = implantPositions.join(",");
  const stableImplantPositions = useMemo(
    () =>
      implantPositionKey
        .split(",")
        .filter(Boolean)
        .map((tooth) => Number(tooth) as ToothNumber),
    [implantPositionKey],
  );
  const resolvedInitialBridgeType =
    initialBridgeType ??
    (stableImplantPositions.filter((tooth) => initialSpan.includes(tooth)).length >= 2
      ? "implant-supported"
      : "conventional");
  const archTeeth = getArch(initialSpan[0] ?? teeth[0]) === "lower" ? LOWER_TEETH : UPPER_TEETH;
  const [start, setStart] = useState<ToothNumber>(initialSpan[0] ?? archTeeth[0]);
  const [end, setEnd] = useState<ToothNumber>(initialSpan.at(-1) ?? archTeeth[2]);
  const [bridgeType, setBridgeType] = useState<BridgeType>(resolvedInitialBridgeType);
  const [material, setMaterial] = useState<ToothTreatment["material"]>(initialMaterial);
  const span = useMemo(() => bridgeSpan(start, end), [end, start]);
  const [roles, setRoles] = useState<Partial<Record<ToothNumber, BridgeUnitRole>>>(() =>
    initialRoles && Object.keys(initialRoles).length
      ? initialRoles
      : defaultBridgeRoles(initialSpan, resolvedInitialBridgeType, stableImplantPositions),
  );
  const [error, setError] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    setRoles(defaultBridgeRoles(span, bridgeType, stableImplantPositions));
    setError("");
  }, [bridgeType, span, stableImplantPositions]);

  const supportCount = span.filter((tooth) => roles[tooth] !== "pontic").length;
  const ponticCount = span.filter((tooth) => roles[tooth] === "pontic").length;
  const rangeLabel = formatRange(span);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Bridge Builder</h3>
          <p className="text-xs text-muted-foreground">
            Choose the complete span, then confirm supports and pontics.
          </p>
        </div>
        <Badge variant="secondary">
          {span.length} units · {supportCount} supports · {ponticCount} pontics
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <BridgeField label="Start tooth">
          <Select
            value={String(start)}
            onValueChange={(value) => setStart(Number(value) as ToothNumber)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {archTeeth.map((tooth) => (
                <SelectItem key={tooth} value={String(tooth)}>
                  {tooth}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BridgeField>
        <BridgeField label="End tooth">
          <Select
            value={String(end)}
            onValueChange={(value) => setEnd(Number(value) as ToothNumber)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {archTeeth.map((tooth) => (
                <SelectItem key={tooth} value={String(tooth)}>
                  {tooth}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BridgeField>
        <BridgeField label="Bridge type">
          <Select value={bridgeType} onValueChange={(value) => setBridgeType(value as BridgeType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conventional">Conventional</SelectItem>
              <SelectItem value="cantilever">Cantilever</SelectItem>
              <SelectItem value="implant-supported">Implant-supported</SelectItem>
            </SelectContent>
          </Select>
        </BridgeField>
        <BridgeField label="Material">
          <Select
            value={material}
            onValueChange={(value) => setMaterial(value as ToothTreatment["material"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zirconium">Zirconium</SelectItem>
              <SelectItem value="emax">E-max</SelectItem>
              <SelectItem value="porcelain-metal">Porcelain-metal</SelectItem>
              <SelectItem value="temporary">Temporary</SelectItem>
            </SelectContent>
          </Select>
        </BridgeField>
      </div>

      {selectionWasNonContiguous && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Selection resolved as one bridge span</AlertTitle>
          <AlertDescription>
            The selected positions were not contiguous. The preview includes every position from
            {` ${start} to ${end}`}; review the units below before applying.
          </AlertDescription>
        </Alert>
      )}

      {bridgeType === "cantilever" && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Clinical confirmation required</AlertTitle>
          <AlertDescription>
            Cantilever bridges use support from one side and require clinician review of load and
            span.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {span.map((tooth) => (
          <div
            key={tooth}
            className="flex items-center justify-between gap-3 rounded-md border bg-background p-2.5"
          >
            <span className="text-sm font-medium">Tooth {tooth}</span>
            <Select
              value={roles[tooth] ?? "pontic"}
              onValueChange={(value) =>
                setRoles((current) => ({ ...current, [tooth]: value as BridgeUnitRole }))
              }
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abutment-crown">Abutment Crown</SelectItem>
                <SelectItem value="pontic">Pontic</SelectItem>
                <SelectItem value="implant-abutment">Implant Abutment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            const validation = validateBridgeDesign(span, roles, bridgeType);
            if (!validation.ok) {
              setError(validation.message);
              return;
            }
            onConfirm({ teeth: span, roles, bridgeType, material });
          }}
        >
          Apply Bridge {rangeLabel}
        </Button>
      </div>
    </div>
  );
}

function formatRange(teeth: ToothNumber[]) {
  const first = teeth[0];
  const last = teeth.at(-1);
  if (!first || !last) return "";
  if (Math.floor(first / 10) === Math.floor(last / 10))
    return `${Math.min(first, last)}–${Math.max(first, last)}`;
  return `${first}–${last}`;
}

function BridgeField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
