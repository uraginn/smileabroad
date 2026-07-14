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
import { treatmentByType } from "../data/treatmentDefinitions";
import type { ToothTreatment } from "../types/dental-plan.types";

type TreatmentGroup = ReturnType<typeof groupTreatments>[number];

export function TreatmentSummary({
  treatments,
  readOnly,
  onDelete,
  onEdit,
  onHighlight,
}: {
  treatments: ToothTreatment[];
  readOnly?: boolean;
  onDelete: (ids: string[]) => void;
  onEdit: (ids: string[], notes: string) => void;
  onHighlight: (teeth: number[]) => void;
}) {
  const groups = useMemo(() => groupTreatments(treatments), [treatments]);
  const [editing, setEditing] = useState<TreatmentGroup>();
  const [notes, setNotes] = useState("");

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
                <TableHead>Affected teeth</TableHead>
                <TableHead className="w-20">Units</TableHead>
                <TableHead className="w-64 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.key}>
                  <TableCell className="font-medium">{group.label}</TableCell>
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
                          setEditing(group);
                          setNotes(group.notes);
                        }}
                      >
                        Edit
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
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                if (!editing) return;
                onEdit(editing.ids, notes);
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
    { key: string; label: string; ids: string[]; teeth: number[]; quantity: number; notes: string }
  >();
  treatments.forEach((treatment) => {
    const key =
      treatment.treatmentDefinitionId ?? treatment.treatmentKey ?? treatment.treatmentType;
    const current = groups.get(key) ?? {
      key,
      label: treatment.displayName ?? treatmentByType(treatment.treatmentType).label,
      ids: [],
      teeth: [],
      quantity: 0,
      notes: treatment.notes ?? "",
    };
    current.ids.push(treatment.id);
    current.teeth = [...new Set([...current.teeth, ...treatment.toothNumbers])];
    current.quantity += Math.max(1, treatment.toothNumbers.length);
    if (!current.notes && treatment.notes) current.notes = treatment.notes;
    groups.set(key, current);
  });
  return [...groups.values()];
}
