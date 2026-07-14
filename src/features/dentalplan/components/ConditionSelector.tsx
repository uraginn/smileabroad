import { useState } from "react";
import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
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
  disabled,
  onApply,
}: {
  disabled: boolean;
  onApply: (condition: ConditionType) => void;
}) {
  const [selectedType, setSelectedType] = useState<ConditionType>();
  const selected = CONDITION_DEFINITIONS.find((item) => item.type === selectedType);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Condition controls</p>
          <p className="text-xs text-muted-foreground">
            Choose a category, search clinical findings and apply one to the selected teeth.
          </p>
        </div>
        <Button
          type="button"
          disabled={disabled || !selectedType}
          onClick={() => {
            if (!selectedType) return;
            onApply(selectedType);
            setSelectedType(undefined);
          }}
        >
          Apply {selected?.label ?? "condition"}
        </Button>
      </div>
      <Accordion type="single" collapsible className="rounded-lg border px-3">
        {GROUPS.map((group) => (
          <AccordionItem key={group.label} value={group.label}>
            <AccordionTrigger>
              <span>
                {group.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {group.types.length}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Command className="rounded-md border">
                <CommandInput placeholder={`Search ${group.label.toLowerCase()}...`} />
                <CommandList className="max-h-56">
                  <CommandEmpty>No conditions found</CommandEmpty>
                  {group.types.map((type) => {
                    const condition = CONDITION_DEFINITIONS.find((item) => item.type === type);
                    if (!condition) return null;
                    return (
                      <CommandItem
                        key={condition.type}
                        value={`${condition.label} ${group.label}`}
                        onSelect={() => setSelectedType(condition.type)}
                      >
                        <span
                          className="mr-2 size-3 rounded-sm border"
                          style={{ background: condition.color }}
                        />
                        <span className="min-w-0 flex-1 truncate">{condition.label}</span>
                        {selectedType === condition.type && <Check className="size-4" />}
                      </CommandItem>
                    );
                  })}
                </CommandList>
              </Command>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
