import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { formatQuoteMoney } from "@/lib/quote";
import type { DentalPlan } from "../types/dental-plan.types";
import { calculateCommercial, syncPricingItems } from "../utils/commercial";
export function PricingStep({
  plan,
  change,
  treatmentDefaults = [],
}: {
  plan: DentalPlan;
  change: (patch: Partial<DentalPlan>) => void;
  treatmentDefaults?: Array<{
    id?: string;
    treatmentKey: string;
    displayName: string;
    prices: Partial<Record<DentalPlan["commercial"]["currency"], number>>;
  }>;
}) {
  const commercial = plan.commercial;
  const update = (patch: Partial<typeof commercial>) =>
    change({ commercial: { ...commercial, ...patch } });
  const synced = syncPricingItems(plan, treatmentDefaults);
  const billableCommercial = {
    ...commercial,
    hotelTotal: plan.travel.hotelIncluded ? commercial.hotelTotal : 0,
    transferTotal:
      plan.travel.includedServices.includes("Airport Transfer") ||
      plan.travel.includedServices.includes("Hotel Transfer")
        ? commercial.transferTotal
        : 0,
  };
  const totals = calculateCommercial(billableCommercial);
  const previousTotal = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (JSON.stringify(synced) !== JSON.stringify(commercial.items)) update({ items: synced });
    // Sync only when dental treatment structure changes; prices are retained by treatment ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.proposedTreatments, commercial.currency, treatmentDefaults]);
  useEffect(() => {
    if (commercial.paymentSchedule.length >= 2) return;
    update({
      paymentSchedule: [
        ...(commercial.paymentSchedule.length
          ? commercial.paymentSchedule
          : [
              {
                id: crypto.randomUUID(),
                label: "1st Visit",
                amount: 0,
                due: "Due at first visit",
              },
            ]),
        { id: crypto.randomUUID(), label: "2nd Visit", amount: 0, due: "Due at second visit" },
      ],
    });
    // Initialize once when a plan has no persisted payment schedule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commercial.paymentSchedule.length]);
  const scheduleLabels = commercial.paymentSchedule.map((item) => item.label).join("|");
  useEffect(() => {
    const normalized = commercial.paymentSchedule.map((item, index) => ({
      ...item,
      label: index === 0 ? "1st Visit" : index === 1 ? "2nd Visit" : item.label,
    }));
    if (normalized.some((item, index) => item.label !== commercial.paymentSchedule[index]?.label))
      update({ paymentSchedule: normalized });
    // Normalize the two patient-facing visit labels without recreating persisted rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleLabels]);
  const scheduled = commercial.paymentSchedule.reduce((sum, item) => sum + item.amount, 0);
  useEffect(() => {
    const previous = previousTotal.current;
    const canAutoBalance = scheduled === 0 || (previous !== undefined && scheduled === previous);
    previousTotal.current = totals.total;
    if (!totals.total || !canAutoBalance || commercial.paymentSchedule.length < 2) return;
    const firstVisit = Math.round(totals.total / 2);
    const balanced = commercial.paymentSchedule.map((item, index) =>
      index === 0
        ? { ...item, amount: firstVisit }
        : index === 1
          ? { ...item, amount: totals.total - firstVisit }
          : item,
    );
    update({ paymentSchedule: balanced });
    // Keep a balanced schedule synchronized; manually adjusted schedules are never overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.total, commercial.paymentSchedule.length]);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Currency and treatment pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Currency</Label>
              <Select
                value={commercial.currency}
                onValueChange={(currency) =>
                  update({ currency: currency as typeof commercial.currency })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GBP", "EUR", "USD", "TRY"].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan valid until</Label>
              <Input
                type="date"
                value={commercial.validUntil ?? ""}
                onChange={(e) => update({ validUntil: e.target.value })}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treatment item</TableHead>
                  <TableHead className="w-24">Quantity</TableHead>
                  <TableHead className="w-40">Unit price</TableHead>
                  <TableHead className="text-right">Item total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commercial.items.map((item) => (
                  <TableRow key={item.treatmentId}>
                    <TableCell className="min-w-56">{item.label}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) =>
                          update({
                            items: commercial.items.map((entry) =>
                              entry.treatmentId === item.treatmentId
                                ? {
                                    ...entry,
                                    unitPrice: Math.max(0, Number(e.target.value)),
                                    priceOverridden: true,
                                  }
                                : entry,
                            ),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQuoteMoney(item.qty * item.unitPrice, commercial.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payment and package total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6">
          <section aria-labelledby="service-costs-heading">
            <h3 id="service-costs-heading" className="mb-4 font-semibold">
              Travel and service costs
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Money
                label="Hotel total"
                value={commercial.hotelTotal}
                onChange={(hotelTotal) => update({ hotelTotal })}
              />
              <Money
                label="Transfer total"
                value={commercial.transferTotal}
                onChange={(transferTotal) => update({ transferTotal })}
              />
              <Money
                label="Other service total"
                value={commercial.otherServiceTotal}
                onChange={(otherServiceTotal) => update({ otherServiceTotal })}
              />
            </div>
          </section>
          <Separator />
          <section aria-labelledby="discount-heading" className="grid gap-4 sm:grid-cols-2">
            <h3 id="discount-heading" className="font-semibold sm:col-span-2">
              Discount
            </h3>
            <div className="space-y-1.5">
              <Label>Discount type</Label>
              <Select
                value={commercial.discountType}
                onValueChange={(discountType) =>
                  update({
                    discountType: discountType as typeof commercial.discountType,
                    discountValue: 0,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No discount</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {commercial.discountType !== "none" && (
              <Money
                label={
                  commercial.discountType === "percentage"
                    ? "Discount percentage"
                    : "Discount amount"
                }
                value={commercial.discountValue}
                max={commercial.discountType === "percentage" ? 100 : undefined}
                onChange={(discountValue) => update({ discountValue })}
              />
            )}
            <div className="space-y-1 text-sm sm:col-span-2">
              <Row
                label="Calculated discount"
                value={formatQuoteMoney(totals.discount, commercial.currency)}
              />
              <Row
                label="Total after discount"
                value={formatQuoteMoney(totals.total, commercial.currency)}
                strong
              />
            </div>
          </section>
          <Separator />
          <section aria-labelledby="total-summary-heading" className="space-y-2 text-sm">
            <h3 id="total-summary-heading" className="mb-4 font-semibold">
              Total
            </h3>
            <Row
              label="Treatment subtotal"
              value={formatQuoteMoney(totals.subtotal, commercial.currency)}
            />
            <Row
              label="Hotel"
              value={formatQuoteMoney(billableCommercial.hotelTotal, commercial.currency)}
            />
            <Row
              label="Transfer and services"
              value={formatQuoteMoney(
                billableCommercial.transferTotal + commercial.otherServiceTotal,
                commercial.currency,
              )}
            />
            <Row label="Discount" value={formatQuoteMoney(totals.discount, commercial.currency)} />
            <Row
              label="Final total"
              value={formatQuoteMoney(totals.total, commercial.currency)}
              strong
            />
          </section>
          <Separator />
          <section aria-labelledby="payment-schedule-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="payment-schedule-heading" className="font-semibold">
                Payment schedule
              </h3>
              <span className="text-sm font-medium">
                Total {formatQuoteMoney(totals.total, commercial.currency)}
              </span>
            </div>
            {commercial.paymentSchedule.slice(0, 2).map((payment) => (
              <div
                key={payment.id}
                className="grid gap-2 rounded-lg border p-3 md:grid-cols-[120px_160px_1fr]"
              >
                <div className="flex min-h-9 items-center font-medium">{payment.label}</div>
                <Input
                  aria-label="Payment amount"
                  type="number"
                  min={0}
                  value={payment.amount}
                  onChange={(e) =>
                    updatePayment(
                      commercial,
                      payment.id,
                      { amount: Math.max(0, Number(e.target.value)) },
                      update,
                    )
                  }
                />
                <Input
                  aria-label="Payment due description"
                  value={payment.due}
                  onChange={(e) =>
                    updatePayment(commercial, payment.id, { due: e.target.value }, update)
                  }
                />
              </div>
            ))}
            {commercial.paymentSchedule.length > 2 && (
              <p className="text-xs text-muted-foreground">
                Legacy additional payment entries are preserved in the plan but are not part of the
                standard two-visit schedule.
              </p>
            )}
            {scheduled > totals.total && (
              <p className="rounded bg-warning/15 p-2 text-sm">
                Scheduled payments exceed the current plan total.
              </p>
            )}
            {scheduled <= totals.total && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-muted/50 p-2 text-sm">
                <span>Remaining amount</span>
                <span className="font-medium">
                  {formatQuoteMoney(Math.max(0, totals.total - scheduled), commercial.currency)}
                </span>
                {totals.total > 0 && scheduled === totals.total && (
                  <span className="text-success">Payment schedule matches the final total.</span>
                )}
              </div>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
function Money({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max ?? Infinity, Math.max(0, Number(e.target.value))))}
      />
    </div>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between ${strong ? "border-t pt-2 text-base font-semibold" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
function updatePayment(
  commercial: DentalPlan["commercial"],
  id: string,
  patch: Partial<DentalPlan["commercial"]["paymentSchedule"][number]>,
  update: (patch: Partial<DentalPlan["commercial"]>) => void,
) {
  update({
    paymentSchedule: commercial.paymentSchedule.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    ),
  });
}
