import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-bits";
import { useAuth } from "@/lib/auth/mock-auth";
import { canUser } from "@/lib/auth/permissions";
import { formatCrmDate } from "@/lib/format";
import { selectClinicPlans, useMockStore } from "@/lib/mock/store";
import { formatQuoteMoney } from "@/lib/quote";
import { calculateTreatmentPlanTotals } from "@/lib/treatment-plan-commercial";
import { isTreatmentPlanPubliclyViewable } from "@/lib/treatment-plan-status";
import { cn } from "@/lib/utils";
import type { Assessment, Lead, Patient, TreatmentPlan } from "@/types/models";

export const Route = createFileRoute("/pro/treatment-plans")({
  validateSearch: (search: Record<string, unknown>): { create?: boolean } => ({
    create:
      search.create === true || search.create === "true" || search.create === "1"
        ? true
        : undefined,
  }),
  component: Plans,
});

function Plans() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { create } = Route.useSearch();
  const activeUser = useAuth((state) => state.user);
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<"existing" | "new">("existing");
  const [caseId, setCaseId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [dentistId, setDentistId] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const clinicId = activeUser?.clinic_id ?? "clinic_istanbul";
  const canCreate = canUser(activeUser, "treatment_plans.create");
  const plans = useMockStore(useShallow(selectClinicPlans(clinicId)));
  const patients = useMockStore(
    useShallow((state) => state.patients.filter((patient) => patient.clinic_id === clinicId)),
  );
  const users = useMockStore((state) => state.users);
  const leads = useMockStore((state) => state.leads);
  const assessments = useMockStore((state) => state.assessments);
  const addPatient = useMockStore((state) => state.addPatient);
  const addTreatmentPlan = useMockStore((state) => state.addTreatmentPlan);
  const updateStatus = useMockStore((state) => state.updateTreatmentPlanStatus);
  const clinicLeads = useMemo(
    () => leads.filter((lead) => lead.clinic_id === clinicId),
    [leads, clinicId],
  );
  const clinicUsers = useMemo(
    () => users.filter((member) => member.clinic_id === clinicId),
    [users, clinicId],
  );
  const activeDentists = useMemo(
    () => clinicUsers.filter((member) => member.role === "dentist" && member.active !== false),
    [clinicUsers],
  );
  const activeCoordinators = useMemo(
    () =>
      clinicUsers.filter(
        (member) =>
          ["coordinator", "clinic_owner", "clinic_admin"].includes(member.role) &&
          member.active !== false,
      ),
    [clinicUsers],
  );
  const defaultDentist = activeDentists.find((member) => member.default_planner_dentist);
  const normalizedEmail = email.trim().toLowerCase();
  const duplicatePatient = useMemo(
    () =>
      normalizedEmail
        ? patients.find((patient) => patient.email?.trim().toLowerCase() === normalizedEmail)
        : undefined,
    [normalizedEmail, patients],
  );

  useEffect(() => {
    if (create && canCreate) setCreateOpen(true);
  }, [create, canCreate]);

  const resetCreation = () => {
    setCaseId("");
    setFullName("");
    setEmail("");
    setCountry("");
    setPreferredLanguage("");
    setDentistId("");
    setCoordinatorId("");
    setCreating(false);
    creatingRef.current = false;
  };
  const handleDialogState = (open: boolean) => {
    setCreateOpen(open);
    if (!open) resetCreation();
  };
  const selectCase = (value: string) => {
    setCaseId(value);
    const selected = resolveSelectedCase(value, patients, clinicLeads);
    setDentistId(selected.patient?.dentist_id ?? defaultDentist?.id ?? "");
    setCoordinatorId(
      selected.lead?.assigned_to ??
        selected.patient?.coordinator_id ??
        (activeUser?.role === "coordinator" ? activeUser.id : ""),
    );
  };
  const selectDuplicatePatient = (patient: Patient) => {
    setCreationMode("existing");
    selectCase(`patient:${patient.id}`);
  };
  const createPlan = () => {
    if (creatingRef.current || !activeUser || !canCreate) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      let patient: Patient;
      let lead: Lead | undefined;
      if (creationMode === "existing") {
        const selected = resolveSelectedCase(caseId, patients, clinicLeads);
        lead = selected.lead;
        const resolvedPatient =
          selected.patient ??
          createPatientFromLead(
            lead,
            assessments,
            clinicId,
            dentistId,
            coordinatorId,
            activeUser.id,
            addPatient,
          );
        if (!resolvedPatient) throw new Error("Select a valid clinic Patient or Lead.");
        patient = resolvedPatient;
        lead ??= latestPatientLead(patient, clinicLeads);
      } else {
        const name = splitFullName(fullName);
        patient = addPatient(
          {
            clinic_id: clinicId,
            first_name: name.firstName,
            last_name: name.lastName,
            email: email.trim() || undefined,
            country: country.trim() || undefined,
            language: preferredLanguage.trim() || undefined,
            source: "manual",
            dentist_id: dentistId || undefined,
            coordinator_id: coordinatorId || undefined,
          },
          activeUser.id,
        );
      }
      const plan = addTreatmentPlan(
        createPlanRecord(patient, lead, dentistId, coordinatorId, clinicId),
        activeUser.id,
      );
      toast.success("Treatment Plan ready");
      handleDialogState(false);
      void navigate({ to: "/dentalplan", search: { treatmentPlanId: plan.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Treatment Plan creation failed");
      creatingRef.current = false;
      setCreating(false);
    }
  };

  if (pathname !== "/pro/treatment-plans") return <Outlet />;
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Treatment Plans"
        description="Prepare clinical care, travel, pricing, review and sharing in one patient-document workspace."
        actions={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Create Treatment Plan
            </Button>
          ) : undefined
        }
      />
      {plans.length === 0 ? (
        <EmptyState
          title="No treatment plans"
          description="Create a Treatment Plan from a patient or Lead to begin."
          action={
            canCreate ? (
              <Button onClick={() => setCreateOpen(true)}>Create Treatment Plan</Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Dentist</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sharing</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  const patient = patients.find((item) => item.id === plan.clinic_patient_id);
                  const dentist = users.find((item) => item.id === plan.dentist_id);
                  const totals = calculateTreatmentPlanTotals(plan);
                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <p className="font-medium">{plan.title}</p>
                        <p className="max-w-64 truncate text-xs text-muted-foreground">
                          {plan.summary}
                        </p>
                      </TableCell>
                      <TableCell>
                        {patient ? `${patient.first_name} ${patient.last_name}` : "Not linked"}
                      </TableCell>
                      <TableCell>{dentist?.name ?? "Not assigned"}</TableCell>
                      <TableCell>
                        {formatQuoteMoney(totals.total, plan.currency ?? "EUR")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={plan.status ?? "draft"} />
                      </TableCell>
                      <TableCell>
                        {plan.share_token
                          ? isTreatmentPlanPubliclyViewable(plan.status)
                            ? "Public link ready"
                            : "Private preview"
                          : "Not prepared"}
                      </TableCell>
                      <TableCell>{formatCrmDate(plan.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <PlanActions
                          plan={plan}
                          clinicId={clinicId}
                          actorId={activeUser?.id}
                          role={activeUser?.role}
                          updateStatus={updateStatus}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Dialog open={createOpen} onOpenChange={handleDialogState}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Treatment Plan</DialogTitle>
            <DialogDescription>
              Start from an existing case or create a minimal clinic Patient record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs
              value={creationMode}
              onValueChange={(value) => {
                setCreationMode(value as typeof creationMode);
                setCaseId("");
                setDentistId(defaultDentist?.id ?? "");
                setCoordinatorId(activeUser?.role === "coordinator" ? activeUser.id : "");
              }}
            >
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger value="existing" className="min-h-10 whitespace-normal">
                  Existing patient or Lead
                </TabsTrigger>
                <TabsTrigger value="new" className="min-h-10">
                  New patient
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {creationMode === "existing" ? (
              <div className="space-y-1.5">
                <Label>Patient or Lead</Label>
                <CaseCombobox
                  value={caseId}
                  patients={patients}
                  leads={clinicLeads}
                  onChange={selectCase}
                />
              </div>
            ) : (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-patient-name">Full name</Label>
                  <Input
                    id="new-patient-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    placeholder="Patient full name"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-patient-email">Email (optional)</Label>
                    <Input
                      id="new-patient-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-patient-country">Country (optional)</Label>
                    <Input
                      id="new-patient-country"
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="new-patient-language">Preferred language (optional)</Label>
                    <Input
                      id="new-patient-language"
                      value={preferredLanguage}
                      onChange={(event) => setPreferredLanguage(event.target.value)}
                    />
                  </div>
                </div>
                {duplicatePatient && (
                  <Alert>
                    <AlertTitle>Existing patient found</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p>
                        This email already belongs to {duplicatePatient.first_name}{" "}
                        {duplicatePatient.last_name}. Choose that record to avoid an accidental
                        duplicate.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => selectDuplicatePatient(duplicatePatient)}
                      >
                        Use existing patient
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <AssignmentSelect
                label="Assigned dentist"
                value={dentistId}
                onChange={setDentistId}
                users={activeDentists}
              />
              <AssignmentSelect
                label="Assigned coordinator"
                value={coordinatorId}
                onChange={setCoordinatorId}
                users={activeCoordinators}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogState(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                creating ||
                !canCreate ||
                (creationMode === "existing" ? !caseId : !fullName.trim() || !!duplicatePatient)
              }
              onClick={createPlan}
            >
              {creating ? "Creating…" : "Continue to Treatment Planner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CaseCombobox({
  value,
  patients,
  leads,
  onChange,
}: {
  value: string;
  patients: Patient[];
  leads: Lead[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = resolveSelectedCase(value, patients, leads);
  const selectedLabel = selected.lead
    ? `${selected.lead.patient_name} · ${selected.lead.treatment}`
    : selected.patient
      ? patientName(selected.patient)
      : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{selectedLabel ?? "Search patients and Leads"}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search name, email, phone, country…" />
          <CommandList className="max-h-80">
            <CommandEmpty>No matching clinic record</CommandEmpty>
            <CommandGroup heading="Leads">
              {leads.map((lead) => {
                const patient = patientForLead(lead, patients);
                const itemValue = `lead:${lead.id}`;
                return (
                  <CommandItem
                    key={itemValue}
                    value={[
                      lead.patient_name,
                      lead.treatment,
                      lead.status,
                      lead.patient_country,
                      patient?.email,
                      patient?.phone,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onSelect={() => {
                      onChange(itemValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value === itemValue ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate">{lead.patient_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {lead.treatment} · {lead.status.replace(/_/g, " ")}
                      </span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandGroup heading="Patients">
              {patients.map((patient) => {
                const itemValue = `patient:${patient.id}`;
                return (
                  <CommandItem
                    key={itemValue}
                    value={[
                      patientName(patient),
                      patient.email,
                      patient.phone,
                      patient.country,
                      patient.treatment_interest,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onSelect={() => {
                      onChange(itemValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value === itemValue ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate">{patientName(patient)}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[patient.email, patient.phone, patient.country]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AssignmentSelect({
  label,
  value,
  onChange,
  users,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  users: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Combobox
        value={value || "unassigned"}
        options={[
          { value: "unassigned", label: "Unassigned" },
          ...users.map((user) => ({ value: user.id, label: user.name })),
        ]}
        onValueChange={(next) => onChange(next === "unassigned" ? "" : next)}
        placeholder="Unassigned"
        searchPlaceholder={`Search ${label.toLowerCase()}...`}
        emptyText="No matching clinic user"
      />
    </div>
  );
}

function resolveSelectedCase(value: string, patients: Patient[], leads: Lead[]) {
  if (value.startsWith("lead:")) {
    const lead = leads.find((item) => item.id === value.slice(5));
    return { lead, patient: lead ? patientForLead(lead, patients) : undefined };
  }
  const patient = value.startsWith("patient:")
    ? patients.find((item) => item.id === value.slice(8))
    : undefined;
  return { patient, lead: patient ? latestPatientLead(patient, leads) : undefined };
}

function patientForLead(lead: Lead, patients: Patient[]) {
  return patients.find(
    (patient) =>
      patient.id === lead.clinic_patient_id ||
      (!!patient.user_id && patient.user_id === lead.patient_user_id),
  );
}

function latestPatientLead(patient: Patient, leads: Lead[]) {
  return leads
    .filter(
      (lead) =>
        lead.clinic_patient_id === patient.id ||
        (!!patient.user_id && lead.patient_user_id === patient.user_id),
    )
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];
}

function createPatientFromLead(
  lead: Lead | undefined,
  assessments: Assessment[],
  clinicId: string,
  dentistId: string,
  coordinatorId: string,
  actorId: string,
  addPatient: ReturnType<typeof useMockStore.getState>["addPatient"],
) {
  if (!lead) return undefined;
  const assessment = assessments.find((item) => item.id === lead.assessment_id);
  const name = splitFullName(lead.patient_name);
  return addPatient(
    {
      clinic_id: clinicId,
      user_id: lead.patient_user_id,
      first_name: assessment?.personal.first_name || name.firstName,
      last_name: assessment?.personal.last_name || name.lastName,
      email: assessment?.personal.email || undefined,
      phone: assessment?.personal.phone,
      whatsapp: assessment?.personal.whatsapp,
      country: assessment?.personal.country || lead.patient_country || undefined,
      city: assessment?.personal.city,
      language: assessment?.personal.preferred_language,
      source: lead.source === "assessment" ? "smileabroad" : lead.source,
      assessment_id: lead.assessment_id,
      roadmap_id: lead.roadmap_id,
      treatment_interest: lead.treatment,
      dentist_id: dentistId || undefined,
      coordinator_id: coordinatorId || lead.assigned_to,
    },
    actorId,
  );
}

function createPlanRecord(
  patient: Patient,
  lead: Lead | undefined,
  dentistId: string,
  coordinatorId: string,
  clinicId: string,
): Omit<TreatmentPlan, "id" | "created_at" | "updated_at" | "created_by"> {
  return {
    clinic_id: clinicId,
    patient_user_id: patient.user_id ?? patient.id,
    clinic_patient_id: patient.id,
    lead_id: lead?.id,
    clinic_application_id: lead?.clinic_application_id,
    assessment_id: lead?.assessment_id ?? patient.assessment_id,
    roadmap_id: lead?.roadmap_id ?? patient.roadmap_id,
    dentist_id: dentistId || patient.dentist_id,
    coordinator_id: coordinatorId || lead?.assigned_to || patient.coordinator_id,
    title: patient.treatment_interest
      ? `${patient.treatment_interest} treatment plan`
      : `Treatment plan for ${patientName(patient)}`,
    summary: "Draft clinical treatment plan.",
    items: [],
    visits: 1,
    healing_weeks: 0,
    status: "draft",
    clinical_findings: [],
    treatment_objectives: [],
    alternatives: [],
    risks: [],
    exclusions: [],
    materials: [],
    implant_systems: [],
    treatment_stages: [],
    visit_plan: [],
  };
}

function splitFullName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function patientName(patient: Patient) {
  return `${patient.first_name} ${patient.last_name}`.trim();
}

function PlanActions({
  plan,
  clinicId,
  actorId,
  role,
  updateStatus,
}: {
  plan: ReturnType<typeof useMockStore.getState>["treatmentPlans"][number];
  clinicId: string;
  actorId?: string;
  role?: string;
  updateStatus: ReturnType<typeof useMockStore.getState>["updateTreatmentPlanStatus"];
}) {
  const copyLink = () => {
    if (!plan.share_token) return;
    void navigator.clipboard.writeText(
      `${window.location.origin}/shared/treatment-plan/${plan.share_token}`,
    );
    toast.success("Share link copied");
  };
  const canSubmitReview = ["clinic_owner", "clinic_admin", "coordinator", "dentist"].includes(
    role ?? "",
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${plan.title}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/dentalplan" search={{ treatmentPlanId: plan.id }}>
            Open Treatment Plan
          </Link>
        </DropdownMenuItem>
        {plan.share_token && (
          <DropdownMenuItem asChild>
            <Link
              to="/shared/treatment-plan/$token"
              params={{ token: plan.share_token }}
              search={{ preview: true }}
            >
              Preview Patient View
            </Link>
          </DropdownMenuItem>
        )}
        {plan.share_token && isTreatmentPlanPubliclyViewable(plan.status) && (
          <DropdownMenuItem onClick={copyLink}>Copy Share Link</DropdownMenuItem>
        )}
        {(plan.status ?? "draft") === "draft" && canSubmitReview && (
          <DropdownMenuItem
            onClick={() => updateStatus(plan.id, clinicId, "doctor_review", actorId)}
          >
            Send for Doctor Review
          </DropdownMenuItem>
        )}
        {(plan.status ?? "draft") === "doctor_review" &&
          ["dentist", "clinic_owner", "clinic_admin"].includes(role ?? "") && (
            <DropdownMenuItem onClick={() => updateStatus(plan.id, clinicId, "approved", actorId)}>
              Mark Approved
            </DropdownMenuItem>
          )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
