import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import type { DentalPlan, DentalPlanStudioProps } from "../types/dental-plan.types";
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
  readOnly,
  context,
  clinicUsers = [],
  treatmentDefaults = [],
}: {
  plan: DentalPlan;
  setPlan: (plan: DentalPlan) => void;
  repository: LocalStorageDentalPlanRepository;
} & DentalPlanStudioProps) {
  const { lastSavedAt, saving } = useAutoSave(plan, repository);
  const [finalizing, setFinalizing] = useState(false);
  const [result, setResult] = useState("");
  const change = (patch: Partial<DentalPlan>) =>
    setPlan({ ...plan, ...patch, updatedAt: new Date().toISOString() });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => onChangeRef.current?.(plan), [plan]);
  const step = Math.max(0, Math.min(4, plan.draftStep));
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
      toast.success("Treatment plan finalized and quote prepared");
      setResult(`Treatment plan ${ids.treatmentPlanId} saved. Opening quote…`);
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
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-6">
        <ol className="flex gap-2 overflow-x-auto pb-2">
          {STEPS.map((label, index) => (
            <li key={label} className="min-w-[180px] flex-1">
              <button
                type="button"
                onClick={() => change({ draftStep: index })}
                aria-current={index === step ? "step" : undefined}
                className={`h-full w-full rounded-lg border px-3 py-2 text-left text-sm ${index === step ? "border-primary bg-primary text-primary-foreground" : index < step ? "bg-secondary" : "bg-card hover:bg-muted"}`}
              >
                <span className="mr-2 font-semibold">{index + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
        {result && (
          <div role="status" className="rounded-lg border bg-card p-3 text-sm">
            {result}
          </div>
        )}
        {step === 0 && <PatientStep plan={plan} change={change} clinicUsers={clinicUsers} />}{" "}
        {step === 1 && <TreatmentPlanner value={plan} onChange={setPlan} readOnly={readOnly} />}{" "}
        {step === 2 && <TravelServicesStep plan={plan} change={change} />}{" "}
        {step === 3 && (
          <PricingStep plan={plan} change={change} treatmentDefaults={treatmentDefaults} />
        )}
        {step === 4 && <FinalReviewStep plan={plan} />}
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
