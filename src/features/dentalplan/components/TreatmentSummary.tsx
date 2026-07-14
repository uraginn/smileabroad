import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { treatmentByType } from "../data/treatmentDefinitions";
import { formatQuoteMoney } from "@/lib/quote";
import type {
  DentalPricingItem,
  DentalPlannerCommercial,
  ToothTreatment,
} from "../types/dental-plan.types";

type TreatmentGroup = ReturnType<typeof groupTreatments>[number];

export function TreatmentSummary({
  treatments,
  pricingItems = [],
  currency = "EUR",
  readOnly,
  onDelete,
  onEdit,
  onHighlight,
}: {
  treatments: ToothTreatment[];
  pricingItems?: DentalPricingItem[];
  currency?: DentalPlannerCommercial["currency"];
  readOnly?: boolean;
  onDelete: (ids: string[]) => void;
  onEdit: (ids: string[], notes: string) => void;
  onHighlight: (teeth: number[]) => void;
}) {
  const groups = groupTreatments(treatments);
  const [editing, setEditing] = useState<TreatmentGroup>();
  const [notes, setNotes] = useState("");

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Applied treatments</p>
        <Badge variant="secondary">{treatments.length} items</Badge>
      </div>
      {groups.length ? (
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {group.label} <span className="text-muted-foreground">×{group.quantity}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {group.teeth.length > 6
                    ? `${group.teeth.length} teeth`
                    : `Teeth ${group.teeth.join(", ")}`}
                </p>
                <p className="mt-1 text-xs font-medium">
                  {formatQuoteMoney(
                    group.quantity *
                      (pricingItems.find((item) => item.treatmentId === group.key)?.unitPrice ?? 0),
                    currency,
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
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
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select teeth, choose a treatment, then apply it to build the case.
        </p>
      )}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.label}</DialogTitle>
            <DialogDescription>
              Add a concise clinical note to the selected treatment group.
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
    </div>
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
    }
  >();
  treatments.forEach((treatment) => {
    const key = treatment.treatmentDefinitionId ?? treatment.treatmentType;
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
