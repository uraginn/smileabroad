import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DentalDiagram } from "@/components/dental-diagram";
import { TREATMENT_OPTIONS, treatmentLabel } from "@/lib/dental";
import { Sheet, SheetContent, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, type ReactNode } from "react";
import { Trash2, ExternalLink, FileText, Building2, UserRound } from "lucide-react";
import type { TreatmentPlanItem, ToothTreatment } from "@/types/models";

export const Route = createFileRoute("/pro/treatment-plans/$id")({ component: PlanEditor });

function PlanEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useMockStoreHydrated();
  const plan = useMockStore((s) => s.treatmentPlans.find((t) => t.id === id));
  const clinic = useMockStore((s) => s.clinics.find((item) => item.id === plan?.clinic_id));
  const patient = useMockStore((s) =>
    s.patients.find((item) => item.id === plan?.clinic_patient_id),
  );
  const existingQuote = useMockStore((s) => s.quotes.find((q) => q.treatment_plan_id === id));
  const update = useMockStore((s) => s.updateTreatmentPlan);
  const addQuote = useMockStore((s) => s.addQuote);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  if (!hydrated) return null;
  if (!plan) throw notFound();

  const activeItem = plan.items.find((i) => i.tooth === selectedTooth);
  const setItemForTooth = (t: number, patch: Partial<TreatmentPlanItem>) => {
    const items = plan.items.some((i) => i.tooth === t)
      ? plan.items.map((i) => (i.tooth === t ? { ...i, ...patch } : i))
      : [
          ...plan.items,
          {
            id: `tpi_${t}_${Date.now()}`,
            tooth: t,
            treatment: (patch.treatment ?? "crown") as ToothTreatment,
            unit_price: patch.unit_price ?? 0,
          },
        ];
    update(plan.id, { items });
  };
  const removeItem = (t: number) => {
    update(plan.id, { items: plan.items.filter((i) => i.tooth !== t) });
    setSelectedTooth(null);
  };
  const total = plan.items.reduce((s, i) => s + i.unit_price, 0);
  const openOrCreateQuote = () => {
    const quote =
      existingQuote ??
      addQuote({
        clinic_id: plan.clinic_id,
        patient_user_id: plan.patient_user_id,
        clinic_patient_id: plan.clinic_patient_id,
        treatment_plan_id: plan.id,
        currency: "EUR",
        items: plan.items.map((item) => ({
          id: `qi_${item.id}`,
          label: `Tooth ${item.tooth} · ${treatmentLabel(item.treatment)}${item.material ? ` (${item.material})` : ""}`,
          qty: 1,
          unit_price: item.unit_price,
        })),
        hotel_total: 0,
        transfer_total: 0,
        discount: 0,
        payment_schedule: [],
        notes: plan.summary,
        status: "draft",
      });
    navigate({ to: "/pro/quotes/$id", params: { id: quote.id } });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl space-y-4">
      <PageHeader
        title={plan.title}
        description={plan.summary}
        actions={
          <>
            <Button
              onClick={openOrCreateQuote}
              disabled={!existingQuote && plan.items.length === 0}
            >
              <FileText className="size-4 mr-1" /> {existingQuote ? "Open quote" : "Create quote"}
            </Button>
            {plan.share_token && (
              <Button asChild variant="outline">
                <Link to="/shared/treatment-plan/$token" params={{ token: plan.share_token }}>
                  <ExternalLink className="size-4 mr-1" /> View shared
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Meta
            label="Clinic"
            value={clinic?.name ?? plan.clinic_id}
            icon={<Building2 className="size-4" />}
          />
          <Meta
            label="Patient"
            value={patient ? `${patient.first_name} ${patient.last_name}` : "Not linked"}
            icon={<UserRound className="size-4" />}
          />
          <Meta label="Visits" value={`${plan.visits}`} />
          <Meta label="Healing" value={`${plan.healing_weeks} weeks`} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Badge variant="secondary" className="capitalize">
              Status: {plan.status ?? "draft"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-display font-semibold">Planner workspace (FDI chart)</h3>
              <Badge variant="outline">Select a tooth to edit</Badge>
            </div>
            <DentalDiagram
              items={plan.items}
              selected={selectedTooth ?? undefined}
              onSelect={(t) => setSelectedTooth(t)}
            />
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-medium mb-2">Legend</p>
              <div className="flex flex-wrap gap-2">
                {TREATMENT_OPTIONS.map((o) => (
                  <span key={o.value} className="inline-flex items-center gap-1.5 text-xs">
                    <span className="size-3 rounded" style={{ background: o.color }} />
                    {o.label}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="xl:col-span-4">
          <CardContent className="p-6 space-y-3">
            <h3 className="font-display font-semibold">Treatment items</h3>
            {plan.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Click a tooth to add a treatment.</p>
            ) : (
              plan.items.map((i) => (
                <div key={i.id} className="flex items-center gap-2 p-2 rounded border">
                  <Badge variant="secondary">{i.tooth}</Badge>
                  <span className="text-sm flex-1">{treatmentLabel(i.treatment)}</span>
                  <span className="text-xs text-muted-foreground">€{i.unit_price}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeItem(i.tooth)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Selected tooth: {selectedTooth ?? "None"}</p>
              <p>Total items: {plan.items.length}</p>
            </div>
            <div className="pt-1 border-t flex justify-between">
              <span className="font-medium">Total</span>
              <span className="font-display font-semibold">€{total.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={selectedTooth !== null} onOpenChange={(o) => !o && setSelectedTooth(null)}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>Tooth {selectedTooth}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4 px-4">
            <div className="space-y-2">
              <Label>Treatment</Label>
              <Select
                value={activeItem?.treatment ?? ""}
                onValueChange={(v) =>
                  setItemForTooth(selectedTooth!, { treatment: v as ToothTreatment })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select treatment" />
                </SelectTrigger>
                <SelectContent>
                  {TREATMENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material / brand</Label>
              <Input
                value={activeItem?.material ?? ""}
                onChange={(e) => setItemForTooth(selectedTooth!, { material: e.target.value })}
                placeholder="e.g. Straumann, Emax"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit price (€)</Label>
              <Input
                type="number"
                value={activeItem?.unit_price ?? 0}
                onChange={(e) => setItemForTooth(selectedTooth!, { unit_price: +e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={activeItem?.notes ?? ""}
                onChange={(e) => setItemForTooth(selectedTooth!, { notes: e.target.value })}
              />
            </div>
            {activeItem && (
              <Button variant="destructive" onClick={() => removeItem(selectedTooth!)}>
                <Trash2 className="size-4 mr-1" /> Remove
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Meta({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border p-3 bg-surface/50">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium mt-1">{value}</p>
    </div>
  );
}
