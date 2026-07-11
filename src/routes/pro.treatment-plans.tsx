import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMockStore, selectClinicPlans } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useShallow } from "zustand/react/shallow";
import { formatCrmDate } from "@/lib/format";
import { formatQuoteMoney } from "@/lib/quote";

export const Route = createFileRoute("/pro/treatment-plans")({ component: Plans });

function Plans() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const clinicId = useAuth((s) => s.user?.clinic_id) ?? "clinic_istanbul";
  const plans = useMockStore(useShallow(selectClinicPlans(clinicId)));
  const patients = useMockStore(
    useShallow((s) => s.patients.filter((p) => p.clinic_id === clinicId)),
  );
  if (pathname !== "/pro/treatment-plans") return <Outlet />;
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Treatment plans"
        description="FDI-based plans prepared for clinic patients."
      />
      {plans.length === 0 ? (
        <EmptyState
          title="No treatment plans"
          description="Create a treatment plan from a patient record to begin clinical planning."
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Estimated total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  const patient = patients.find((item) => item.id === plan.clinic_patient_id);
                  const items = Array.isArray(plan.items) ? plan.items : [];
                  const estimatedTotal = items.reduce(
                    (sum, item) => sum + (Number(item.unit_price) || 0),
                    0,
                  );
                  const updatedAt =
                    plan.updated_at && !Number.isNaN(Date.parse(plan.updated_at))
                      ? formatCrmDate(plan.updated_at)
                      : "Not updated";
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.title}</TableCell>
                      <TableCell>
                        {patient ? `${patient.first_name} ${patient.last_name}` : "Not linked"}
                      </TableCell>
                      <TableCell>{items.length}</TableCell>
                      <TableCell>{formatQuoteMoney(estimatedTotal, "EUR")}</TableCell>
                      <TableCell>
                        <StatusBadge status={plan.status ?? "draft"} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{updatedAt}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          to="/pro/treatment-plans/$id"
                          params={{ id: plan.id }}
                          className="text-sm text-primary hover:underline"
                        >
                          Open planner
                        </Link>
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
