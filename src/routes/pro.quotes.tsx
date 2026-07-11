import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMockStore, selectClinicQuotes } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useShallow } from "zustand/react/shallow";
import { calculateQuoteTotals, formatQuoteMoney } from "@/lib/quote";

export const Route = createFileRoute("/pro/quotes")({ component: Quotes });

function Quotes() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const clinicId = useAuth((s) => s.user?.clinic_id) ?? "clinic_istanbul";
  const quotes = useMockStore(useShallow(selectClinicQuotes(clinicId)));
  const patients = useMockStore(
    useShallow((s) => s.patients.filter((p) => p.clinic_id === clinicId)),
  );
  if (pathname !== "/pro/quotes") return <Outlet />;
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Quotes" description="Quotes linked to clinic treatment plans." />
      {quotes.length === 0 ? (
        <EmptyState title="No quotes yet" />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payments</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shared</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => {
                  const { total } = calculateQuoteTotals(quote);
                  const patient = patients.find((item) => item.id === quote.clinic_patient_id || item.user_id === quote.patient_user_id);
                  return (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">Quote {quote.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        {patient ? `${patient.first_name} ${patient.last_name}` : "Not linked"}
                      </TableCell>
                      <TableCell>{quote.items.length}</TableCell>
                      <TableCell>{quote.payment_schedule.length}</TableCell>
                      <TableCell>
                        {formatQuoteMoney(total, quote.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={quote.status} />
                      </TableCell>
                      <TableCell>
                        {quote.share_token ? <Badge variant="outline">Available</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to="/pro/quotes/$id"
                          params={{ id: quote.id }}
                          className="text-sm text-primary hover:underline"
                        >
                          Open
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
