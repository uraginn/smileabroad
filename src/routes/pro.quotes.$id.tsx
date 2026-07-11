import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, Building2, UserRound } from "lucide-react";
import { calculateQuoteTotals } from "@/lib/quote";
import type { ReactNode } from "react";

export const Route = createFileRoute("/pro/quotes/$id")({ component: QuoteEditor });

function QuoteEditor() {
  const { id } = Route.useParams();
  const hydrated = useMockStoreHydrated();
  const quote = useMockStore((s) => s.quotes.find((q) => q.id === id));
  const clinic = useMockStore((s) => s.clinics.find((item) => item.id === quote?.clinic_id));
  const patient = useMockStore((s) =>
    s.patients.find((item) => item.id === quote?.clinic_patient_id),
  );
  const plan = useMockStore((s) =>
    s.treatmentPlans.find((item) => item.id === quote?.treatment_plan_id),
  );
  if (!hydrated) return null;
  if (!quote) throw notFound();
  const { subtotal, total } = calculateQuoteTotals(quote);
  const c = quote.currency === "USD" ? "$" : "€";
  return (
    <div className="p-4 sm:p-6 max-w-5xl space-y-4">
      <PageHeader
        title={`Quote ${quote.id.slice(0, 8)}`}
        description={quote.notes}
        actions={
          quote.share_token && (
            <Button asChild variant="outline">
              <Link to="/shared/treatment-plan/$token" params={{ token: quote.share_token }}>
                <ExternalLink className="size-4 mr-1" /> Preview shared
              </Link>
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Meta
            label="Clinic"
            value={clinic?.name ?? quote.clinic_id}
            icon={<Building2 className="size-4" />}
          />
          <Meta
            label="Patient"
            value={patient ? `${patient.first_name} ${patient.last_name}` : "Not linked"}
            icon={<UserRound className="size-4" />}
          />
          <Meta label="Treatment plan" value={plan?.title ?? quote.treatment_plan_id} />
          <Meta label="Currency" value={quote.currency} />
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              Status: {quote.status ?? "draft"}
            </Badge>
            {quote.share_token ? (
              <Badge variant="outline">Shared link ready</Badge>
            ) : (
              <Badge variant="outline">Shared link unavailable</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.label}</TableCell>
                  <TableCell className="text-right">{i.qty}</TableCell>
                  <TableCell className="text-right">
                    {c}
                    {i.unit_price}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {c}
                    {(i.qty * i.unit_price).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t pt-4 space-y-1 text-sm">
            <Row k="Subtotal" v={`${c}${subtotal.toLocaleString()}`} />
            <Row k="Hotel" v={`${c}${quote.hotel_total.toLocaleString()}`} />
            <Row k="Transfers" v={`${c}${quote.transfer_total.toLocaleString()}`} />
            <Row k="Discount" v={`- ${c}${quote.discount.toLocaleString()}`} />
            <div className="pt-2 border-t flex justify-between font-display text-lg font-semibold">
              <span>Total</span>
              <span>
                {c}
                {total.toLocaleString()}
              </span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Payment schedule</h3>
            {quote.payment_schedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payment schedule defined for this draft quote.
              </p>
            ) : (
              <div className="space-y-1">
                {quote.payment_schedule.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm p-2 bg-surface rounded">
                    <span>
                      {p.label} <span className="text-muted-foreground">({p.due})</span>
                    </span>
                    <span>
                      {c}
                      {p.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 bg-surface/50">
            <h3 className="text-sm font-semibold mb-2">Shared plan link area</h3>
            {quote.share_token ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/shared/treatment-plan/$token" params={{ token: quote.share_token }}>
                  <ExternalLink className="size-4 mr-1" /> Open patient-facing preview
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Shared token is not available for this quote yet.
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground border-t pt-4">
            Estimates are subject to clinical examination on arrival.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}

function Meta({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border p-3 bg-surface/50">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium mt-1 line-clamp-2">{value}</p>
    </div>
  );
}
