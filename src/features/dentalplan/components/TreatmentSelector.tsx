import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TREATMENT_DEFINITIONS } from "../data/treatmentDefinitions";
import type { EffectiveTreatmentDefinition, TreatmentType } from "../types/dental-plan.types";

const GROUPS: Array<{ label: string; types: TreatmentType[] }> = [
  {
    label: "Implant",
    types: ["dental-implant", "implant-crown"],
  },
  {
    label: "Restorative",
    types: [
      "composite-filling",
      "zirconium-crown",
      "emax-crown",
      "porcelain-crown",
      "temporary-crown",
      "bridge",
      "pontic",
      "inlay-onlay",
    ],
  },
  { label: "Cosmetic", types: ["veneer", "composite-bonding", "whitening"] },
  { label: "Endodontic", types: ["root-canal-treatment"] },
  { label: "Surgical", types: ["extraction"] },
  {
    label: "Full Arch",
    types: ["all-on-4", "all-on-6", "denture"],
  },
  { label: "Supporting Procedures", types: ["bone-graft", "sinus-lift", "other"] },
];

export function TreatmentSelector({
  disabled,
  canApply,
  onApply,
  definitions,
}: {
  disabled: boolean;
  canApply: boolean;
  onApply: (treatment: EffectiveTreatmentDefinition) => void;
  definitions: EffectiveTreatmentDefinition[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = definitions.find((item) => item.id === selectedId);
  const customGroups = [
    ...new Set(definitions.filter((item) => !item.system).map((item) => item.category)),
  ].map((category) => ({
    label: category,
    definitions: definitions.filter((item) => !item.system && item.category === category),
  }));
  const groups = [
    ...GROUPS.map((group) => ({
      label: group.label,
      definitions: definitions.filter(
        (item) => item.system && group.types.includes(item.baseTreatmentKey),
      ),
    })),
    ...customGroups,
  ].filter((group) => group.definitions.length);
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Apply proposed treatment
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between"
          >
            <span className="truncate">{selected?.displayName ?? "Choose treatment"}</span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search treatments..." />
            <CommandList className="max-h-96">
              <CommandEmpty>No treatments found</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.definitions.map((treatment) => {
                    const visual = TREATMENT_DEFINITIONS.find(
                      (item) => item.type === treatment.visualKey,
                    );
                    return (
                      <CommandItem
                        key={treatment.id}
                        value={`${treatment.displayName} ${group.label}`}
                        onSelect={() => {
                          setSelectedId(treatment.id);
                          setOpen(false);
                        }}
                      >
                        <span
                          className="mr-2 size-3 rounded-sm border"
                          style={{ background: visual?.color }}
                        />
                        <span className="truncate">{treatment.displayName}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        className="w-full"
        disabled={disabled || !canApply || !selected}
        onClick={() => {
          if (!selected) return;
          onApply(selected);
          setSelectedId(undefined);
        }}
      >
        {canApply ? "Apply selected treatment" : "Select teeth to apply"}
      </Button>
    </div>
  );
}
