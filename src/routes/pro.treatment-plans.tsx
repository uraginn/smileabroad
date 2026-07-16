import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  MoreHorizontal,
  Plus,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-bits";
import { useAuth } from "@/lib/auth/mock-auth";
import { canUser } from "@/lib/auth/permissions";
import { formatCrmDate } from "@/lib/format";
import { treatmentLabel } from "@/lib/dental";
import { selectClinicPlans, useMockStore } from "@/lib/mock/store";
import { formatQuoteMoney } from "@/lib/quote";
import { calculateTreatmentPlanTotals } from "@/lib/treatment-plan-commercial";
import { isTreatmentPlanPubliclyViewable } from "@/lib/treatment-plan-status";
import { cn } from "@/lib/utils";
import type { Assessment, Lead, Patient, TreatmentPlan } from "@/types/models";

const PLAN_FILTERS = [
  "all",
  "draft",
  "doctor_review",
  "approved",
  "sent",
  "viewed",
  "accepted",
] as const;
type PlanFilter = (typeof PLAN_FILTERS)[number];

export const Route = createFileRoute("/pro/treatment-plans")({
  validateSearch: (search: Record<string, unknown>): { create?: boolean; status?: PlanFilter } => ({
    create:
      search.create === true || search.create === "true" || search.create === "1"
        ? true
        : undefined,
    status: PLAN_FILTERS.includes(search.status as PlanFilter)
      ? (search.status as PlanFilter)
      : undefined,
  }),
  component: Plans,
});

