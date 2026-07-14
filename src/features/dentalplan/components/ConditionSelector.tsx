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
import { CONDITION_DEFINITIONS } from "../data/conditionDefinitions";
import type { ConditionType } from "../types/dental-plan.types";

const GROUPS: Array<{ label: string; types: ConditionType[] }> = [
  { label: "Missing / Extracted", types: ["missing", "extraction-required"] },
  {
    label: "Existing restorations",
    types: ["existing-filling", "existing-crown", "existing-bridge", "existing-implant"],
  },
  {
    label: "Tooth conditions",
    types: ["healthy", "decay", "fractured", "mobility", "periodontal-problem"],
  },
  { label: "Endodontic", types: ["root-canal-treated"] },
  { label: "Other findings", types: ["impacted", "other"] },
];

export function ConditionSelector({
  disabled,
  onApply,
}: {
  disabled: boolean;
  onApply: (condition: ConditionType) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Apply current condition
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between"
          >
            <span className="truncate">
              {disabled ? "Select teeth first" : "Choose a clinical finding"}
            </span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search conditions..." />
            <CommandList className="max-h-80">
              <CommandEmpty>No conditions found</CommandEmpty>
              {GROUPS.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.types.map((type) => {
                    const condition = CONDITION_DEFINITIONS.find((item) => item.type === type);
                    if (!condition) return null;
                    return (
                      <CommandItem
                        key={condition.type}
                        value={`${condition.label} ${group.label}`}
                        onSelect={() => {
                          onApply(condition.type);
                          setOpen(false);
                        }}
                      >
                        <span
                          className="mr-2 size-3 rounded-sm border"
                          style={{ background: condition.color }}
                        />
                        {condition.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">Selecting a finding applies it immediately.</p>
    </div>
  );
}
