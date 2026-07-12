import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { PageHeader, PageLoading, StatusBadge } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useMemo, useState, type ReactNode } from "react";
import {
  Trash2,
  ExternalLink,
  FileText,
  Building2,
  UserRound,
  Plus,
  ArrowUp,
  ArrowDown,
  LockKeyhole,
  Eye,
} from "lucide-react";
import type { TreatmentPlanItem, TreatmentStage, ToothTreatment } from "@/types/models";
import { useAuth } from "@/lib/auth/mock-auth";
import { formatQuoteMoney } from "@/lib/quote";
import { isQuotePubliclyViewable } from "@/lib/quote-visibility";

export const Route = createFileRoute("/pro/treatment-plans/$id")({ component: PlanEditor });

function PlanEditor() {
  const { id } = Route.useParams();
  const activeUser = useAuth((s) => s.user);
  const navigate = useNavigate();
  const hydrated = useMockStoreHydrated();
  const plan = useMockStore((s) =>
    s.treatmentPlans.find((t) => t.id === id && t.clinic_id === activeUser?.clinic_id),
  );
  const clinic = useMockStore((s) => s.clinics.find((item) => item.id === plan?.clinic_id));
  const patient = useMockStore((s) =>
    s.patients.find(
      (item) => item.id === plan?.clinic_patient_id && item.clinic_id === plan?.clinic_id,
    ),
  );
  const existingQuote = useMockStore((s) =>
    s.quotes.find((q) => q.treatment_plan_id === id && q.clinic_id === activeUser?.clinic_id),
  );
  const update = useMockStore((s) => s.updateTreatmentPlan);
  const users = useMockStore((s) => s.users);
  const clinicUsers = useMemo(
    () => users.filter((user) => user.clinic_id === activeUser?.clinic_id),
    [users, activeUser?.clinic_id],
  );
  const addQuote = useMockStore((s) => s.addQuote);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  if (!hydrated) return <PageLoading label="Loading treatment plan" />;
  if (!plan) throw notFound();

  const actorId = activeUser?.clinic_id === plan.clinic_id ? activeUser.id : "system";
  const canApprove = ["dentist", "clinic_owner", "clinic_admin"].includes(activeUser?.role ?? "");
  const dentists = clinicUsers.filter((user) => user.role === "dentist");
  const coordinators = clinicUsers.filter((user) =>
    ["coordinator", "clinic_owner", "clinic_admin"].includes(user.role),
  );

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
  const updateStage = (index: number, patch: Partial<TreatmentStage>) => {
    const stages = [...(plan.treatment_stages ?? [])];
    stages[index] = { ...stages[index], ...patch };
    update(plan.id, { treatment_stages: stages }, actorId);
  };
  const addStage = () => {
    const stages = plan.treatment_stages ?? [];
    update(
      plan.id,
      {
        treatment_stages: [
          ...stages,
          { stage_number: stages.length + 1, title: `Stage ${stages.length + 1}`, procedures: [] },
        ],
      },
      actorId,
    );
  };
  const removeStage = (index: number) => {
    update(
      plan.id,
      {
        treatment_stages: (plan.treatment_stages ?? [])
          .filter((_, itemIndex) => itemIndex !== index)
          .map((stage, itemIndex) => ({ ...stage, stage_number: itemIndex + 1 })),
      },
      actorId,
    );
  };
  const moveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    const stages = [...(plan.treatment_stages ?? [])];
    if (target < 0 || target >= stages.length) return;
    [stages[index], stages[target]] = [stages[target], stages[index]];
    update(
      plan.id,
      {
        treatment_stages: stages.map((stage, itemIndex) => ({
          ...stage,
          stage_number: itemIndex + 1,
        })),
      },
      actorId,
    );
  };
  const total = plan.items.reduce((s, i) => s + i.unit_price, 0);
  const changeStatus = (status: "draft" | "awaiting_doctor_review" | "approved") =>
    update(plan.id, { status }, actorId);
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
          label: `Tooth ${item.tooth} Â· ${treatmentLabel(item.treatment)}${item.material ? ` (${item.material})` : ""}`,
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
            {existingQuote?.share_token ? (
              <Button asChild variant="outline">
                <Link
                  to="/shared/treatment-plan/$token"
                  params={{ token: existingQuote.share_token }}
                  search={
                    isQuotePubliclyViewable(existingQuote.status)
                      ? { preview: false }
                      : { preview: true }
                  }
                >
                  <ExternalLink className="size-4 mr-1" />
                  {isQuotePubliclyViewable(existingQuote.status) ? "View shared" : "Preview shared"}
                </Link>
              </Button>
            ) : existingQuote ? (
              <Button
                type="button"
                variant="outline"
                disabled
                title="Open the quote to prepare its shared link"
              >
                <ExternalLink className="size-4 mr-1" /> Preview shared
              </Button>
            ) : null}
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
          <Meta label="Updated" value={new Date(plan.updated_at).toLocaleString()} />
          <Meta label="Save state" value="Saved" />
          <div className="sm:col-span-2 lg:col-span-4">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              Status <StatusBadge status={plan.status} />
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-semibold">Plan workflow</h3>
              <p className="text-xs text-muted-foreground">
                Clinic-only metadata and approval status.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(plan.status ?? "draft") === "draft" && (
                <Button size="sm" onClick={() => changeStatus("awaiting_doctor_review")}>
                  Send for Doctor Review
                </Button>
              )}
              {(plan.status ?? "draft") === "awaiting_doctor_review" && canApprove && (
                <Button size="sm" onClick={() => changeStatus("approved")}>
                  Approve Plan
                </Button>
              )}
              {(plan.status ?? "draft") !== "draft" && (
                <Button size="sm" variant="outline" onClick={() => changeStatus("draft")}>
                  Return to Draft
                </Button>
              )}
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={plan.status ?? "draft"}
                onValueChange={(value) =>
                  update(plan.id, { status: value as NonNullable<typeof plan.status> }, actorId)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="awaiting_doctor_review">Awaiting Doctor Review</SelectItem>
                  {(canApprove || plan.status === "approved") && (
                    <SelectItem value="approved">Approved</SelectItem>
                  )}
                  <SelectItem value="sent_to_patient">Sent to Patient</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dentist</Label>
              <Select
                value={plan.dentist_id ?? "unassigned"}
                onValueChange={(value) =>
                  update(
                    plan.id,
                    { dentist_id: value === "unassigned" ? undefined : value },
                    actorId,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Not assigned</SelectItem>
                  {dentists.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Coordinator</Label>
              <Select
                value={plan.coordinator_id ?? "unassigned"}
                onValueChange={(value) =>
                  update(
                    plan.id,
                    { coordinator_id: value === "unassigned" ? undefined : value },
                    actorId,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Not assigned</SelectItem>
                  {coordinators.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Visits</Label>
              <Input
                type="number"
                min={1}
                value={plan.visits}
                onChange={(event) =>
                  update(plan.id, { visits: Math.max(1, Number(event.target.value) || 1) }, actorId)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-5">
          <SectionHeading
            icon={<Eye className="size-4" />}
            title="Clinical overview"
            description="Patient-facing content included in the clinic care plan."
          />
          <div className="grid lg:grid-cols-2 gap-4">
            <Field label="Treatment plan title">
              <Input
                value={plan.title}
                onChange={(event) => update(plan.id, { title: event.target.value }, actorId)}
              />
            </Field>
            <Field label="Clinical case summary">
              <Textarea
                rows={4}
                value={plan.clinical_summary ?? ""}
                onChange={(event) =>
                  update(plan.id, { clinical_summary: event.target.value }, actorId)
                }
                placeholder="Explain the case in patient-friendly clinical language"
              />
            </Field>
            <Field label="Clinical findings">
              <Textarea
                rows={4}
                value={(plan.clinical_findings ?? []).join("\n")}
                onChange={(event) =>
                  update(plan.id, { clinical_findings: splitLines(event.target.value) }, actorId)
                }
                placeholder="One patient-facing finding per line"
              />
            </Field>
            <Field label="Treatment objectives">
              <Textarea
                rows={4}
                value={(plan.treatment_objectives ?? []).join("\n")}
                onChange={(event) =>
                  update(plan.id, { treatment_objectives: splitLines(event.target.value) }, actorId)
                }
                placeholder="One objective per line"
              />
            </Field>
            <Field label="Patient-facing explanation">
              <Textarea
                rows={4}
                value={plan.patient_facing_notes ?? ""}
                onChange={(event) =>
                  update(plan.id, { patient_facing_notes: event.target.value }, actorId)
                }
                placeholder="What the patient should understand about the proposed plan"
              />
            </Field>
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
                  <span className="text-xs text-muted-foreground">
                    {formatQuoteMoney(i.unit_price, "EUR")}
                  </span>
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
              <span className="font-display font-semibold">{formatQuoteMoney(total, "EUR")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeading
              title="Treatment stages"
              description="Ordered, patient-facing visits and treatment phases."
            />
            <Button size="sm" variant="outline" onClick={addStage}>
              <Plus className="size-4 mr-1" /> Add stage
            </Button>
          </div>
          {(plan.treatment_stages ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              No treatment stages added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {(plan.treatment_stages ?? []).map((stage, index) => (
                <div
                  key={`${stage.stage_number}-${index}`}
                  className="rounded-lg border p-4 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary">Stage {index + 1}</Badge>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => moveStage(index, -1)}
                        aria-label="Move stage up"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={index === (plan.treatment_stages?.length ?? 0) - 1}
                        onClick={() => moveStage(index, 1)}
                        aria-label="Move stage down"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeStage(index)}
                        aria-label="Remove stage"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Title">
                      <Input
                        value={stage.title}
                        onChange={(event) => updateStage(index, { title: event.target.value })}
                      />
                    </Field>
                    <Field label="Expected stay or duration">
                      <Input
                        value={stage.duration_or_stay ?? ""}
                        onChange={(event) =>
                          updateStage(index, { duration_or_stay: event.target.value })
                        }
                        placeholder="e.g. 4 days"
                      />
                    </Field>
                    <Field label="Description">
                      <Textarea
                        rows={3}
                        value={stage.description ?? ""}
                        onChange={(event) =>
                          updateStage(index, { description: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Procedures">
                      <Textarea
                        rows={3}
                        value={stage.procedures.join("\n")}
                        onChange={(event) =>
                          updateStage(index, { procedures: splitLines(event.target.value) })
                        }
                        placeholder="One procedure per line"
                      />
                    </Field>
                    <Field label="Healing period after stage">
                      <Input
                        value={stage.healing_period_after ?? ""}
                        onChange={(event) =>
                          updateStage(index, { healing_period_after: event.target.value })
                        }
                        placeholder="e.g. 10â€“12 weeks"
                      />
                    </Field>
                    <Field label="Patient instructions">
                      <Textarea
                        rows={3}
                        value={stage.patient_instructions ?? ""}
                        onChange={(event) =>
                          updateStage(index, { patient_instructions: event.target.value })
                        }
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <SectionHeading
              title="Materials and treatment details"
              description="Patient-facing materials, systems and temporary treatment."
            />
            <Field label="Materials">
              <Textarea
                rows={4}
                value={(plan.materials ?? []).join("\n")}
                onChange={(event) =>
                  update(plan.id, { materials: splitLines(event.target.value) }, actorId)
                }
                placeholder="One material per line"
              />
            </Field>
            <Field label="Implant systems">
              <Textarea
                rows={3}
                value={(plan.implant_systems ?? []).join("\n")}
                onChange={(event) =>
                  update(plan.id, { implant_systems: splitLines(event.target.value) }, actorId)
                }
                placeholder="One system per line"
              />
            </Field>
            <Field label="Temporary solution">
              <Textarea
                rows={3}
                value={plan.temporary_solution ?? ""}
                onChange={(event) =>
                  update(plan.id, { temporary_solution: event.target.value }, actorId)
                }
              />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <SectionHeading
              title="Alternatives, risks and exclusions"
              description="Patient-facing considerations for informed review."
            />
            <Field label="Treatment alternatives">
              <Textarea
                rows={3}
                value={(plan.alternatives ?? []).join("\n")}
                onChange={(event) =>
                  update(plan.id, { alternatives: splitLines(event.target.value) }, actorId)
                }
                placeholder="One alternative per line"
              />
            </Field>
            <Field label="Clinical considerations and risks">
              <Textarea
                rows={3}
                value={(plan.risks ?? []).join("\n")}
                onChange={(event) =>
                  update(plan.id, { risks: splitLines(event.target.value) }, actorId)
                }
                placeholder="One consideration per line"
              />
            </Field>
            <Field label="Exclusions">
              <Textarea
                rows={3}
                value={(plan.exclusions ?? []).join("\n")}
                onChange={(event) =>
                  update(plan.id, { exclusions: splitLines(event.target.value) }, actorId)
                }
                placeholder="One exclusion per line"
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <SectionHeading
            title="Visits and healing"
            description="Overall timing estimates for the proposed care plan."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Expected visit count">
              <Input
                type="number"
                min={1}
                value={plan.visits}
                onChange={(event) =>
                  update(plan.id, { visits: Math.max(1, Number(event.target.value) || 1) }, actorId)
                }
              />
            </Field>
            <Field label="Healing interval (weeks)">
              <Input
                type="number"
                min={0}
                value={plan.healing_weeks}
                onChange={(event) =>
                  update(
                    plan.id,
                    { healing_weeks: Math.max(0, Number(event.target.value) || 0) },
                    actorId,
                  )
                }
              />
            </Field>
            <Field label="Total estimated stay">
              <Input
                value={plan.estimated_stay ?? ""}
                onChange={(event) =>
                  update(plan.id, { estimated_stay: event.target.value }, actorId)
                }
                placeholder="e.g. 7â€“10 days"
              />
            </Field>
            <Field label="Timeline description">
              <Input
                value={plan.treatment_timeline ?? ""}
                onChange={(event) =>
                  update(plan.id, { treatment_timeline: event.target.value }, actorId)
                }
                placeholder="e.g. Two visits over 4 months"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <SectionHeading
            icon={<LockKeyhole className="size-4" />}
            title="Internal clinic notes"
            description="Clinic staff only. Never included in the patient-facing care plan or quote."
          />
          <div className="grid lg:grid-cols-2 gap-4">
            <Field label="Internal clinical notes">
              <Textarea
                rows={5}
                value={plan.internal_clinical_notes ?? ""}
                onChange={(event) =>
                  update(plan.id, { internal_clinical_notes: event.target.value }, actorId)
                }
                placeholder="Doctor-only observations and private clinical discussion"
              />
            </Field>
            <Field label="Legacy approval / clinical notes">
              <Textarea
                rows={5}
                value={plan.clinical_notes ?? ""}
                onChange={(event) =>
                  update(plan.id, { clinical_notes: event.target.value }, actorId)
                }
                placeholder="Internal workflow and approval notes"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

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
              <Label>Unit price (â‚¬)</Label>
              <Input
                type="number"
                value={activeItem?.unit_price ?? 0}
                onChange={(e) => setItemForTooth(selectedTooth!, { unit_price: +e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Patient-facing item note</Label>
              <Textarea
                value={activeItem?.patient_facing_note ?? activeItem?.notes ?? ""}
                onChange={(e) =>
                  setItemForTooth(selectedTooth!, { patient_facing_note: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
              <Label>Internal item note</Label>
              <Textarea
                value={activeItem?.internal_note ?? ""}
                onChange={(e) => setItemForTooth(selectedTooth!, { internal_note: e.target.value })}
                placeholder="Clinic-only note"
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SectionHeading({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display font-semibold flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
