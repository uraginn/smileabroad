import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCombobox } from "./CountryCombobox";
import { TravelServicesStep } from "./TravelServicesStep";
import { PricingStep } from "./PricingStep";
import { FinalReviewStep } from "./FinalReviewStep";
import { TreatmentPlanner } from "./TreatmentPlanner";
import { DentalChart } from "./DentalChart";
import type {
  DentalPlan,
  DentalPlanStudioProps,
  EffectiveTreatmentDefinition,
} from "../types/dental-plan.types";
import { TREATMENT_DEFINITIONS } from "../data/treatmentDefinitions";
import { createDentalPlan } from "../utils/createDentalPlan";
import { LocalStorageDentalPlanRepository } from "../adapters/LocalStorageDentalPlanRepository";
import { useAutoSave } from "../hooks/useAutoSave";
import { toast } from "sonner";
import { validatePlanForFinalize } from "../rules/clinicalRules";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
const STEPS = [
  "Patient & Case Information",
  "Clinical Planning",
  "Travel, Visits & Services",
  "Pricing & Commercial Details",
  "Review & Finalize",
];
export function DentalPlanStudio(props: DentalPlanStudioProps) {
  const repository = useMemo(() => new LocalStorageDentalPlanRepository(), []);
  const [plan, setPlan] = useState<DentalPlan | null>(null);
  const initialRef = useRef(props.initialValue);
  useEffect(
    () =>
      setPlan(
        initialRef.current ?? repository.getPlan() ?? createDentalPlan({ name: "Demo Plan" }),
      ),
    [repository],
  );
  if (!plan)
    return <div className="flex min-h-screen items-center justify-center">Loading planner…</div>;
  return <PlannerShell plan={plan} setPlan={setPlan} repository={repository} {...props} />;
}
function PlannerShell({
  plan,
  setPlan,
  repository,
  onChange,
  onSave,
  onFinalize,
  onSaveAsTemplate,
  readOnly,
  context,
  clinicUsers = [],
  treatmentDefaults = [],
  hotels = [],
  templates = [],
}: {
  plan: DentalPlan;
  setPlan: (plan: DentalPlan) => void;
  repository: LocalStorageDentalPlanRepository;
} & DentalPlanStudioProps) {
  const { lastSavedAt, saving } = useAutoSave(plan, repository);
  const effectiveTreatments = useMemo<EffectiveTreatmentDefinition[]>(() => {
    const system = TREATMENT_DEFINITIONS.flatMap((base) => {
      const override = treatmentDefaults.find(
        (item) => item.system !== false && item.treatmentKey === base.type,
      );
      if (override && !override.active) return [];
      return [
        {
          id: override?.id ?? `system_${base.type}`,
          treatmentKey: override?.treatmentKey ?? base.type,
          displayName: override?.displayName ?? base.label,
          category: override?.category ?? "System",
          baseTreatmentKey: override?.baseTreatmentKey ?? base.type,
          visualKey: override?.visualKey ?? base.type,
          perTooth: override?.perTooth ?? base.perTooth,
          system: true,
          prices: override?.prices ?? {},
        },
      ];
    });
    const custom = treatmentDefaults
      .filter((item) => item.system === false && item.active)
      .map((item) => ({
        id: item.id ?? item.treatmentKey,
        treatmentKey: item.treatmentKey,
        displayName: item.displayName,
        category: item.category ?? "Clinic custom",
        baseTreatmentKey: item.baseTreatmentKey ?? "other",
        visualKey: item.visualKey ?? item.baseTreatmentKey ?? "other",
        perTooth: item.perTooth ?? true,
        system: false,
        prices: item.prices,
      }));
    return [...system, ...custom];
  }, [treatmentDefaults]);
  const [finalizing, setFinalizing] = useState(false);
  const [result, setResult] = useState("");
  const [pendingTemplateId, setPendingTemplateId] = useState<string>();
  const [templateNameOpen, setTemplateNameOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const change = (patch: Partial<DentalPlan>) =>
    setPlan({ ...plan, ...patch, updatedAt: new Date().toISOString() });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => onChangeRef.current?.(plan), [plan]);
  const step = Math.max(0, Math.min(4, plan.draftStep));
  const applyTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    const source = createDentalPlan(template.planData);
    setPlan({
      ...plan,
      currentConditions: source.currentConditions,
      proposedTreatments: source.proposedTreatments,
      treatmentGroups: source.treatmentGroups,
      planningPreferences: source.planningPreferences,
      travel: {
        ...plan.travel,
        selectedHotelId: source.travel.selectedHotelId,
        hotelIncluded: source.travel.hotelIncluded,
        hotelRequired: source.travel.hotelRequired,
        hotelNights: source.travel.hotelNights,
        roomType: source.travel.roomType,
        boardType: source.travel.boardType,
        airportTransfer: source.travel.airportTransfer,
        localTransfer: source.travel.localTransfer,
        flightIncluded: source.travel.flightIncluded,
        includedServices: source.travel.includedServices,
      },
      commercial: { ...plan.commercial, items: source.commercial.items },
      updatedAt: new Date().toISOString(),
    });
    toast.success(`${template.name} applied`);
  };
  const requestTemplate = (templateId: string) => {
    const hasPlanningData =
      Object.keys(plan.currentConditions).length > 0 || plan.proposedTreatments.length > 0;
    if (hasPlanningData) setPendingTemplateId(templateId);
    else applyTemplate(templateId);
  };
  const save = () => {
    repository.savePlan(plan);
    onSave?.(plan);
    setResult("Draft saved.");
  };
  const finalize = async () => {
    const hardConflicts = validatePlanForFinalize(plan);
    if (hardConflicts.length) {
      setResult(`Resolve before finalizing: ${hardConflicts.join(" ")}`);
      return;
    }
    if (context?.mode !== "crm" || !onFinalize) {
      const finalizedPlan = { ...plan, finalized: true, updatedAt: new Date().toISOString() };
      setPlan(finalizedPlan);
      repository.savePlan(finalizedPlan);
      onSave?.(finalizedPlan);
      setResult("Standalone review finalized locally. No CRM record was created.");
      return;
    }
    setFinalizing(true);
    try {
      const ids = await onFinalize({ ...plan, finalized: true });
      change({ finalized: true });
      toast.success("Treatment plan finalized");
      setResult(
        `Treatment plan ${ids.treatmentPlanId} saved.${ids.legacyQuoteId ? " Opening legacy quote…" : ""}`,
      );
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Finalization failed.");
    } finally {
      setFinalizing(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold">Dental Treatment Planner</h1>
            <p className="text-sm text-muted-foreground">
              {context?.mode === "crm"
                ? "CRM-connected clinical workflow"
                : context?.mode === "template"
                  ? "Clinic template editor · patient data excluded"
                  : "Standalone development workflow"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {saving
                ? "Saving…"
                : lastSavedAt
                  ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                  : "Not saved"}
            </span>
            <Button variant="outline" onClick={save}>
              Save draft
            </Button>
            {context?.mode === "crm" && onSaveAsTemplate && (
              <Button variant="outline" onClick={() => setTemplateNameOpen(true)}>
                Save as template
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} aria-label="Planner progress" />
          <Tabs
            value={String(step)}
            onValueChange={(value) => change({ draftStep: Number(value) })}
          >
            <TabsList className="h-auto w-full justify-start overflow-x-auto">
              {STEPS.map((label, index) => (
                <TabsTrigger key={label} value={String(index)} className="min-w-44">
                  <span className="mr-2 font-semibold">{index + 1}</span>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {result && (
          <div role="status" className="rounded-lg border bg-card p-3 text-sm">
            {result}
          </div>
        )}
        <AlertDialog
          open={!!pendingTemplateId}
          onOpenChange={(open) => !open && setPendingTemplateId(undefined)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace current planning data?</AlertDialogTitle>
              <AlertDialogDescription>
                The selected template will replace the current diagram, treatments and linked
                groups. Patient identity, medical data and CRM references will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingTemplateId) applyTemplate(pendingTemplateId);
                  setPendingTemplateId(undefined);
                }}
              >
                Apply template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={templateNameOpen} onOpenChange={setTemplateNameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as template</DialogTitle>
            </DialogHeader>
            <Input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Template name"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTemplateNameOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const name = templateName.trim();
                  if (!name || !onSaveAsTemplate) return;
                  onSaveAsTemplate(plan, name);
                  toast.success("Template saved");
                  setTemplateName("");
                  setTemplateNameOpen(false);
                }}
              >
                Save template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {step === 0 && (
          <>
            {context?.mode !== "template" && templates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Choose a clinic template</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-w-xl">
                    <Combobox
                      options={templates.map((template) => ({
                        value: template.id,
                        label: `${template.name} · ${template.category} · ${template.planData.proposedTreatments.length} treatments`,
                      }))}
                      onValueChange={requestTemplate}
                      placeholder="Select a reusable template"
                      searchPlaceholder="Search templates..."
                      emptyText="No templates found"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            {context?.mode === "template" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Template mode</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Patient identity, contact, assessment and medical data are never stored in
                  templates. Continue to Clinical Planning to edit the reusable diagram.
                </CardContent>
              </Card>
            ) : (
              <PatientStep plan={plan} change={change} clinicUsers={clinicUsers} />
            )}
          </>
        )}{" "}
        {step === 1 && (
          <TreatmentPlanner
            value={plan}
            onChange={setPlan}
            readOnly={readOnly}
            definitions={effectiveTreatments}
          />
        )}{" "}
        {step === 2 && <TravelServicesStep plan={plan} change={change} hotels={hotels} />}{" "}
        {step === 3 && (
          <PricingStep plan={plan} change={change} treatmentDefaults={treatmentDefaults} />
        )}
        {step === 4 && <FinalReviewStep plan={plan} hotels={hotels} />}
        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => change({ draftStep: step - 1 })}
          >
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={() => change({ draftStep: step + 1 })}>Continue</Button>
          ) : context?.mode === "template" ? (
            <Button onClick={save}>Save template</Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={finalizing || !plan.proposedTreatments.length}>
                  {finalizing ? "Finalizing…" : "Finalize and open quote"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalize this clinical plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This saves the existing CRM Treatment Plan and creates or updates its linked
                    Quote.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={finalize}>Finalize and open quote</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </main>
    </div>
  );
}
function PatientStep({
  plan,
  change,
  clinicUsers,
}: {
  plan: DentalPlan;
  change: (patch: Partial<DentalPlan>) => void;
  clinicUsers: Array<{ id: string; name: string; role: string }>;
}) {
  const update = (patch: Partial<DentalPlan["patient"]>) =>
    change({
      patient: { ...plan.patient, ...patch },
      patientName: patch.fullName ?? plan.patientName,
    });
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Patient identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="First name">
            <Input
              value={plan.patient.firstName}
              onChange={(e) =>
                update({
                  firstName: e.target.value,
                  fullName: `${e.target.value} ${plan.patient.lastName}`.trim(),
                })
              }
            />
          </Field>
          <Field label="Last name">
            <Input
              value={plan.patient.lastName}
              onChange={(e) =>
                update({
                  lastName: e.target.value,
                  fullName: `${plan.patient.firstName} ${e.target.value}`.trim(),
                })
              }
            />
          </Field>
          <Field label="Date of birth">
            <Input
              type="date"
              value={plan.patient.dateOfBirth ?? ""}
              onChange={(e) => update({ dateOfBirth: e.target.value })}
            />
          </Field>
          <Field label="Age">
            <Input
              type="number"
              min={0}
              value={plan.patient.age ?? ""}
              onChange={(e) => update({ age: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <Field label="Country">
            <CountryCombobox
              value={plan.patient.country ?? ""}
              onChange={(country) => update({ country })}
            />
          </Field>
          <Field label="City">
            <Input
              value={plan.patient.city ?? ""}
              onChange={(e) => update({ city: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              value={plan.patient.email ?? ""}
              onChange={(e) => update({ email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={plan.patient.phone ?? ""}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={plan.patient.whatsapp ?? ""}
              onChange={(e) => update({ whatsapp: e.target.value })}
            />
          </Field>
          <Field label="Preferred language">
            <Input
              value={plan.patient.preferredLanguage ?? ""}
              onChange={(e) => update({ preferredLanguage: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Case context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Patient source">
              <Badge variant="secondary" className="h-9 w-fit items-center">
                {plan.patient.source ?? "Manual"}
              </Badge>
            </Field>
            <Field label="Assigned dentist">
              <TeamSelect
                value={plan.patient.dentistId}
                users={clinicUsers.filter((user) => user.role === "dentist")}
                placeholder="Select dentist"
                onChange={(dentistId) => update({ dentistId })}
              />
            </Field>
            <Field label="Assigned coordinator">
              <TeamSelect
                value={plan.patient.coordinatorId}
                users={clinicUsers.filter((user) =>
                  ["coordinator", "clinic_owner", "clinic_admin"].includes(user.role),
                )}
                placeholder="Select coordinator"
                onChange={(coordinatorId) => update({ coordinatorId })}
              />
            </Field>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {plan.patient.assessmentId && <Badge variant="outline">Assessment available</Badge>}
            {plan.patient.roadmapId && <Badge variant="outline">Roadmap available</Badge>}
            {plan.patient.applicationId && (
              <Badge variant="outline">Clinic application available</Badge>
            )}
            {plan.patient.leadId && <Badge variant="outline">CRM lead linked</Badge>}
            {!plan.patient.assessmentId && !plan.patient.roadmapId && !plan.patient.leadId && (
              <span className="text-sm text-muted-foreground">
                No originating digital case references.
              </span>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Uploaded case files</p>
            <div className="flex flex-wrap gap-2">
              {plan.patient.uploadedFiles.length ? (
                plan.patient.uploadedFiles.map((file, index) => (
                  <Badge key={`${file.kind}-${index}`} variant="secondary">
                    {file.kind.replace(/_/g, " ")}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No uploaded files available.</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function TeamSelect({
  value,
  users,
  placeholder,
  onChange,
}: {
  value?: string;
  users: Array<{ id: string; name: string }>;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function TravelStep({
  plan,
  change,
}: {
  plan: DentalPlan;
  change: (patch: Partial<DentalPlan>) => void;
}) {
  const update = (patch: Partial<DentalPlan["travel"]>) =>
    change({ travel: { ...plan.travel, ...patch } });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Travel and services</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Expected visits">
          <Input
            type="number"
            min={1}
            value={plan.travel.visits}
            onChange={(e) => update({ visits: Number(e.target.value) || 1 })}
          />
        </Field>
        <Field label="Visit duration">
          <Input
            value={plan.travel.visitDuration ?? ""}
            onChange={(e) => update({ visitDuration: e.target.value })}
          />
        </Field>
        <Field label="Healing period (weeks)">
          <Input
            type="number"
            min={0}
            value={plan.travel.healingWeeks}
            onChange={(e) => update({ healingWeeks: Number(e.target.value) || 0 })}
          />
        </Field>
        <Check
          label="Hotel required"
          checked={plan.travel.hotelRequired}
          onChange={(value) => update({ hotelRequired: value })}
        />
        <Field label="Hotel name">
          <Input
            value={plan.travel.hotelName ?? ""}
            onChange={(e) => update({ hotelName: e.target.value })}
          />
        </Field>
        <Field label="Hotel nights">
          <Input
            type="number"
            min={0}
            value={plan.travel.hotelNights}
            onChange={(e) => update({ hotelNights: Number(e.target.value) || 0 })}
          />
        </Field>
        <Check
          label="Airport transfer"
          checked={plan.travel.airportTransfer}
          onChange={(value) => update({ airportTransfer: value })}
        />
        <Check
          label="Local transfer"
          checked={plan.travel.localTransfer}
          onChange={(value) => update({ localTransfer: value })}
        />
        <Field label="Estimated dates">
          <Input
            value={plan.travel.treatmentDates ?? ""}
            onChange={(e) => update({ treatmentDates: e.target.value })}
          />
        </Field>
        <Field label="Included services">
          <Textarea
            value={plan.travel.includedServices.join("\n")}
            onChange={(e) => update({ includedServices: lines(e.target.value) })}
          />
        </Field>
        <Field label="Patient-facing notes">
          <Textarea
            value={plan.travel.patientFacingNotes ?? ""}
            onChange={(e) => update({ patientFacingNotes: e.target.value })}
          />
        </Field>
        <Field label="Internal clinic notes">
          <Textarea
            value={plan.travel.internalNotes ?? ""}
            onChange={(e) => update({ internalNotes: e.target.value })}
          />
        </Field>
      </CardContent>
    </Card>
  );
}
function ReviewStep({ plan }: { plan: DentalPlan }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{plan.patient.planTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
          <p>
            <b>Patient:</b> {plan.patient.fullName || "Not provided"}
          </p>
          <p>
            <b>Country:</b> {plan.patient.country || "Not provided"}
          </p>
          <p>
            <b>Visits:</b> {plan.travel.visits}
          </p>
          <p>
            <b>Treatments:</b> {plan.proposedTreatments.length}
          </p>
          <p>
            <b>Linked groups:</b> {plan.treatmentGroups.length}
          </p>
          <p>
            <b>Healing:</b> {plan.travel.healingWeeks} weeks
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <DentalChart
          title="Current Dental Condition"
          mode="current"
          currentConditions={plan.currentConditions}
          proposedTreatments={plan.proposedTreatments}
          selected={[]}
          readOnly
          onSelect={() => {}}
        />
        <DentalChart
          title="Proposed Treatment Plan"
          mode="proposed"
          currentConditions={plan.currentConditions}
          proposedTreatments={plan.proposedTreatments}
          selected={[]}
          readOnly
          onSelect={() => {}}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Clinical and travel summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            {plan.proposedTreatments
              .map((item) => `${item.treatmentType}: ${item.toothNumbers.join(", ")}`)
              .join(" · ") || "No proposed treatment"}
          </p>
          <p>
            <b>Included services:</b> {plan.travel.includedServices.join(", ") || "None"}
          </p>
          <p>
            <b>Patient notes:</b> {plan.travel.patientFacingNotes || "None"}
          </p>
          <p className="rounded bg-muted p-2">
            <b>Internal notes:</b> {plan.travel.internalNotes || "None"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 pt-7 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      {label}
    </label>
  );
}
const lines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
