import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { PageHeader, PageLoading, StatusBadge } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { calculateQuoteTotals, formatQuoteMoney } from "@/lib/quote";
import type { Quote, QuoteCurrency, QuoteStatus } from "@/types/models";
import { useState } from "react";
import { useAuth } from "@/lib/auth/mock-auth";
import { toast } from "sonner";
import { formatCrmDate } from "@/lib/format";

export const Route = createFileRoute("/pro/quotes/$id")({ component: QuoteEditor });

function QuoteEditor() {
  const { id } = Route.useParams();
  const activeUser = useAuth((s) => s.user);
  const hydrated = useMockStoreHydrated();
  const quote = useMockStore((s) =>
    s.quotes.find((item) => item.id === id && item.clinic_id === activeUser?.clinic_id),
  );
  if (!hydrated) return <PageLoading label="Loading quote" />;
  if (!quote) throw notFound();
  return <QuoteForm quote={quote} actorId={activeUser?.id ?? "system"} />;
}

function QuoteForm({ quote, actorId }: { quote: Quote; actorId: string }) {
  const patient = useMockStore((s) =>
    s.patients.find(
      (item) =>
        item.clinic_id === quote.clinic_id &&
        (item.id === quote.clinic_patient_id || item.user_id === quote.patient_user_id),
    ),
  );
  const plan = useMockStore((s) =>
    s.treatmentPlans.find(
      (item) => item.id === quote.treatment_plan_id && item.clinic_id === quote.clinic_id,
    ),
  );
  const updateQuote = useMockStore((s) => s.updateQuote);
  const [currency, setCurrency] = useState<QuoteCurrency>(quote.currency);
  const [hotelTotal, setHotelTotal] = useState(quote.hotel_total);
  const [transferTotal, setTransferTotal] = useState(quote.transfer_total);
  const [discount, setDiscount] = useState(quote.discount);
  const [notes, setNotes] = useState(quote.notes ?? "");
  const [validUntil, setValidUntil] = useState(quote.valid_until ?? "");
  const [includedServices, setIncludedServices] = useState(
    (quote.included_services ?? []).join("\n"),
  );
  const [excludedServices, setExcludedServices] = useState(
    (quote.excluded_services ?? []).join("\n"),
  );
  const [patientMessage, setPatientMessage] = useState(quote.patient_message ?? "");
  const [status, setStatus] = useState<QuoteStatus>(quote.status ?? "draft");
  const [payments, setPayments] = useState<Quote["payment_schedule"]>(quote.payment_schedule);
  const draftQuote: Quote = {
    ...quote,
    currency,
    hotel_total: hotelTotal,
    transfer_total: transferTotal,
    discount,
    notes,
    status,
    payment_schedule: payments,
    valid_until: validUntil || undefined,
    included_services: splitLines(includedServices),
    excluded_services: splitLines(excludedServices),
    patient_message: patientMessage || undefined,
  };
  const { subtotal, total } = calculateQuoteTotals(draftQuote);
  const paymentTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const setPayment = (index: number, patch: Partial<Quote["payment_schedule"][number]>) =>
    setPayments((current) =>
      current.map((payment, itemIndex) =>
        itemIndex === index ? { ...payment, ...patch } : payment,
      ),
    );
  const save = () => {
    updateQuote(
      quote.id,
      {
        currency,
        hotel_total: hotelTotal,
        transfer_total: transferTotal,
        discount,
        notes,
        status,
        payment_schedule: payments,
        valid_until: validUntil || undefined,
        included_services: splitLines(includedServices),
        excluded_services: splitLines(excludedServices),
        patient_message: patientMessage || undefined,
      },
      actorId,
    );
    toast.success("Quote saved");
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl space-y-4">
      <PageHeader
        title={`Quote ${quote.id.slice(0, 8)}`}
        description={plan?.title ?? "Treatment plan quote"}
        actions={
          <div className="flex gap-2">
            {quote.share_token && (
              <Button asChild variant="outline">
                <Link to="/shared/treatment-plan/$token" params={{ token: quote.share_token }}>
                  <ExternalLink className="size-4 mr-1" /> Preview shared
                </Link>
              </Button>
            )}
            <Button onClick={save}>Save quote</Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Meta
            label="Patient"
            value={patient ? `${patient.first_name} ${patient.last_name}` : "Not linked"}
          />
          <Meta label="Treatment plan" value={plan?.title ?? quote.treatment_plan_id} />
          <Meta label="Items" value={`${quote.items.length}`} />
          <Meta label="Updated" value={formatCrmDate(quote.updated_at, true)} />
          <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
            <StatusBadge status={quote.status} />
            {quote.share_token && <Badge variant="outline">Shared link ready</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="rounded-lg border bg-surface/50 p-4 text-sm">
            <p className="font-medium">Patient-facing preview</p>
            <p className="mt-1 text-muted-foreground">
              Clinical summary, dental procedures, stages, materials and risks come from the linked
              Treatment Plan. This page manages commercial quote content only.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Field label="Currency">
              <Select
                value={currency}
                onValueChange={(value) => setCurrency(value as QuoteCurrency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GBP", "EUR", "USD", "TRY"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <MoneyInput label="Hotel total" value={hotelTotal} onChange={setHotelTotal} />
            <MoneyInput label="Transfer total" value={transferTotal} onChange={setTransferTotal} />
            <MoneyInput label="Discount" value={discount} onChange={setDiscount} />
            <Field label="Status">
              <Select value={status} onValueChange={(value) => setStatus(value as QuoteStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["draft", "approved", "sent", "viewed", "accepted", "declined", "expired"].map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {value.replace(/_/g, " ")}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Valid until">
              <Input
                type="date"
                value={validUntil}
                onChange={(event) => setValidUntil(event.target.value)}
              />
            </Field>
            <Field label="Patient message">
              <Textarea
                value={patientMessage}
                onChange={(event) => setPatientMessage(event.target.value)}
                rows={3}
              />
            </Field>
            <Field label="Included services">
              <Textarea
                value={includedServices}
                onChange={(event) => setIncludedServices(event.target.value)}
                rows={4}
                placeholder="One service per line"
              />
            </Field>
            <Field label="Excluded services">
              <Textarea
                value={excludedServices}
                onChange={(event) => setExcludedServices(event.target.value)}
                rows={4}
                placeholder="One service per line"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">Treatment items</h3>
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
              {quote.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.label}</TableCell>
                  <TableCell className="text-right">{item.qty}</TableCell>
                  <TableCell className="text-right">
                    {formatQuoteMoney(item.unit_price, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatQuoteMoney(item.qty * item.unit_price, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t pt-3 space-y-1 text-sm">
            <Row label="Subtotal" value={formatQuoteMoney(subtotal, currency)} />
            <Row label="Hotel" value={formatQuoteMoney(hotelTotal, currency)} />
            <Row label="Transfers" value={formatQuoteMoney(transferTotal, currency)} />
            <Row label="Discount" value={`- ${formatQuoteMoney(discount, currency)}`} />
            <div className="border-t pt-2 mt-2">
              <Row label="Total" value={formatQuoteMoney(total, currency)} strong />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between gap-3">
            <div>
              <h3 className="font-semibold">Payment schedule</h3>
              <p className="text-xs text-muted-foreground">
                Payments do not need to equal the quote total.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPayments((current) => [...current, { label: "Payment", amount: 0, due: "" }])
              }
            >
              <Plus className="size-4 mr-1" /> Add payment
            </Button>
          </div>
          {paymentTotal > total && (
            <p className="text-sm text-destructive">
              Payment schedule exceeds the quote total by{" "}
              {formatQuoteMoney(paymentTotal - total, currency)}.
            </p>
          )}
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment schedule defined.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment, index) => (
                <div key={index} className="grid sm:grid-cols-[1fr_160px_1fr_auto] gap-2">
                  <Input
                    aria-label={`Payment ${index + 1} label`}
                    value={payment.label}
                    onChange={(event) => setPayment(index, { label: event.target.value })}
                  />
                  <Input
                    aria-label={`Payment ${index + 1} amount`}
                    type="number"
                    min={0}
                    value={payment.amount}
                    onChange={(event) =>
                      setPayment(index, { amount: Number(event.target.value) || 0 })
                    }
                  />
                  <Input
                    aria-label={`Payment ${index + 1} due`}
                    value={payment.due}
                    onChange={(event) => setPayment(index, { due: event.target.value })}
                    placeholder="Due description"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setPayments((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
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
function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </Field>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold text-lg" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 bg-surface/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-1 line-clamp-2">{value}</p>
    </div>
  );
}
function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
