import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  TREATMENT_CATEGORIES,
  TREATMENT_DEFINITIONS,
  treatmentRelationship,
} from "../data/treatmentDefinitions";
import type { EffectiveTreatmentDefinition } from "../types/dental-plan.types";

export function TreatmentSelector({
  definitions,
  selectedId,
  onSelect,
}: {
  definitions: EffectiveTreatmentDefinition[];
  selectedId?: string;
  onSelect: (treatmentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = definitions.find((item) => item.id === selectedId);
  const grouped = useMemo(
    () =>
      TREATMENT_CATEGORIES.map((category) => ({
        label: category,
        definitions: definitions.filter(
          (item) =>
            item.category === category ||
            (category === "Other" &&
              !TREATMENT_CATEGORIES.includes(
                item.category as (typeof TREATMENT_CATEGORIES)[number],
              )),
        ),
      })).filter((group) => group.definitions.length),
    [definitions],
  );

  if (!grouped.length)
    return (
      <p className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        No active treatments are available. Review the clinic treatment settings.
      </p>
    );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-56 flex-1">
        <p className="text-sm font-semibold">Treatment</p>
        <p className="text-xs text-muted-foreground">
          Search and apply independent clinical layers.
        </p>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between sm:w-80"
          >
            <span className="truncate">{selected?.displayName ?? "Select treatment..."}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder="Search treatments..." />
            <CommandList className="max-h-80">
              <CommandEmpty>No treatments found</CommandEmpty>
              {grouped.map((group, groupIndex) => (
                <div key={group.label}>
                  {groupIndex > 0 && <CommandSeparator />}
                  <CommandGroup heading={group.label}>
                    {group.definitions.map((treatment) => {
                      const visual = TREATMENT_DEFINITIONS.find(
                        (item) => item.type === treatment.visualKey,
                      );
                      const relationship = treatmentRelationship(treatment.baseTreatmentKey);
                      const scopeLabel =
                        relationship.scope === "tooth"
                          ? "Single-tooth layer"
                          : relationship.scope === "span"
                            ? "Span treatment"
                            : relationship.scope === "arch"
                              ? "Arch treatment"
                              : "Plan-level treatment";
                      return (
                        <CommandItem
                          key={treatment.id}
                          value={`${treatment.displayName} ${group.label} ${relationship.role} ${scopeLabel}`}
                          onSelect={() => {
                            onSelect(treatment.id);
                            setOpen(false);
                          }}
                        >
                          <span
                            className="mr-1 flex size-8 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold"
                            style={{
                              borderColor: visual?.color,
                              color: visual?.color,
                              backgroundColor: `${visual?.color ?? "#64748b"}18`,
                            }}
                          >
                            {visual?.short ?? "?"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {treatment.displayName}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {scopeLabel} · {relationship.role}
                            </span>
                          </span>
                          {selectedId === treatment.id && <Check className="size-4" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </div>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
