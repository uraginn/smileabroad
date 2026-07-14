import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Eye } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  "Patient & Assignment",
  "Clinical Plan",
  "Travel & Services",
  "Pricing",
  "Review",
  "Share",
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
  preliminarySuggestions = [],
  shareSection,
  documentStatus,
  onPreview,
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
  const assignedDentist = clinicUsers.find((user) => user.id === plan.patient.dentistId);
  const change = (patch: Partial<DentalPlan>) =>
    setPlan({ ...plan, ...patch, updatedAt: new Date().toISOString() });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => onChangeRef.current?.(plan), [plan]);
  const step = Math.max(0, Math.min(5, plan.draftStep));
  const applyTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    const source = createDentalPlan(template.planData);
    setPlan({
      ...plan,
      proposedTreatments: source.proposedTreatments,
      treatmentGroups: source.treatmentGroups,
      updatedAt: new Date().toISOString(),
    });
    toast.success(`${template.name} applied`);
  };
  const requestTemplate = (templateId: string) => {
    const hasPlanningData = plan.proposedTreatments.length > 0;
    if (hasPlanningData) setPendingTemplateId(templateId);
    else applyTemplate(templateId);
  };
  const save = () => {
    if (readOnly) return;
    repository.savePlan(plan);
    onSave?.(plan);
    setResult("Draft saved.");
  };
  const finalize = async () => {
    if (readOnly) return;
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
      change({ finalized: true, draftStep: 5 });
      toast.success("Treatment plan finalized");
      setResult(`Treatment plan ${ids.treatmentPlanId} saved.`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Finalization failed.");
    } finally {
      setFinalizing(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="mb-1 -ml-3">
              <Link to="/pro/treatment-plans">Back to Treatment Plans</Link>
            </Button>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold">
                {plan.patient.fullName || "Dental Treatment Planner"}
              </h1>
              <Badge variant="outline">{(documentStatus ?? "draft").replace(/_/g, " ")}</Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {context?.mode === "template"
                ? "Clinic template editor · patient data excluded"
                : assignedDentist?.name || "Dentist unassigned"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="font-normal">
              {saving
                ? "Saving…"
                : lastSavedAt
                  ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                  : "Not saved"}
            </Badge>
            {onPreview && (
              <Button variant="ghost" size="sm" onClick={onPreview}>
                <Eye className="size-4" /> Preview
              </Button>
            )}
            <Button variant="outline" onClick={save} disabled={readOnly}>
              Save draft
            </Button>
            {context?.mode === "crm" && onSaveAsTemplate && !readOnly && (
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
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-6">
              {STEPS.map((label, index) => (
                <TabsTrigger
                  key={label}
                  value={String(index)}
                  className="min-h-11 min-w-0 justify-start whitespace-normal px-2 text-left"
                >
                  <span className="mr-1.5 font-semibold">{index + 1}</span>
                  <span className="truncate">{label}</span>
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
                The selected template will replace proposed treatments and linked groups. Current
                conditions, patient, assignment, travel and pricing data will stay unchanged.
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
          <div className="space-y-4">
            {context?.mode !== "template" && templates.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Start from template <Badge variant="outline">Optional</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-w-xl">
                    <Combobox
                      options={templates.map((template) => ({
                        value: template.id,
                        label: `${template.name} · ${template.category} · ${template.planData.proposedTreatments.length} treatments`,
                      }))}
                      onValueChange={requestTemplate}
                      placeholder="Select a reusable clinical template"
                      searchPlaceholder="Search templates..."
                      emptyText="No templates found"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            {preliminarySuggestions.length > 0 && (
              <Collapsible className="rounded-lg border border-primary/20 bg-card px-4">
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" className="w-full justify-between px-0">
                    Preliminary Roadmap suggestions
                    <ChevronDown className="size-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-4">
                  <div className="flex flex-wrap gap-2">
                    {preliminarySuggestions.map((item) => (
                      <Badge key={item.key} variant="outline">
                        {item.label}
                        {item.quantity ? ` · approximately ${item.quantity}` : ""}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Reference only. Suggestions do not select teeth or become confirmed treatments
                    until edited by the clinic.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}
            <TreatmentPlanner
              value={plan}
              onChange={setPlan}
              readOnly={readOnly}
              definitions={effectiveTreatments}
            />
          </div>
        )}{" "}
        {step === 2 && <TravelServicesStep plan={plan} change={change} hotels={hotels} />}{" "}
        {step === 3 && (
          <PricingStep plan={plan} change={change} treatmentDefaults={treatmentDefaults} />
        )}
        {step === 4 && (
          <FinalReviewStep
            plan={plan}
            hotels={hotels}
            clinicUsers={clinicUsers}
            onNavigate={(draftStep) => change({ draftStep })}
          />
        )}
        {step === 5 &&
          (shareSection ?? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Save this Treatment Plan before sharing.
              </CardContent>
            </Card>
          ))}
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
          ) : step === 5 ? null : context?.mode === "template" ? (
            <Button onClick={save}>Save template</Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={readOnly || finalizing || !plan.proposedTreatments.length}>
                  {finalizing ? "Saving…" : "Save Treatment Plan and continue"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalize this clinical plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This saves clinical, travel and pricing information to the unified Treatment
                    Plan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={finalize}>
                    Save and continue to Share
                  </AlertDialogAction>
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
  const hasSourceContext = Boolean(
    plan.patient.leadId ||
    plan.patient.assessmentId ||
    plan.patient.roadmapId ||
    plan.patient.applicationId ||
    plan.patient.uploadedFiles.length ||
    plan.importedAssessment.destinationCountry ||
    plan.patient.treatmentInterest,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient & Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section aria-labelledby="patient-information-heading">
          <h3 id="patient-information-heading" className="mb-4 text-sm font-semibold">
            Patient information
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name">
              <Input
                value={plan.patient.fullName}
                onChange={(e) => {
                  const fullName = e.target.value;
                  const parts = fullName.trim().split(/\s+/);
                  update({
                    fullName,
                    firstName: parts[0] ?? "",
                    lastName: parts.slice(1).join(" "),
                  });
                }}
              />
            </Field>
            <Field label="Email (optional)">
              <Input
                type="email"
                value={plan.patient.email ?? ""}
                onChange={(e) => update({ email: e.target.value })}
              />
            </Field>
            <Field label="Country">
              <CountryCombobox
                value={plan.patient.country ?? ""}
                onChange={(country) => update({ country })}
              />
            </Field>
            <Field label="Preferred language (optional)">
              <Input
                value={plan.patient.preferredLanguage ?? ""}
                onChange={(e) => update({ preferredLanguage: e.target.value })}
              />
            </Field>
          </div>
        </section>
        <Separator />
        <section aria-labelledby="assignment-heading">
          <h3 id="assignment-heading" className="mb-4 text-sm font-semibold">
            Clinical ownership
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
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
        </section>
        {hasSourceContext && (
          <>
            <Separator />
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full justify-between px-0">
                  Source information
                  <ChevronDown className="size-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <div className="flex flex-wrap gap-2">
                  {plan.patient.source && (
                    <Badge variant="secondary">
                      Source: {plan.patient.source.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {plan.patient.assessmentId && (
                    <Badge variant="outline">Assessment available</Badge>
                  )}
                  {plan.patient.roadmapId && (
                    <Badge variant="outline">Preliminary Roadmap available</Badge>
                  )}
                  {plan.patient.applicationId && (
                    <Badge variant="outline">Clinic application available</Badge>
                  )}
                  {plan.patient.leadId && <Badge variant="outline">CRM Lead linked</Badge>}
                  {plan.importedAssessment.destinationCountry && (
                    <Badge variant="outline">
                      Destination: {plan.importedAssessment.destinationCountry}
                    </Badge>
                  )}
                  {plan.patient.treatmentInterest && (
                    <Badge variant="outline">
                      Preliminary interest: {plan.patient.treatmentInterest}
                    </Badge>
                  )}
                </div>
                {plan.patient.uploadedFiles.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Uploaded case files</p>
                    <div className="flex flex-wrap gap-2">
                      {plan.patient.uploadedFiles.map((file, index) => (
                        <Badge key={`${file.kind}-${index}`} variant="secondary">
                          {file.kind.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
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
    <Combobox
      value={value || "unassigned"}
      options={[
        { value: "unassigned", label: "Unassigned" },
        ...users.map((user) => ({ value: user.id, label: user.name })),
      ]}
      onValueChange={(next) => onChange(next === "unassigned" ? "" : next)}
      placeholder={placeholder}
      searchPlaceholder={`Search ${placeholder.toLowerCase()}...`}
      emptyText="No matching clinic user"
    />
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