function Plans() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { create, status = "all" } = Route.useSearch();
  const activeUser = useAuth((state) => state.user);
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [existingPatientOpen, setExistingPatientOpen] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [fullName, setFullName] = useState("");
  const [dentistId, setDentistId] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [dentistFilter, setDentistFilter] = useState("all");
  const [coordinatorFilter, setCoordinatorFilter] = useState("all");
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
  const createPatientAndTreatmentPlan = useMockStore(
    (state) => state.createPatientAndTreatmentPlan,
  );
  const updateStatus = useMockStore((state) => state.updateTreatmentPlanStatus);
  const markSent = useMockStore((state) => state.markTreatmentPlanSent);
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
  const filteredPlans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return plans
      .filter((plan) => status === "all" || (plan.status ?? "draft") === status)
      .filter((plan) => dentistFilter === "all" || plan.dentist_id === dentistFilter)
      .filter((plan) => coordinatorFilter === "all" || plan.coordinator_id === coordinatorFilter)
      .filter((plan) => {
        if (!normalizedQuery) return true;
        const patient = patients.find((item) => item.id === plan.clinic_patient_id);
        return [
          plan.title,
          plan.summary,
          patient?.first_name,
          patient?.last_name,
          patient?.email,
          patient?.phone,
          patient?.country,
        ].some((value) => value?.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => safeDate(b.updated_at) - safeDate(a.updated_at));
  }, [coordinatorFilter, dentistFilter, patients, plans, query, status]);

  useEffect(() => {
    if (create && canCreate) setCreateOpen(true);
  }, [create, canCreate]);

  const resetCreation = () => {
    setCaseId("");
    setFullName("");
    setDentistId("");
    setCoordinatorId("");
    setCreating(false);
    creatingRef.current = false;
  };
  const closeCreation = () => {
    setCreateOpen(false);
    setNewPatientOpen(false);
    setExistingPatientOpen(false);
    resetCreation();
  };
  const openNewPatient = () => {
    resetCreation();
    setDentistId(defaultDentist?.id ?? "");
    setCoordinatorId(activeUser?.role === "coordinator" ? activeUser.id : "");
    setCreateOpen(false);
    setNewPatientOpen(true);
  };
  const openExistingPatient = () => {
    resetCreation();
    setCreateOpen(false);
    setExistingPatientOpen(true);
  };
  const createPlan = (selectedCaseId?: string) => {
    if (creatingRef.current || !activeUser || !canCreate) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      let lead: Lead | undefined;
      if (selectedCaseId) {
        const selected = resolveSelectedCase(selectedCaseId, patients, clinicLeads);
        lead = selected.lead;
        const resolvedDentistId = selected.patient?.dentist_id ?? defaultDentist?.id ?? "";
        const resolvedCoordinatorId =
          selected.lead?.assigned_to ??
          selected.patient?.coordinator_id ??
          (activeUser.role === "coordinator" ? activeUser.id : "");
        const patientDraft =
          selected.patient ??
          patientFromLead(lead, assessments, clinicId, resolvedDentistId, resolvedCoordinatorId);
        if (!patientDraft) throw new Error("Select a valid clinic Patient or Lead.");
        lead ??= selected.patient ? latestPatientLead(selected.patient, clinicLeads) : undefined;
        const { plan } = createPatientAndTreatmentPlan(
          {
            patient_id: selected.patient?.id,
            patient: selected.patient ? undefined : patientDraft,
            plan: createPlanRecord(
              patientDraft,
              lead,
              resolvedDentistId,
              resolvedCoordinatorId,
              clinicId,
            ),
          },
          activeUser.id,
        );
        toast.success("Treatment Plan ready");
        closeCreation();
        void navigate({ to: "/dentalplan", search: { treatmentPlanId: plan.id } });
        return;
      } else {
        const name = splitFullName(fullName);
        const patientDraft = {
          clinic_id: clinicId,
          first_name: name.firstName,
          last_name: name.lastName,
          source: "manual" as const,
          dentist_id: dentistId || undefined,
          dentist_ids: dentistId ? [dentistId] : [],
          coordinator_id: coordinatorId || undefined,
        };
        const { plan } = createPatientAndTreatmentPlan(
          {
            patient: patientDraft,
            plan: createPlanRecord(patientDraft, undefined, dentistId, coordinatorId, clinicId),
          },
          activeUser.id,
        );
        toast.success("Treatment Plan ready");
        closeCreation();
        void navigate({ to: "/dentalplan", search: { treatmentPlanId: plan.id } });
      }
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
        description="Prepare, review and share patient treatment plans."
        actions={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Create Treatment Plan
            </Button>
          ) : undefined
        }
      />
      {plans.length > 0 && (
        <div className="space-y-3 rounded-xl border bg-card p-3">
          <div className="overflow-x-auto">
            <ToggleGroup
              type="single"
              value={status}
              onValueChange={(value) => {
                if (!value) return;
                void navigate({
                  to: "/pro/treatment-plans",
                  search: { status: value === "all" ? undefined : (value as PlanFilter) },
                });
              }}
              className="w-max justify-start"
              aria-label="Filter Treatment Plans by status"
            >
              {PLAN_FILTERS.map((filter) => (
                <ToggleGroupItem key={filter} value={filter} className="whitespace-nowrap px-3">
                  {planFilterLabel(filter)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient, country or plan"
              aria-label="Search Treatment Plans"
            />
            <Select value={dentistFilter} onValueChange={setDentistFilter}>
              <SelectTrigger aria-label="Filter by dentist">
                <SelectValue placeholder="All dentists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dentists</SelectItem>
                {clinicUsers
                  .filter((member) => member.role === "dentist")
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={coordinatorFilter} onValueChange={setCoordinatorFilter}>
              <SelectTrigger aria-label="Filter by coordinator">
                <SelectValue placeholder="All coordinators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All coordinators</SelectItem>
                {clinicUsers
                  .filter((member) =>
                    ["coordinator", "clinic_owner", "clinic_admin"].includes(member.role),
                  )
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {plans.length === 0 ? (
        <EmptyState
          title="No treatment plans"
          description="Create a Treatment Plan from a patient or Lead to begin."
          action={
            canCreate ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> Create Treatment Plan
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {filteredPlans.length === 0 ? (
              <EmptyState
                title="No matching Treatment Plans"
                description="Adjust the search or filters to see other plans."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Plan summary</TableHead>
                      <TableHead>Assigned team</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last activity</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan) => {
                      const patient = patients.find((item) => item.id === plan.clinic_patient_id);
                      const dentist = users.find((item) => item.id === plan.dentist_id);
                      const coordinator = users.find((item) => item.id === plan.coordinator_id);
                      const totals = calculateTreatmentPlanTotals(plan);
                      return (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <p className="font-medium">
                              {patient
                                ? `${patient.first_name} ${patient.last_name}`
                                : "Not linked"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {patient?.country ?? "Country unavailable"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="max-w-72 text-sm">{planClinicalSummary(plan)}</p>
                            <p className="max-w-72 truncate text-xs text-muted-foreground">
                              {plan.title}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{dentist?.name ?? "Dentist unassigned"}</p>
                            <p className="text-xs text-muted-foreground">
                              {coordinator?.name ?? "Coordinator unassigned"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={plan.status ?? "draft"} />
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{planActivityLabel(plan)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCrmDate(plan.updated_at)}
                            </p>
                          </TableCell>
                          <TableCell>
                            {totals.total > 0
                              ? formatQuoteMoney(totals.total, plan.currency ?? "EUR")
                              : "Not priced"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <PlanPrimaryAction plan={plan} role={activeUser?.role} />
                              <PlanActions
                                plan={plan}
                                clinicId={clinicId}
                                actorId={activeUser?.id}
                                role={activeUser?.role}
                                updateStatus={updateStatus}
                                markSent={markSent}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <CreatePlanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onNew={openNewPatient}
        onExisting={openExistingPatient}
      />
      <Dialog
        open={newPatientOpen}
        onOpenChange={(open) => (open ? setNewPatientOpen(true) : closeCreation())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New patient plan</DialogTitle>
            <DialogDescription>
              Create the minimum clinic record needed to start planning.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <Button variant="outline" onClick={closeCreation}>
              Cancel
            </Button>
            <Button
              disabled={creating || !canCreate || !fullName.trim()}
              onClick={() => createPlan()}
            >
              {creating ? "Creating…" : "Continue to Treatment Planner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={existingPatientOpen}
        onOpenChange={(open) => (open ? setExistingPatientOpen(true) : closeCreation())}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Open an existing case</DialogTitle>
            <DialogDescription>
              Search clinic Patients and Leads. Selecting a record opens its plan immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Patient or Lead</Label>
            <CaseCombobox
              value={caseId}
              patients={patients}
              leads={clinicLeads}
              onChange={(value) => {
                setCaseId(value);
                createPlan(value);
              }}
            />
          </div>
          {creating && (
            <p className="text-sm text-muted-foreground">Opening Treatment Plannerâ€¦</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreatePlanDialog({
  open,
  onOpenChange,
  onNew,
  onExisting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNew: () => void;
  onExisting: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Treatment Plan</DialogTitle>
          <DialogDescription>
            Start with a new patient or an existing clinic record.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start gap-3 p-3 text-left"
            onClick={onNew}
          >
            <UserRoundPlus className="size-5 shrink-0" />
            <span className="font-medium">New patient</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start gap-3 p-3 text-left"
            onClick={onExisting}
          >
            <UserRound className="size-5 shrink-0" />
            <span className="font-medium">Existing patient</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
                      lead.id,
                      lead.clinic_application_id,
                      lead.assessment_id,
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

function patientFromLead(
  lead: Lead | undefined,
  assessments: Assessment[],
  clinicId: string,
  dentistId: string,
  coordinatorId: string,
) {
  if (!lead) return undefined;
  const assessment = assessments.find((item) => item.id === lead.assessment_id);
  const name = splitFullName(lead.patient_name);
  return {
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
    source: lead.source === "assessment" ? ("smileabroad" as const) : lead.source,
    assessment_id: lead.assessment_id,
    roadmap_id: lead.roadmap_id,
    treatment_interest: lead.treatment,
    dentist_id: dentistId || undefined,
    dentist_ids: dentistId ? [dentistId] : [],
    coordinator_id: coordinatorId || lead.assigned_to,
  };
}

type PlanPatient = Pick<
  Patient,
  | "first_name"
  | "last_name"
  | "treatment_interest"
  | "assessment_id"
  | "roadmap_id"
  | "dentist_id"
  | "coordinator_id"
>;

function createPlanRecord(
  patient: PlanPatient,
  lead: Lead | undefined,
  dentistId: string,
  coordinatorId: string,
  clinicId: string,
): Parameters<
  ReturnType<typeof useMockStore.getState>["createPatientAndTreatmentPlan"]
>[0]["plan"] {
  return {
    clinic_id: clinicId,
    lead_id: lead?.id,
    clinic_application_id: lead?.clinic_application_id,
    assessment_id: lead?.assessment_id ?? patient.assessment_id,
    roadmap_id: lead?.roadmap_id ?? patient.roadmap_id,
    dentist_id: dentistId || patient.dentist_id,
    dentist_ids: dentistId || patient.dentist_id ? [dentistId || patient.dentist_id!] : [],
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

function patientName(patient: Pick<Patient, "first_name" | "last_name">) {
  return `${patient.first_name} ${patient.last_name}`.trim();
}

function safeDate(value?: string) {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function planFilterLabel(filter: PlanFilter) {
  const labels: Record<PlanFilter, string> = {
    all: "All",
    draft: "Draft",
    doctor_review: "Doctor Review",
    approved: "Ready to Share",
    sent: "Sent",
    viewed: "Viewed",
    accepted: "Accepted",
  };
  return labels[filter];
}

function planClinicalSummary(plan: TreatmentPlan) {
  const counts = new Map<string, number>();
  for (const item of Array.isArray(plan.items) ? plan.items : []) {
    const label = treatmentLabel(item.treatment);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  if (counts.size === 0) return "Clinical plan not started";
  return Array.from(counts.entries())
    .slice(0, 3)
    .map(([label, count]) => `${label} ×${count}`)
    .join(" · ");
}

function planActivityLabel(plan: TreatmentPlan) {
  switch (plan.status ?? "draft") {
    case "doctor_review":
      return "Sent for Doctor Review";
    case "approved":
      return "Approved";
    case "sent":
      return "Sent to patient";
    case "viewed":
      return "Viewed by patient";
    case "accepted":
      return "Accepted by patient";
    case "declined":
      return "Declined by patient";
    case "expired":
      return "Expired";
    default:
      return "Last edited";
  }
}

function PlanPrimaryAction({ plan, role }: { plan: TreatmentPlan; role?: string }) {
  const status = plan.status ?? "draft";
  if (["sent", "viewed"].includes(status) && plan.share_token) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link
          to="/shared/treatment-plan/$token"
          params={{ token: plan.share_token }}
          search={{ preview: true }}
        >
          Open Patient View
        </Link>
      </Button>
    );
  }
  const label =
    status === "draft"
      ? "Continue Planning"
      : status === "doctor_review"
        ? "Open Review"
        : status === "approved" &&
            ["clinic_owner", "clinic_admin", "coordinator"].includes(role ?? "")
          ? "Open & Share"
          : "Open Plan";
  return (
    <Button asChild size="sm" variant={status === "draft" ? "default" : "outline"}>
      <Link to="/dentalplan" search={{ treatmentPlanId: plan.id }}>
        {label}
      </Link>
    </Button>
  );
}

function PlanActions({
  plan,
  clinicId,
  actorId,
  role,
  updateStatus,
  markSent,
}: {
  plan: ReturnType<typeof useMockStore.getState>["treatmentPlans"][number];
  clinicId: string;
  actorId?: string;
  role?: string;
  updateStatus: ReturnType<typeof useMockStore.getState>["updateTreatmentPlanStatus"];
  markSent: ReturnType<typeof useMockStore.getState>["markTreatmentPlanSent"];
}) {
  const copyLink = () => {
    if (!plan.share_token) return;
    void navigator.clipboard.writeText(
      `${window.location.origin}/shared/treatment-plan/${plan.share_token}`,
    );
    toast.success("Share link copied");
  };
  const canSubmitReview = ["clinic_owner", "clinic_admin", "coordinator"].includes(role ?? "");
  const canShare = ["clinic_owner", "clinic_admin", "coordinator"].includes(role ?? "");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${plan.title}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {plan.clinic_patient_id && (
          <DropdownMenuItem asChild>
            <Link to="/pro/patients/$id" params={{ id: plan.clinic_patient_id }}>
              Open Patient
            </Link>
          </DropdownMenuItem>
        )}
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
        {plan.share_token && isTreatmentPlanPubliclyViewable(plan.status) && canShare && (
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
        {(plan.status ?? "draft") === "approved" && canShare && (
          <DropdownMenuItem
            onClick={() => {
              markSent(plan.id, clinicId, actorId);
              toast.success("Treatment Plan marked as sent");
            }}
          >
            Mark as Sent
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
