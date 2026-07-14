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
import { TREATMENT_DEFINITIONS } from "../data/treatmentDefinitions";
import type { EffectiveTreatmentDefinition, TreatmentType } from "../types/dental-plan.types";

const GROUPS: Array<{ label: string; types: TreatmentType[] }> = [
  {
    label: "Implant",
    types: ["dental-implant", "implant-crown", "all-on-4", "all-on-6"],
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
      "root-canal-treatment",
    ],
  },
  { label: "Cosmetic", types: ["veneer", "composite-bonding", "whitening"] },
  { label: "Surgical", types: ["extraction"] },
  { label: "Supporting", types: ["bone-graft", "sinus-lift"] },
  { label: "Other", types: ["denture", "other"] },
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
  const [selectedId, setSelectedId] = useState<string>();
  const selected = definitions.find((item) => item.id === selectedId);
  const grouped = GROUPS.map((group) => ({
    label: group.label,
    definitions: definitions.filter((item) =>
      item.system ? group.types.includes(item.baseTreatmentKey) : group.label === "Other",
    ),
  })).filter((group) => group.definitions.length);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Treatment controls</p>
          <p className="text-xs text-muted-foreground">
            Choose a category, search the registry and apply it to the selected teeth.
          </p>
        </div>
        <Button
          type="button"
          disabled={disabled || !canApply || !selected}
          onClick={() => {
            if (!selected) return;
            onApply(selected);
            setSelectedId(undefined);
          }}
        >
          Apply {selected?.displayName ?? "treatment"}
        </Button>
      </div>
      <Accordion type="single" collapsible className="rounded-lg border px-3">
        {grouped.map((group) => (
          <AccordionItem key={group.label} value={group.label}>
            <AccordionTrigger>
              <span>
                {group.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {group.definitions.length}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Command className="rounded-md border">
                <CommandInput placeholder={`Search ${group.label.toLowerCase()} treatments...`} />
                <CommandList className="max-h-56">
                  <CommandEmpty>No treatments found</CommandEmpty>
                  {group.definitions.map((treatment) => {
                    const visual = TREATMENT_DEFINITIONS.find(
                      (item) => item.type === treatment.visualKey,
                    );
                    return (
                      <CommandItem
                        key={treatment.id}
                        value={`${treatment.displayName} ${group.label}`}
                        onSelect={() => setSelectedId(treatment.id)}
                      >
                        <span
                          className="mr-2 size-3 rounded-sm border"
                          style={{ background: visual?.color }}
                        />
                        <span className="min-w-0 flex-1 truncate">{treatment.displayName}</span>
                        {selectedId === treatment.id && <Check className="size-4" />}
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
