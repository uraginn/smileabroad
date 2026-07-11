import { useMemo, useState } from "react";
import { Check, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  FDI_LOWER,
  FDI_UPPER,
  IMPLANT_BRANDS,
  MATERIALS,
  PROCEDURES,
  planTotal,
  procedureDefinition,
} from "../core";
import { useDentalPlan } from "../hooks/use-dental-plan";
import type { DentalPlanProcedure, DentalPlanStudioProps } from "../types";

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    value,
  );

export function DentalPlanStudio({ initialValue, onChange, onSave }: DentalPlanStudioProps) {
  const { plan, update, save, hydrated, savedAt } = useDentalPlan(initialValue, onChange);
  const [selected, setSelected] = useState<number[]>([]);
  const [procedure, setProcedure] = useState<DentalPlanProcedure>("crown");
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [implantBrand, setImplantBrand] = useState(IMPLANT_BRANDS[0]);
  const [itemNotes, setItemNotes] = useState("");
  const [message, setMessage] = useState("");
  const treatmentByTooth = useMemo(() => {
    const result = new Map<number, DentalPlanProcedure>();
    plan.items.forEach((item) => item.teeth.forEach((tooth) => result.set(tooth, item.procedure)));
    return result;
  }, [plan.items]);

  if (!hydrated)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading DentalPlan Studio…
      </div>
    );

  const toggleTooth = (tooth: number) =>
    setSelected((current) =>
      current.includes(tooth) ? current.filter((value) => value !== tooth) : [...current, tooth],
    );

  const addTreatment = () => {
    if (!selected.length) {
      setMessage("Select at least one tooth first.");
      return;
    }
    const definition = procedureDefinition(procedure);
    update((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: crypto.randomUUID(),
          teeth: [...selected],
          procedure,
          material: ["crown", "pontic", "bridge", "filling"].includes(procedure)
            ? material
            : undefined,
          implantBrand: procedure === "implant" ? implantBrand : undefined,
          notes: itemNotes.trim() || undefined,
          unitPrice: definition.price,
        },
      ],
    }));
    setSelected([]);
    setItemNotes("");
    setMessage("");
  };

  const persist = () => {
    const saved = save();
    onSave?.(saved);
    setMessage("Plan saved locally.");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              SmileAbroad development tool
            </p>
            <h1 className="mt-1 text-2xl font-semibold">DentalPlan Studio</h1>
            <p className="text-sm text-muted-foreground">
              Build and save an isolated FDI dental treatment plan.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : "Not saved yet"}
            </span>
            <Button onClick={persist}>
              <Save />
              Save plan
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-6">
        {message && (
          <div role="status" className="rounded-lg border bg-card px-4 py-3 text-sm">
            {message}
          </div>
        )}
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-[minmax(0,1fr)_160px]">
            <label className="space-y-1.5 text-sm font-medium">
              Patient name
              <Input
                value={plan.patientName}
                onChange={(event) =>
                  update((current) => ({ ...current, patientName: event.target.value }))
                }
                placeholder="Optional patient name"
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Currency
              <Select
                value={plan.currency}
                onValueChange={(value) =>
                  update((current) => ({ ...current, currency: value as typeof plan.currency }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["EUR", "USD", "GBP", "TRY"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>FDI dental chart</CardTitle>
                <CardDescription>
                  Select one or more teeth, then assign a procedure.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-[680px] space-y-5 py-2">
                  <ToothRow
                    label="Upper arch"
                    teeth={FDI_UPPER}
                    selected={selected}
                    treatments={treatmentByTooth}
                    onToggle={toggleTooth}
                  />
                  <div className="border-t border-dashed" />
                  <ToothRow
                    label="Lower arch"
                    teeth={FDI_LOWER}
                    selected={selected}
                    treatments={treatmentByTooth}
                    onToggle={toggleTooth}
                  />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelected(FDI_UPPER)}>
                    Select upper
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelected(FDI_LOWER)}>
                    Select lower
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                    <RotateCcw />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Treatment items</CardTitle>
                <CardDescription>
                  {plan.items.length
                    ? `${plan.items.length} planned item${plan.items.length === 1 ? "" : "s"}.`
                    : "No treatment has been added yet."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">
                        {procedureDefinition(item.procedure).label} · {item.teeth.join(", ")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[item.material, item.implantBrand, item.notes]
                          .filter(Boolean)
                          .join(" · ") || "No additional details"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        {money(item.unitPrice * Math.max(item.teeth.length, 1), plan.currency)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Remove treatment"
                        onClick={() =>
                          update((current) => ({
                            ...current,
                            items: current.items.filter((entry) => entry.id !== item.id),
                          }))
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end border-t pt-4 text-lg font-semibold">
                  Total: {money(planTotal(plan), plan.currency)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Assign procedure</CardTitle>
                <CardDescription>
                  {selected.length
                    ? `Selected teeth: ${selected.join(", ")}`
                    : "Select teeth from the chart."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="space-y-1.5 text-sm font-medium">
                  Procedure
                  <Select
                    value={procedure}
                    onValueChange={(value) => setProcedure(value as DentalPlanProcedure)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROCEDURES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                {["crown", "pontic", "bridge", "filling"].includes(procedure) && (
                  <label className="space-y-1.5 text-sm font-medium">
                    Material
                    <Select value={material} onValueChange={setMaterial}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATERIALS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}
                {procedure === "implant" && (
                  <label className="space-y-1.5 text-sm font-medium">
                    Implant brand
                    <Select value={implantBrand} onValueChange={setImplantBrand}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMPLANT_BRANDS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}
                <label className="space-y-1.5 text-sm font-medium">
                  Item notes
                  <Textarea
                    value={itemNotes}
                    onChange={(event) => setItemNotes(event.target.value)}
                    placeholder="Clinical note for this item"
                  />
                </label>
                <Button className="w-full" onClick={addTreatment} disabled={!selected.length}>
                  <Plus />
                  Add treatment
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visits and stages</CardTitle>
                <CardDescription>Group treatment delivery into simple visits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.stages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                      {stage.visit}
                    </span>
                    <Input
                      aria-label={`Stage ${index + 1} name`}
                      value={stage.name}
                      onChange={(event) =>
                        update((current) => ({
                          ...current,
                          stages: current.stages.map((entry) =>
                            entry.id === stage.id ? { ...entry, name: event.target.value } : entry,
                          ),
                        }))
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove stage"
                      onClick={() =>
                        update((current) => ({
                          ...current,
                          stages: current.stages.filter((entry) => entry.id !== stage.id),
                        }))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      stages: [
                        ...current.stages,
                        {
                          id: crypto.randomUUID(),
                          name: `Treatment stage ${current.stages.length + 1}`,
                          visit: current.stages.length + 1,
                        },
                      ],
                    }))
                  }
                >
                  <Plus />
                  Add stage
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={5}
                  value={plan.notes}
                  onChange={(event) =>
                    update((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="General treatment-plan notes"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function ToothRow({
  label,
  teeth,
  selected,
  treatments,
  onToggle,
}: {
  label: string;
  teeth: number[];
  selected: number[];
  treatments: Map<number, DentalPlanProcedure>;
  onToggle: (tooth: number) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex justify-center gap-1">
        {teeth.map((tooth) => {
          const treatment = treatments.get(tooth);
          const definition = treatment ? procedureDefinition(treatment) : undefined;
          const active = selected.includes(tooth);
          return (
            <button
              key={tooth}
              type="button"
              aria-label={`Tooth ${tooth}${treatment ? `, ${definition?.label}` : ""}`}
              aria-pressed={active}
              onClick={() => onToggle(tooth)}
              className={cn(
                "relative flex h-16 w-10 shrink-0 flex-col items-center justify-center rounded-lg border text-xs font-semibold transition hover:-translate-y-0.5 hover:border-primary",
                active && "ring-2 ring-primary ring-offset-2",
                !treatment && "bg-card",
              )}
              style={
                definition
                  ? { backgroundColor: `${definition.color}20`, borderColor: definition.color }
                  : undefined
              }
            >
              {active && <Check className="absolute right-0.5 top-0.5 size-3" />}
              <span>{tooth}</span>
              {definition && (
                <span
                  className="mt-1 h-2 w-5 rounded-full"
                  style={{ backgroundColor: definition.color }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
