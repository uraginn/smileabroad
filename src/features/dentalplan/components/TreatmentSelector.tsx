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
    label: "Restorative",
    types: [
      "composite-filling",
      "composite-bonding",
      "veneer",
      "zirconium-crown",
      "emax-crown",
      "porcelain-crown",
      "root-canal-treatment",
    ],
  },
  {
    label: "Surgical and implant",
    types: ["extraction", "dental-implant", "implant-crown", "bone-graft", "sinus-lift"],
  },
  { label: "Prosthetic", types: ["bridge", "pontic", "all-on-4", "all-on-6", "denture"] },
  { label: "Cosmetic", types: ["whitening"] },
];

export function TreatmentSelector({
  disabled,
  onApply,
  definitions,
}: {
  disabled: boolean;
  onApply: (treatment: EffectiveTreatmentDefinition) => void;
  definitions: EffectiveTreatmentDefinition[];
}) {
  const [open, setOpen] = useState(false);
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
            Choose treatment
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
                          onApply(treatment);
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
    </div>
  );
}
