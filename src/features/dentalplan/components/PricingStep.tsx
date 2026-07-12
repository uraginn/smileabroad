import { useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  useEffect(() => {
    if (JSON.stringify(synced) !== JSON.stringify(commercial.items)) update({ items: synced });
    // Sync only when dental treatment structure changes; prices are retained by treatment ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.proposedTreatments, commercial.currency, treatmentDefaults]);
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
  const scheduled = commercial.paymentSchedule.reduce((sum, item) => sum + item.amount, 0);
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
          <CardTitle>Travel and service totals</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Discount</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
                commercial.discountType === "percentage" ? "Discount percentage" : "Discount amount"
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
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
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
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment schedule</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                update({
                  paymentSchedule: [
                    ...commercial.paymentSchedule,
                    {
                      id: crypto.randomUUID(),
                      label: `Payment ${commercial.paymentSchedule.length + 1}`,
                      amount: 0,
                      due: "",
                    },
                  ],
                })
              }
            >
              <Plus />
              Add stage
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {commercial.paymentSchedule.map((payment) => (
            <div
              key={payment.id}
              className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_160px_1fr_auto]"
            >
              <Input
                aria-label="Payment label"
                value={payment.label}
                onChange={(e) =>
                  updatePayment(commercial, payment.id, { label: e.target.value }, update)
                }
              />
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
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove payment"
                onClick={() =>
                  update({
                    paymentSchedule: commercial.paymentSchedule.filter(
                      (item) => item.id !== payment.id,
                    ),
                  })
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          {scheduled > totals.total && (
            <p className="rounded bg-warning/15 p-2 text-sm">
              Scheduled payments exceed the current plan total.
            </p>
          )}
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
