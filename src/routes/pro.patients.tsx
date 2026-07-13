import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { PatientFormDialog } from "@/components/patient-form-dialog";
import { useAuth } from "@/lib/auth/mock-auth";
import { getFollowUpState } from "@/lib/lead-workflow";
import {
  derivePatientOperationalStatus,
  getActivePatientPlan,
  getPatientNextFollowUp,
} from "@/lib/patient-workspace";
import { selectClinicPatients, useMockStore } from "@/lib/mock/store";
import { formatCrmDate } from "@/lib/format";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/pro/patients")({
  validateSearch: (search: Record<string, unknown>): { create?: boolean } => ({
    create:
      search.create === true || search.create === "true" || search.create === "1"
        ? true
        : undefined,
  }),
  component: Patients,
});

function Patients() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { create } = Route.useSearch();
  const navigate = useNavigate();
  const clinicId = useAuth((state) => state.user?.clinic_id) ?? "";
  const patients = useMockStore(useShallow(selectClinicPatients(clinicId)));
  const leads = useMockStore((state) => state.leads);
  const plans = useMockStore((state) => state.treatmentPlans);
  const followUps = useMockStore((state) => state.followUps);
  const files = useMockStore((state) => state.files);
  const appointments = useMockStore((state) => state.appointments);
  const users = useMockStore((state) => state.users);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coordinator, setCoordinator] = useState("all");
  const [dentist, setDentist] = useState("all");
  const [country, setCountry] = useState("all");
  const [language, setLanguage] = useState("all");
  const [planStatus, setPlanStatus] = useState("all");
  const [followUpState, setFollowUpState] = useState("all");
  const [hasFiles, setHasFiles] = useState("all");
  const [source, setSource] = useState("all");
  const [patientStatus, setPatientStatus] = useState("all");
  useEffect(() => {
    if (create) setAddOpen(true);
  }, [create]);
  const rows = useMemo(
    () =>
      patients.map((patient) => {
        const patientLeads = leads.filter(
          (item) =>
            item.clinic_id === clinicId &&
            (item.clinic_patient_id === patient.id || item.patient_user_id === patient.user_id),
        );
        const lead = patientLeads
          .slice()
          .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))[0];
        const plan = getActivePatientPlan(plans, patient);
        const nextFollowUp = getPatientNextFollowUp(
          followUps,
          patient,
          patientLeads.map((item) => item.id),
        );
        const upcomingAppointment = appointments.some(
          (item) =>
            item.clinic_id === clinicId &&
            (item.patient_user_id === patient.user_id || item.patient_user_id === patient.id) &&
            new Date(item.starts_at) >= new Date(),
        );
        const status = derivePatientOperationalStatus({
          patient,
          lead,
          plan,
          hasUpcomingAppointment: upcomingAppointment,
        });
        const patientFiles = files.filter(
          (item) =>
            (!item.clinic_id || item.clinic_id === clinicId) &&
            (item.patient_user_id === patient.user_id || item.patient_user_id === patient.id),
        );
        return { patient, lead, plan, nextFollowUp, status, patientFiles };
      }),
    [appointments, clinicId, files, followUps, leads, patients, plans],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter(({ patient, lead, plan, nextFollowUp, status, patientFiles }) => {
      const searchable = [
        patient.first_name,
        patient.last_name,
        patient.email,
        patient.phone,
        patient.whatsapp,
        plan?.id,
        plan?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (!normalized || searchable.includes(normalized)) &&
        (coordinator === "all" || (patient.coordinator_id ?? lead?.assigned_to) === coordinator) &&
        (dentist === "all" || (patient.dentist_id ?? plan?.dentist_id) === dentist) &&
        (country === "all" || patient.country === country) &&
        (language === "all" || patient.language === language) &&
        (planStatus === "all" || (plan?.status ?? "none") === planStatus) &&
        (followUpState === "all" ||
          (nextFollowUp ? getFollowUpState(nextFollowUp) : "none") === followUpState) &&
        (hasFiles === "all" ||
          (hasFiles === "yes" ? patientFiles.length > 0 : patientFiles.length === 0)) &&
        (source === "all" || (patient.source ?? lead?.source) === source) &&
        (patientStatus === "all" || status === patientStatus)
      );
    });
  }, [
    coordinator,
    country,
    dentist,
    followUpState,
    hasFiles,
    language,
    patientStatus,
    planStatus,
    query,
    rows,
    source,
  ]);
  const clinicUsers = users.filter((item) => item.clinic_id === clinicId && item.active !== false);
  const countries = [...new Set(patients.map((item) => item.country))].sort();
  const languages = [...new Set(patients.map((item) => item.language).filter(Boolean))] as string[];
  if (pathname !== "/pro/patients") return <Outlet />;
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Patients"
        description="Long-term clinic-owned patient records and current care context."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add Patient
          </Button>
        }
      />
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, phone or plan"
            aria-label="Search patients"
          />
          <Filter
            label="Coordinator"
            value={coordinator}
            onChange={setCoordinator}
            options={clinicUsers
              .filter((item) => ["coordinator", "clinic_owner", "clinic_admin"].includes(item.role))
              .map((item) => ({ value: item.id, label: item.name }))}
          />
          <Filter
            label="Dentist"
            value={dentist}
            onChange={setDentist}
            options={clinicUsers
              .filter((item) => item.role === "dentist")
              .map((item) => ({ value: item.id, label: item.name }))}
          />
          <Filter
            label="Country"
            value={country}
            onChange={setCountry}
            options={countries.map((item) => ({ value: item, label: item }))}
          />
          <Filter
            label="Language"
            value={language}
            onChange={setLanguage}
            options={languages.map((item) => ({ value: item, label: item }))}
          />
          <Filter
            label="Plan status"
            value={planStatus}
            onChange={setPlanStatus}
            options={[
              "draft",
              "doctor_review",
              "approved",
              "sent",
              "viewed",
              "accepted",
              "none",
            ].map((item) => ({ value: item, label: item.replace(/_/g, " ") }))}
          />
          <Filter
            label="Follow-up"
            value={followUpState}
            onChange={setFollowUpState}
            options={["overdue", "due_today", "upcoming", "none"].map((item) => ({
              value: item,
              label: item.replace(/_/g, " "),
            }))}
          />
          <Filter
            label="Files"
            value={hasFiles}
            onChange={setHasFiles}
            options={[
              { value: "yes", label: "Has files" },
              { value: "no", label: "No files" },
            ]}
          />
          <Filter
            label="Source"
            value={source}
            onChange={setSource}
            options={["smileabroad", "assessment", "referral", "manual", "campaign"].map(
              (item) => ({
                value: item,
                label: item,
              }),
            )}
          />
          <Filter
            label="Status"
            value={patientStatus}
            onChange={setPatientStatus}
            options={[
              "new",
              "active",
              "treatment_planning",
              "plan_sent",
              "accepted",
              "scheduled",
              "in_treatment",
              "completed",
              "inactive",
            ].map((item) => ({ value: item, label: item.replace(/_/g, " ") }))}
          />
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setCoordinator("all");
              setDentist("all");
              setCountry("all");
              setLanguage("all");
              setPlanStatus("all");
              setFollowUpState("all");
              setHasFiles("all");
              setSource("all");
              setPatientStatus("all");
            }}
          >
            Clear filters
          </Button>
        </CardContent>
      </Card>
      {filtered.length ? (
        <>
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Last activity</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <PatientRow key={row.patient.id} {...row} users={users} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="grid gap-3 md:hidden">
            {filtered.map((row) => (
              <MobilePatient key={row.patient.id} {...row} users={users} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="No matching patients"
          description="Try a different filter or add a patient."
          action={<Button onClick={() => setAddOpen(true)}>Add Patient</Button>}
        />
      )}
      <PatientFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={(patient) =>
          void navigate({ to: "/pro/patients/$id", params: { id: patient.id } })
        }
      />
    </div>
  );
}
type PatientRowData = ReturnType<typeof useMockStore.getState>["patients"][number] extends never
  ? never
  : {
      patient: ReturnType<typeof useMockStore.getState>["patients"][number];
      lead?: ReturnType<typeof useMockStore.getState>["leads"][number];
      plan?: ReturnType<typeof useMockStore.getState>["treatmentPlans"][number];
      nextFollowUp?: ReturnType<typeof useMockStore.getState>["followUps"][number];
      status: string;
      patientFiles: ReturnType<typeof useMockStore.getState>["files"];
    };
function PatientRow({
  patient,
  lead,
  plan,
  nextFollowUp,
  status,
  users,
}: PatientRowData & { users: ReturnType<typeof useMockStore.getState>["users"] }) {
  const coordinator = users.find(
    (item) => item.id === (patient.coordinator_id ?? lead?.assigned_to),
  );
  const dentist = users.find((item) => item.id === (patient.dentist_id ?? plan?.dentist_id));
  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">
          {patient.first_name} {patient.last_name}
        </p>
        <p className="text-xs text-muted-foreground">
          {patient.country} · {patient.language || "Language not set"}
        </p>
      </TableCell>
      <TableCell>
        <p>{patient.email}</p>
        <p className="text-xs text-muted-foreground">
          {patient.whatsapp ?? patient.phone ?? "No phone"}
        </p>
      </TableCell>
      <TableCell>
        <p>{coordinator?.name ?? "No coordinator"}</p>
        <p className="text-xs text-muted-foreground">{dentist?.name ?? "No dentist"}</p>
      </TableCell>
      <TableCell>
        <StatusBadge status={status} />
      </TableCell>
      <TableCell>
        {nextFollowUp ? (
          <>
            <Badge variant="outline" className="capitalize">
              {getFollowUpState(nextFollowUp).replace(/_/g, " ")}
            </Badge>
            <p className="mt-1 text-xs">{formatCrmDate(nextFollowUp.due_at)}</p>
          </>
        ) : (
          "Not scheduled"
        )}
      </TableCell>
      <TableCell>{plan ? <StatusBadge status={plan.status ?? "draft"} /> : "No plan"}</TableCell>
      <TableCell>{formatCrmDate(lead?.last_activity_at ?? patient.updated_at)}</TableCell>
      <TableCell>
        <Button asChild variant="ghost" size="sm">
          <Link to="/pro/patients/$id" params={{ id: patient.id }}>
            Open Patient
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
function MobilePatient(
  props: PatientRowData & { users: ReturnType<typeof useMockStore.getState>["users"] },
) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <PatientRowSummary {...props} />
        <Button asChild className="w-full">
          <Link to="/pro/patients/$id" params={{ id: props.patient.id }}>
            Open Patient
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
function PatientRowSummary({ patient, plan, nextFollowUp, status }: PatientRowData) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {patient.first_name} {patient.last_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {patient.country} · {patient.email}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{plan?.status?.replace(/_/g, " ") ?? "No plan"}</Badge>
        <Badge variant="outline">
          {nextFollowUp ? getFollowUpState(nextFollowUp).replace(/_/g, " ") : "No follow-up"}
        </Badge>
      </div>
    </>
  );
}
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {options.map((item) => (
          <SelectItem key={item.value} value={item.value} className="capitalize">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
