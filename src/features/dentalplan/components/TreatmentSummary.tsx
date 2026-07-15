import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { treatmentByType } from "../data/treatmentDefinitions";
import type { ClinicalTreatmentStage, ToothTreatment } from "../types/dental-plan.types";
import { orderedByArch } from "../utils/toothNumbers";

type TreatmentGroup = ReturnType<typeof groupTreatments>[number];

export function TreatmentSummary({
  treatments,
  readOnly,
  onDelete,
  onEdit,
  onEditSpan,
  onHighlight,
}: {
  treatments: ToothTreatment[];
  readOnly?: boolean;
  onDelete: (ids: string[]) => void;
  onEdit: (ids: string[], patch: Pick<ToothTreatment, "notes" | "stage" | "material">) => void;
  onEditSpan: (id: string) => void;
  onHighlight: (teeth: number[]) => void;
}) {
  const groups = useMemo(() => groupTreatments(treatments), [treatments]);
  const [editing, setEditing] = useState<TreatmentGroup>();
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<ClinicalTreatmentStage>("follow-up");
  const [material, setMaterial] = useState<ToothTreatment["material"]>();

  return (
    <section className="border-t pt-4" aria-labelledby="applied-treatments-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id="applied-treatments-heading" className="font-semibold">
          Applied treatments
        </h3>
        <Badge variant="secondary">{groups.length} types</Badge>
      </div>
      {groups.length ? (
        <div className="overflow-x-auto">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Treatment</TableHead>
                <TableHead>Clinical context</TableHead>
                <TableHead>Affected teeth</TableHead>
                <TableHead className="w-20">Units</TableHead>
                <TableHead className="w-64 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.key}>
                  <TableCell className="font-medium">{group.label}</TableCell>
                  <TableCell className="text-xs capitalize text-muted-foreground">
                    {group.context || "Tooth-level procedure"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {group.teeth.length > 8
                      ? `${group.teeth.length} teeth`
                      : group.teeth.join(", ")}
                  </TableCell>
                  <TableCell>{group.quantity}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onHighlight(group.teeth)}
                      >
                        Highlight
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={readOnly}
                        onClick={() => {
                          if (group.bridgeId) {
                            onEditSpan(group.bridgeId);
                            return;
                          }
                          setEditing(group);
                          setNotes(group.notes);
                          setStage(group.stage ?? "follow-up");
                          setMaterial(group.material);
                        }}
                      >
                        {group.bridgeId ? "Edit span" : "Edit"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={readOnly}
                        onClick={() => onDelete(group.ids)}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          No treatments applied yet. Select teeth, choose a treatment, then apply it.
        </p>
      )}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.label}</DialogTitle>
            <DialogDescription>
              Add a concise clinical note to this treatment group.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Treatment notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder="Clinical note"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Treatment stage</Label>
              <Select
                value={stage}
                onValueChange={(value) => setStage(value as ClinicalTreatmentStage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "disease-control",
                    "surgical-preparation",
                    "grafting",
                    "implant-placement",
                    "healing",
                    "temporary-restoration",
                    "final-restoration",
                    "cosmetic-finishing",
                    "follow-up",
                  ].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.replace(/-/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(editing?.material || editing?.label.toLowerCase().includes("crown")) && (
              <div className="space-y-1.5">
                <Label>Material</Label>
                <Select
                  value={material ?? "unspecified"}
                  onValueChange={(value) =>
                    setMaterial(
                      value === "unspecified" ? undefined : (value as ToothTreatment["material"]),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">Not specified</SelectItem>
                    <SelectItem value="zirconium">Zirconium</SelectItem>
                    <SelectItem value="emax">E-max</SelectItem>
                    <SelectItem value="porcelain-metal">Porcelain-metal</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                    <SelectItem value="composite">Composite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                if (!editing) return;
                onEdit(editing.ids, { notes, stage, material });
                setEditing(undefined);
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function groupTreatments(treatments: ToothTreatment[]) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      ids: string[];
      teeth: number[];
      quantity: number;
      notes: string;
      bridgeId?: string;
      context: string;
      stage?: ClinicalTreatmentStage;
      material?: ToothTreatment["material"];
      sequence: number;
    }
  >();
  treatments.forEach((treatment) => {
    const key =
      treatment.treatmentType === "bridge"
        ? (treatment.treatmentGroupId ?? treatment.id)
        : (treatment.treatmentDefinitionId ?? treatment.treatmentKey ?? treatment.treatmentType);
    const orderedTeeth = orderedByArch(treatment.toothNumbers);
    const bridgeLabel =
      treatment.treatmentType === "bridge"
        ? `${treatment.displayName ?? "Zirconium Bridge"} ${formatRange(orderedTeeth)} · ${orderedTeeth.length} units`
        : undefined;
    const current = groups.get(key) ?? {
      key,
      label: bridgeLabel ?? treatment.displayName ?? treatmentByType(treatment.treatmentType).label,
      ids: [],
      teeth: [],
      quantity: 0,
      notes: treatment.notes ?? "",
      bridgeId: treatment.treatmentType === "bridge" ? treatment.id : undefined,
      stage: treatment.stage,
      material: treatment.material,
      sequence: treatment.sequence ?? 99,
      context: [
        treatment.bridgeType?.replace(/-/g, " "),
        treatment.supportType ? `${treatment.supportType} support` : undefined,
        treatment.material?.replace(/-/g, " "),
        treatment.stage?.replace(/-/g, " "),
      ]
        .filter(Boolean)
        .join(" · "),
    };
    current.ids.push(treatment.id);
    current.teeth = [...new Set([...current.teeth, ...treatment.toothNumbers])];
    current.quantity += Math.max(1, treatment.toothNumbers.length);
    if (!current.notes && treatment.notes) current.notes = treatment.notes;
    groups.set(key, current);
  });
  return [...groups.values()].sort(
    (a, b) => a.sequence - b.sequence || a.label.localeCompare(b.label),
  );
}

function formatRange(teeth: number[]) {
  const first = teeth[0];
  const last = teeth.at(-1);
  if (!first || !last) return "";
  if (Math.floor(first / 10) === Math.floor(last / 10))
    return `${Math.min(first, last)}–${Math.max(first, last)}`;
  return `${first}–${last}`;
}
