import { useMemo } from "react";
import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
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
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Treatment controls</p>
        <p className="text-xs text-muted-foreground">
          Choose a category and search the treatment registry.
        </p>
      </div>
      <Accordion type="single" collapsible className="border-y px-1">
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
                    const relationship = treatmentRelationship(treatment.baseTreatmentKey);
                    const displayName =
                      treatment.baseTreatmentKey === "implant-crown"
                        ? "Implant + Final Crown"
                        : treatment.displayName;
                    const subtitle =
                      treatment.baseTreatmentKey === "implant-crown"
                        ? "Completes the implant site and adds the implant when needed"
                        : relationship.role.replace(/-/g, " ");
                    return (
                      <CommandItem
                        key={treatment.id}
                        value={`${displayName} ${treatment.displayName} ${group.label} ${subtitle}`}
                        onSelect={() => onSelect(treatment.id)}
                      >
                        <span
                          className="mr-3 flex size-8 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold"
                          style={{
                            borderColor: visual?.color,
                            color: visual?.color,
                            backgroundColor: `${visual?.color ?? "#64748b"}18`,
                          }}
                        >
                          {visual?.short ?? "?"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{displayName}</span>
                          <span className="block truncate text-xs capitalize text-muted-foreground">
                            {subtitle}
                          </span>
                        </span>
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
