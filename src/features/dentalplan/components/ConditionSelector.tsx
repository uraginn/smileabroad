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
import { CONDITION_DEFINITIONS } from "../data/conditionDefinitions";
import type { ConditionType } from "../types/dental-plan.types";

const GROUPS: Array<{ label: string; types: ConditionType[] }> = [
  { label: "Missing / Extracted", types: ["missing", "extraction-required"] },
  {
    label: "Existing Restorations",
    types: ["existing-filling", "existing-crown", "existing-bridge", "existing-implant"],
  },
  {
    label: "Clinical Findings",
    types: ["healthy", "decay", "fractured", "mobility", "periodontal-problem"],
  },
  { label: "Endodontic", types: ["root-canal-treated"] },
  { label: "Other", types: ["impacted", "other"] },
];

export function ConditionSelector({
  selectedType,
  onSelect,
}: {
  selectedType?: ConditionType;
  onSelect: (condition: ConditionType) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = CONDITION_DEFINITIONS.find((item) => item.type === selectedType);
  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        conditions: group.types
          .map((type) => CONDITION_DEFINITIONS.find((item) => item.type === type))
          .filter((item): item is (typeof CONDITION_DEFINITIONS)[number] => Boolean(item)),
      })).filter((group) => group.conditions.length),
    [],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-56 flex-1">
        <p className="text-sm font-semibold">Condition</p>
        <p className="text-xs text-muted-foreground">
          Search and record the patient&apos;s current clinical findings.
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
            <span className="truncate">{selected?.label ?? "Select condition..."}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder="Search conditions..." />
            <CommandList className="max-h-80">
              <CommandEmpty>No conditions found</CommandEmpty>
              {groups.map((group, groupIndex) => (
                <div key={group.label}>
                  {groupIndex > 0 && <CommandSeparator />}
                  <CommandGroup heading={group.label}>
                    {group.conditions.map((condition) => (
                      <CommandItem
                        key={condition.type}
                        value={`${condition.label} ${group.label}`}
                        onSelect={() => {
                          onSelect(condition.type);
                          setOpen(false);
                        }}
                      >
                        <span
                          className="mr-1 flex size-8 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold"
                          style={{
                            borderColor: condition.color,
                            color: condition.color,
                            backgroundColor: `${condition.color}18`,
                          }}
                        >
                          {condition.short}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {condition.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {group.label}
                          </span>
                        </span>
                        {selectedType === condition.type && <Check className="size-4" />}
                      </CommandItem>
                    ))}
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
