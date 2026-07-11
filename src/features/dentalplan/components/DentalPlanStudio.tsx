import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TreatmentPlanner } from "./TreatmentPlanner";
import { DentalChart } from "./DentalChart";
import type { DentalPlan, DentalPlanStudioProps } from "../types/dental-plan.types";
import { createDentalPlan } from "../utils/createDentalPlan";
import { LocalStorageDentalPlanRepository } from "../adapters/LocalStorageDentalPlanRepository";
import { useAutoSave } from "../hooks/useAutoSave";
const STEPS = [
  "Patient Information",
  "Clinical Planning",
  "Travel and Services",
  "Review and Finalize",
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
  const step = Math.max(0, Math.min(3, plan.draftStep));
  const save = () => {
    repository.savePlan(plan);
    onSave?.(plan);
    setResult("Draft saved.");
  };
  const finalize = async () => {
    if (context?.mode !== "crm" || !onFinalize) {
      change({ finalized: true });
      save();
      setResult("Standalone review finalized locally. No CRM record was created.");
      return;
    }
    setFinalizing(true);
    try {
      const ids = await onFinalize({ ...plan, finalized: true });
      change({ finalized: true });
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
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={`rounded-lg border px-3 py-2 text-sm ${index === step ? "border-primary bg-primary text-primary-foreground" : index < step ? "bg-secondary" : "bg-card"}`}
            >
              <span className="mr-2 font-semibold">{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        {result && (
          <div role="status" className="rounded-lg border bg-card p-3 text-sm">
            {result}
          </div>
        )}
        {step === 0 && <PatientStep plan={plan} change={change} />}{" "}
        {step === 1 && <TreatmentPlanner value={plan} onChange={setPlan} readOnly={readOnly} />}{" "}
        {step === 2 && <TravelStep plan={plan} change={change} />}{" "}
        {step === 3 && <ReviewStep plan={plan} />}
        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => change({ draftStep: step - 1 })}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => change({ draftStep: step + 1 })}>Continue</Button>
          ) : (
            <Button onClick={finalize} disabled={finalizing}>
              {finalizing ? "Finalizing…" : "Finalize and open quote"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
function PatientStep({
  plan,
  change,
}: {
  plan: DentalPlan;
  change: (patch: Partial<DentalPlan>) => void;
}) {
  const update = (patch: Partial<DentalPlan["patient"]>) =>
    change({
      patient: { ...plan.patient, ...patch },
      patientName: patch.fullName ?? plan.patientName,
      name: patch.planTitle ?? plan.name,
    });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient information</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Patient full name">
          <Input
            value={plan.patient.fullName}
            onChange={(e) => update({ fullName: e.target.value })}
          />
        </Field>
        <Field label="Date of birth">
          <Input
            type="date"
            value={plan.patient.dateOfBirth ?? ""}
            onChange={(e) => update({ dateOfBirth: e.target.value })}
          />
        </Field>
        <Field label="Country">
          <Input
            value={plan.patient.country ?? ""}
            onChange={(e) => update({ country: e.target.value })}
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
        <Field label="Treatment interest">
          <Input
            value={plan.patient.treatmentInterest ?? ""}
            onChange={(e) => update({ treatmentInterest: e.target.value })}
          />
        </Field>
        <Field label="Plan title">
          <Input
            value={plan.patient.planTitle}
            onChange={(e) => update({ planTitle: e.target.value })}
          />
        </Field>
        <Field label="Preparation date">
          <Input
            type="date"
            value={plan.patient.preparationDate}
            onChange={(e) => update({ preparationDate: e.target.value })}
          />
        </Field>
        <Field label="Currency">
          <select
            className="h-9 w-full rounded-md border bg-background px-3"
            value={plan.patient.currency}
            onChange={(e) => update({ currency: e.target.value as typeof plan.patient.currency })}
          >
            {["EUR", "GBP", "USD", "TRY"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
      </CardContent>
    </Card>
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
