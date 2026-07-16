import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { conditionByType } from "../data/conditionDefinitions";
import type { ConditionType, ToothCondition, ToothNumber } from "../types/dental-plan.types";

export function ConditionSummary({
  conditions,
  onRemove,
  onHighlight,
}: {
  conditions: Partial<Record<ToothNumber, ToothCondition>>;
  onRemove: (tooth: ToothNumber, condition: ConditionType) => void;
  onHighlight: (teeth: ToothNumber[]) => void;
}) {
  const groups = useMemo(() => groupConditions(conditions), [conditions]);
  return (
    <section className="border-t pt-4" aria-labelledby="recorded-conditions-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id="recorded-conditions-heading" className="font-semibold">
          Recorded conditions
        </h3>
        <Badge variant="secondary">{groups.length} types</Badge>
      </div>
      {groups.length ? (
        <div className="overflow-x-auto">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Condition</TableHead>
                <TableHead>Clinical context</TableHead>
                <TableHead>Affected teeth</TableHead>
                <TableHead className="w-20">Units</TableHead>
                <TableHead className="w-48 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.type}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-sm"
                        style={{ backgroundColor: group.definition.color }}
                      />
                      {group.definition.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Current clinical finding
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {group.teeth.length > 8
                      ? `${group.teeth.length} teeth`
                      : group.teeth.join(", ")}
                  </TableCell>
                  <TableCell>{group.teeth.length}</TableCell>
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
                        className="text-destructive hover:text-destructive"
                        onClick={() => group.teeth.forEach((tooth) => onRemove(tooth, group.type))}
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
          No conditions recorded yet. Select teeth, choose a condition, then apply it.
        </p>
      )}
    </section>
  );
}

function groupConditions(conditions: Partial<Record<ToothNumber, ToothCondition>>) {
  const groups = new Map<ConditionType, ToothNumber[]>();
  Object.values(conditions).forEach((entry) => {
    if (!entry) return;
    entry.conditions.forEach((condition) =>
      groups.set(condition, [...(groups.get(condition) ?? []), entry.toothNumber]),
    );
  });
  return [...groups.entries()].map(([type, teeth]) => ({
    type,
    definition: conditionByType(type),
    teeth: [...new Set(teeth)].sort((a, b) => a - b),
  }));
}
