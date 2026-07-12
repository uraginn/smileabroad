import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export const Route = createFileRoute("/pro/treatment-plans")({ component: Plans });

function Plans() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeUser = useAuth((state) => state.user);
  const clinicId = activeUser?.clinic_id ?? "clinic_istanbul";
  const plans = useMockStore(useShallow(selectClinicPlans(clinicId)));
  const patients = useMockStore(
    useShallow((state) => state.patients.filter((patient) => patient.clinic_id === clinicId)),
  );
  const users = useMockStore((state) => state.users);
  const updateStatus = useMockStore((state) => state.updateTreatmentPlanStatus);
  if (pathname !== "/pro/treatment-plans") return <Outlet />;
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Treatment Plans"
        description="Prepare clinical care, travel, pricing, review and sharing in one patient-document workspace."
      />
      {plans.length === 0 ? (
        <EmptyState
          title="No treatment plans"
          description="Create a Treatment Plan from a patient or Lead to begin."
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
