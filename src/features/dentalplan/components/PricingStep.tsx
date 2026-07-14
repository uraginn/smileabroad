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
    <section className="space-y-5 rounded-xl bg-card p-4 shadow-sm sm:p-6">
      <fieldset disabled={readOnly} className="contents">
        <header>
          <h2 className="text-lg font-semibold">Commercial</h2>
          <p className="text-sm text-muted-foreground">Plan totals, discount and visit payments.</p>
        </header>
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-end">
            <div className="space-y-1.5">
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
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <Row
                label="Treatment subtotal"
                value={formatQuoteMoney(totals.subtotal, commercial.currency)}
                strong
              />
            </div>
          </section>
          <Separator />
          <section aria-labelledby="service-costs-heading">
            <h3 id="service-costs-heading" className="mb-4 font-semibold">
              Package costs
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
