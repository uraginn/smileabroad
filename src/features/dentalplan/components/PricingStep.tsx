import { useEffect, useRef } from "react";
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
import { formatQuoteMoney } from "@/lib/quote";
import type { DentalPlan } from "../types/dental-plan.types";
import { calculateCommercial } from "../utils/commercial";
export function PricingStep({
  plan,
  change,
  readOnly,
}: {
  plan: DentalPlan;
  change: (patch: Partial<DentalPlan>) => void;
  readOnly?: boolean;
}) {
  const commercial = plan.commercial;
  const update = (patch: Partial<typeof commercial>) => {
    if (!readOnly) change({ commercial: { ...commercial, ...patch } });
  };
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
  const packageTotal =
    billableCommercial.hotelTotal +
    billableCommercial.transferTotal +
    billableCommercial.otherServiceTotal;
  const previousTotal = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (commercial.paymentSchedule.length >= 2) return;
    update({
      paymentSchedule: [
        ...(commercial.paymentSchedule.length
          ? commercial.paymentSchedule
          : [
              {
                id: crypto.randomUUID(),
                label: "Visit 1",
                amount: 0,
                due: "Due at first visit",
              },
            ]),
        { id: crypto.randomUUID(), label: "Visit 2", amount: 0, due: "Due at second visit" },
      ],
    });
    // Initialize once when a plan has no persisted payment schedule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commercial.paymentSchedule.length]);
  const scheduleSignature = commercial.paymentSchedule
    .map((item) => `${item.label}:${item.amount}`)
    .join("|");
  useEffect(() => {
    const extraAmount = commercial.paymentSchedule
      .slice(2)
      .reduce((sum, item) => sum + item.amount, 0);
    const normalized = commercial.paymentSchedule.slice(0, 2).map((item, index) => ({
      ...item,
      label: index === 0 ? "Visit 1" : "Visit 2",
      amount: index === 1 ? item.amount + extraAmount : item.amount,
    }));
    if (JSON.stringify(normalized) !== JSON.stringify(commercial.paymentSchedule))
      update({ paymentSchedule: normalized });
    // Consolidate legacy schedules into the canonical two-visit payment model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSignature]);
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
    <section className="space-y-4 rounded-xl bg-card p-4 shadow-sm sm:p-6">
      <fieldset disabled={readOnly} className="contents">
        <header>
          <h2 className="text-lg font-semibold">Commercial</h2>
          <p className="text-sm text-muted-foreground">Plan totals, discount and visit payments.</p>
        </header>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
          <div className="space-y-5">
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2">
              <Label htmlFor="commercial-currency">Currency</Label>
              <div className="w-32">
                <Select
                  value={commercial.currency}
                  onValueChange={(currency) =>
                    update({ currency: currency as typeof commercial.currency })
                  }
                >
                  <SelectTrigger id="commercial-currency">
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
            </section>
            <Separator />
            <section aria-labelledby="service-costs-heading" className="space-y-3">
              <h3 id="service-costs-heading" className="font-semibold">
                Package costs
              </h3>
              <div className="divide-y rounded-lg border">
                <CostRow
                  label="Hotel"
                  enabled={plan.travel.hotelIncluded}
                  value={commercial.hotelTotal}
                  onChange={(hotelTotal) => update({ hotelTotal })}
                />
                <CostRow
                  label={transferCostLabel(plan)}
                  enabled={Boolean(billableCommercial.transferTotal || hasTransfers(plan))}
                  value={commercial.transferTotal}
                  onChange={(transferTotal) => update({ transferTotal })}
                />
                <CostRow
                  label="Other package costs"
                  enabled
                  value={commercial.otherServiceTotal}
                  onChange={(otherServiceTotal) => update({ otherServiceTotal })}
                />
              </div>
            </section>
            <Separator />
            <section aria-labelledby="discount-heading" className="space-y-3">
              <h3 id="discount-heading" className="font-semibold">
                Discount
              </h3>
              <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
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
                <Money
                  label={commercial.discountType === "percentage" ? "Percentage" : "Amount"}
                  value={commercial.discountValue}
                  disabled={commercial.discountType === "none"}
                  max={commercial.discountType === "percentage" ? 100 : undefined}
                  onChange={(discountValue) => update({ discountValue })}
                />
                <div className="min-w-36 rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="block text-xs text-muted-foreground">Calculated discount</span>
                  <strong>{formatQuoteMoney(totals.discount, commercial.currency)}</strong>
                </div>
              </div>
            </section>
            <Separator />
            <section aria-labelledby="payment-schedule-heading" className="space-y-3">
              <h3 id="payment-schedule-heading" className="font-semibold">
                Payment schedule
              </h3>
              {commercial.paymentSchedule.slice(0, 2).map((payment) => (
                <div
                  key={payment.id}
                  className="grid gap-2 rounded-lg border px-3 py-2 sm:grid-cols-[90px_150px_1fr] sm:items-center"
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
              <div className="flex items-center justify-between border-t px-3 pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>{formatQuoteMoney(totals.total, commercial.currency)}</span>
              </div>
              {scheduled !== totals.total && (
                <p className="rounded bg-warning/15 p-2 text-sm">
                  Scheduled payments {scheduled > totals.total ? "exceed" : "do not yet match"} the
                  current plan total.
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
          </div>
          <aside
            aria-labelledby="commercial-summary-heading"
            className="space-y-2 rounded-xl bg-primary px-4 py-4 text-primary-foreground lg:sticky lg:top-24 lg:self-start"
          >
            <h3 id="commercial-summary-heading" className="mb-3 font-semibold">
              Commercial summary
            </h3>
            <Row label="Treatment" value={formatQuoteMoney(totals.subtotal, commercial.currency)} />
            <Row label="Package" value={formatQuoteMoney(packageTotal, commercial.currency)} />
            <Row
              label="Discount"
              value={`-${formatQuoteMoney(totals.discount, commercial.currency)}`}
            />
            <Row
              label="Final total"
              value={formatQuoteMoney(totals.total, commercial.currency)}
              strong
            />
            <Separator className="my-3 bg-primary-foreground/25" />
            <Row
              label="Visit 1"
              value={formatQuoteMoney(
                commercial.paymentSchedule[0]?.amount ?? 0,
                commercial.currency,
              )}
            />
            <Row
              label="Visit 2"
              value={formatQuoteMoney(
                commercial.paymentSchedule[1]?.amount ?? 0,
                commercial.currency,
              )}
            />
          </aside>
        </div>
      </fieldset>
    </section>
  );
}
function Money({
  label,
  value,
  onChange,
  max,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        max={max}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Math.min(max ?? Infinity, Math.max(0, Number(e.target.value))))}
      />
    </div>
  );
}

function CostRow({
  label,
  enabled,
  value,
  onChange,
}: {
  label: string;
  enabled: boolean;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {!enabled && <p className="text-xs text-muted-foreground">Not included in Package</p>}
      </div>
      <Input
        aria-label={`${label} cost`}
        type="number"
        min={0}
        disabled={!enabled}
        value={enabled ? value : 0}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
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

function hasTransfers(plan: DentalPlan) {
  return (
    plan.travel.includedServices.includes("Airport Transfer") ||
    plan.travel.includedServices.includes("Hotel Transfer")
  );
}

function transferCostLabel(plan: DentalPlan) {
  const airport = plan.travel.includedServices.includes("Airport Transfer");
  const hotel = plan.travel.includedServices.includes("Hotel Transfer");
  if (airport && hotel) return "Airport & hotel transfers";
  if (airport) return "Airport transfer";
  if (hotel) return "Hotel transfer";
  return "Transfers";
}
