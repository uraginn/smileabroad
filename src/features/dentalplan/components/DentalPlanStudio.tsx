import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronsUpDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
import { syncPricingItems } from "../utils/commercial";
import { FinalReviewStep } from "./FinalReviewStep";
import { TreatmentPlanner } from "./TreatmentPlanner";
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
const STEPS = ["Patient & Case", "Clinical Planning", "Package", "Commercial", "Review & Share"];
export function DentalPlanStudio(props: DentalPlanStudioProps) {
  const repository = useMemo(() => new LocalStorageDentalPlanRepository(), []);
  const [plan, setPlan] = useState<DentalPlan | null>(null);
  const incomingInitial = useRef(props.initialValue);
  incomingInitial.current = props.initialValue;
  const incomingPlanId = props.initialValue?.id;
  useEffect(() => {
    setPlan((current) => {
      const requested = incomingInitial.current;
      if (requested && current?.id !== requested.id) return requested;
      return (
        current ?? requested ?? repository.getPlan() ?? createDentalPlan({ name: "Demo Plan" })
      );
    });
  }, [incomingPlanId, repository]);
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
  caseReadOnly,
  commercialReadOnly,
  context,
  clinicUsers = [],
  treatmentDefaults = [],
  hotels = [],
  serviceOptions,
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
          category: override?.category ?? base.category,
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
  const [reviewShareTab, setReviewShareTab] = useState(plan.draftStep >= 5 ? "share" : "review");
  const change = (patch: Partial<DentalPlan>) =>
    setPlan({ ...plan, ...patch, updatedAt: new Date().toISOString() });
  useEffect(() => {
    const items = syncPricingItems(plan, effectiveTreatments);
    if (JSON.stringify(items) === JSON.stringify(plan.commercial.items)) return;
    setPlan({ ...plan, commercial: { ...plan.commercial, items } });
    // Pricing follows proposed treatments and currency, including when another planner step is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.proposedTreatments, plan.commercial.currency, effectiveTreatments]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => onChangeRef.current?.(plan), [plan]);
  const step = Math.max(0, Math.min(4, plan.draftStep));
  const stepStatus = (index: number) => {
    if (index === step) return "Current";
    const complete =
      index === 0
        ? Boolean(plan.patient.fullName)
        : index === 1
          ? plan.proposedTreatments.length > 0
          : index === 2
            ? index < step
            : index === 3
              ? plan.commercial.items.some((item) => item.unitPrice > 0)
              : plan.finalized;
    return complete ? "Completed" : "Incomplete";
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
      const finalizedPlan = {
        ...plan,
        finalized: true,
        draftStep: 4,
        updatedAt: new Date().toISOString(),
      };
      setPlan(finalizedPlan);
      setReviewShareTab("share");
      repository.savePlan(finalizedPlan);
      onSave?.(finalizedPlan);
      setResult("Standalone review finalized locally. No CRM record was created.");
      return;
    }
    setFinalizing(true);
    try {
      const ids = await onFinalize({ ...plan, finalized: true });
      change({ finalized: true, draftStep: 4 });
      setReviewShareTab("share");
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
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Treatment Plan</p>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-semibold sm:text-lg">
                {plan.patient.fullName || "New treatment case"}
              </h1>
              <Badge variant="outline">{(documentStatus ?? "draft").replace(/_/g, " ")}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">
              {saving
                ? "Saving…"
                : lastSavedAt
                  ? `Saved ${formatDistanceToNow(new Date(lastSavedAt), { addSuffix: true })}`
                  : "Not saved"}
            </span>
            {onPreview && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onPreview}>
                    <Eye className="size-4" /> Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview the patient-facing plan</TooltipContent>
              </Tooltip>
            )}
            <Button size="sm" onClick={save} disabled={readOnly}>
              Save
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-6">
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs
            value={String(step)}
            onValueChange={(value) => change({ draftStep: Number(value) })}
            className="min-w-max"
          >
            <TabsList className="h-auto w-max justify-start gap-1 bg-muted/60 p-1">
              {STEPS.map((label, index) => (
                <TabsTrigger
                  key={label}
                  value={String(index)}
                  className="min-h-12 w-44 justify-start gap-2 px-3 text-left"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold shadow-sm">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{label}</span>
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {stepStatus(index)}
                    </span>
                  </span>
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
              <PatientStep
                plan={plan}
                change={change}
                clinicUsers={clinicUsers}
                readOnly={readOnly || caseReadOnly}
              />
            )}
          </>
        )}{" "}
        {step === 1 && (
          <div className="space-y-4">
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
              pricingReadOnly={commercialReadOnly}
              definitions={effectiveTreatments}
            />
          </div>
        )}{" "}
        {step === 2 && (
          <TravelServicesStep
            plan={plan}
            change={change}
            hotels={hotels}
            serviceOptions={serviceOptions}
            readOnly={readOnly || commercialReadOnly}
          />
        )}{" "}
        {step === 3 && (
          <PricingStep plan={plan} change={change} readOnly={readOnly || commercialReadOnly} />
        )}
        {step === 4 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Review & Share</h2>
              <p className="text-sm text-muted-foreground">
                Validate the plan, then choose the patient-facing action.
              </p>
            </div>
            <Tabs value={reviewShareTab} onValueChange={setReviewShareTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 sm:w-80">
                <TabsTrigger value="review">Review</TabsTrigger>
                <TabsTrigger value="share" disabled={context?.mode === "template"}>
                  Share
                </TabsTrigger>
              </TabsList>
              <TabsContent value="review">
                <FinalReviewStep
                  plan={plan}
                  hotels={hotels}
                  clinicUsers={clinicUsers}
                  onNavigate={(draftStep) => change({ draftStep })}
                />
              </TabsContent>
              <TabsContent value="share">
                {shareSection ?? (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      Save this Treatment Plan before sharing.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </section>
        )}
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
          ) : reviewShareTab === "share" ? null : context?.mode === "template" ? (
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
                  <AlertDialogAction onClick={finalize}>Save and open Share</AlertDialogAction>
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
  readOnly,
}: {
  plan: DentalPlan;
  change: (patch: Partial<DentalPlan>) => void;
  clinicUsers: Array<{ id: string; name: string; role: string }>;
  readOnly?: boolean;
}) {
  const update = (patch: Partial<DentalPlan["patient"]>) => {
    if (!readOnly)
      change({
        patient: { ...plan.patient, ...patch },
        patientName: patch.fullName ?? plan.patientName,
      });
  };
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
    <section className="space-y-6 rounded-xl bg-card p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Patient & Case</h2>
        <p className="text-sm text-muted-foreground">Patient identity and case responsibility.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2 lg:divide-x">
        <section aria-labelledby="patient-information-heading" className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border">
              <AvatarFallback>{patientInitials(plan.patient.fullName)}</AvatarFallback>
            </Avatar>
            <h3 id="patient-information-heading" className="font-semibold">
              Patient
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name">
              <Input
                disabled={readOnly}
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
            <Field label="Country">
              <CountryCombobox
                disabled={readOnly}
                value={plan.patient.country ?? ""}
                onChange={(country) => update({ country })}
              />
            </Field>
            <Field label="Email">
              <Input
                disabled={readOnly}
                type="email"
                value={plan.patient.email ?? ""}
                onChange={(event) => update({ email: event.target.value })}
              />
            </Field>
          </div>
        </section>
        <section aria-labelledby="assignment-heading" className="space-y-4 lg:pl-8">
          <h3 id="assignment-heading" className="font-semibold">
            Assignment
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Field label="Assigned dentist">
              <TeamSelect
                value={plan.patient.dentistId}
                users={clinicUsers.filter((user) => user.role === "dentist")}
                placeholder="Select dentist"
                disabled={readOnly}
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
                disabled={readOnly}
                onChange={(coordinatorId) => update({ coordinatorId })}
              />
            </Field>
          </div>
        </section>
      </div>
      {hasSourceContext && (
        <>
          <Separator />
          <Collapsible className="rounded-lg bg-muted/30 px-4">
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
                {plan.patient.assessmentId && <Badge variant="outline">Assessment available</Badge>}
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
    </section>
  );
}
function TeamSelect({
  value,
  users,
  placeholder,
  onChange,
  disabled,
}: {
  value?: string;
  users: Array<{ id: string; name: string; role: string }>;
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = users.find((user) => user.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-auto min-h-10 w-full justify-between py-2"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2 text-left">
              <Avatar className="size-7">
                <AvatarFallback className="text-[10px]">
                  {patientInitials(selected.name)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm">{selected.name}</span>
                <span className="block text-[11px] capitalize text-muted-foreground">
                  {selected.role.replace(/_/g, " ")}
                </span>
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No matching clinic user</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Unassigned"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 size-4", !value ? "opacity-100" : "opacity-0")} />
                Unassigned
              </CommandItem>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.name} ${user.role}`}
                  onSelect={() => {
                    onChange(user.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 size-4", value === user.id ? "opacity-100" : "opacity-0")}
                  />
                  <Avatar className="mr-2 size-7">
                    <AvatarFallback className="text-[10px]">
                      {patientInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    <span className="block text-sm">{user.name}</span>
                    <span className="block text-[11px] capitalize text-muted-foreground">
                      {user.role.replace(/_/g, " ")}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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

function patientInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "TP";
}
