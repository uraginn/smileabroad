import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatCrmDate } from "@/lib/format";
import { useMockStore, selectClinicPlans } from "@/lib/mock/store";
import { formatQuoteMoney } from "@/lib/quote";
import { calculateTreatmentPlanTotals } from "@/lib/treatment-plan-commercial";
import { isTreatmentPlanPubliclyViewable } from "@/lib/treatment-plan-status";

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
  const [patientId, setPatientId] = useState("");
  const [dentistId, setDentistId] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");
  const clinicId = activeUser?.clinic_id ?? "clinic_istanbul";
  const plans = useMockStore(useShallow(selectClinicPlans(clinicId)));
  const patients = useMockStore(
    useShallow((state) => state.patients.filter((patient) => patient.clinic_id === clinicId)),
  );
  const users = useMockStore((state) => state.users);
  const leads = useMockStore((state) => state.leads);
  const addTreatmentPlan = useMockStore((state) => state.addTreatmentPlan);
  const updateStatus = useMockStore((state) => state.updateTreatmentPlanStatus);
  useEffect(() => {
    if (create) setCreateOpen(true);
  }, [create]);
  if (pathname !== "/pro/treatment-plans") return <Outlet />;
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Treatment Plans"
        description="Prepare clinical care, travel, pricing, review and sharing in one patient-document workspace."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Create Treatment Plan
          </Button>
        }
      />
      {plans.length === 0 ? (
        <EmptyState
          title="No treatment plans"
          description="Create a Treatment Plan from a patient or Lead to begin."
          action={<Button onClick={() => setCreateOpen(true)}>Create Treatment Plan</Button>}
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
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Treatment Plan</DialogTitle>
            <DialogDescription>
              Select the patient and assignment, then continue directly to the planner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Patient or Lead</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => {
                    const lead = leads.find(
                      (item) =>
                        item.clinic_id === clinicId && item.clinic_patient_id === patient.id,
                    );
                    return (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                        {lead ? ` · ${lead.treatment}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AssignmentSelect
                label="Assigned dentist"
                value={dentistId}
                onChange={setDentistId}
                users={users.filter(
                  (user) =>
                    user.clinic_id === clinicId && user.role === "dentist" && user.active !== false,
                )}
              />
              <AssignmentSelect
                label="Assigned coordinator"
                value={coordinatorId}
                onChange={setCoordinatorId}
                users={users.filter(
                  (user) =>
                    user.clinic_id === clinicId &&
                    ["coordinator", "clinic_owner", "clinic_admin"].includes(user.role) &&
                    user.active !== false,
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!patientId}
              onClick={() => {
                const patient = patients.find((item) => item.id === patientId);
                if (!patient) return;
                const lead = leads.find(
                  (item) => item.clinic_id === clinicId && item.clinic_patient_id === patient.id,
                );
                const plan = addTreatmentPlan(
                  {
                    clinic_id: clinicId,
                    patient_user_id: patient.user_id ?? patient.id,
                    clinic_patient_id: patient.id,
                    lead_id: lead?.id,
                    clinic_application_id: lead?.clinic_application_id,
                    assessment_id: lead?.assessment_id ?? patient.assessment_id,
                    roadmap_id: lead?.roadmap_id ?? patient.roadmap_id,
                    dentist_id: dentistId || undefined,
                    coordinator_id: coordinatorId || lead?.assigned_to,
                    title: patient.treatment_interest
                      ? `${patient.treatment_interest} treatment plan`
                      : `Treatment plan for ${patient.first_name} ${patient.last_name}`,
                    summary: "Draft clinical treatment plan.",
                    items: [],
                    visits: 1,
                    healing_weeks: 0,
                    status: "draft",
                  },
                  activeUser?.id,
                );
                setCreateOpen(false);
                void navigate({ to: "/dentalplan", search: { treatmentPlanId: plan.id } });
              }}
            >
              Continue to Treatment Planner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
      <Select value={value} onValueChange={onChange} disabled={!users.length}>
        <SelectTrigger>
          <SelectValue placeholder={users.length ? "Optional" : "No users configured"} />
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!users.length && (
        <p className="text-xs text-muted-foreground">Configure clinic users in Settings.</p>
      )}
    </div>
  );
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
        {(plan.status ?? "draft") === "draft" && (
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
