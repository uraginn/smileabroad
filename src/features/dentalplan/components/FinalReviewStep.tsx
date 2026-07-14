import { AlertTriangle, Check, LockKeyhole } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatQuoteMoney } from "@/lib/quote";
import type { DentalPlan, DentalPlanStudioProps } from "../types/dental-plan.types";
import { calculateCommercial } from "../utils/commercial";
import { derivePlanDefaults } from "../utils/derivePlanDefaults";
import { ConditionSummary } from "./ConditionSummary";
import { DentalChart } from "./DentalChart";
import { TreatmentSummary } from "./TreatmentSummary";

export function FinalReviewStep({
  plan,
  onNavigate,
  clinicUsers = [],
}: {
  plan: DentalPlan;
  hotels?: DentalPlanStudioProps["hotels"];
  onNavigate?: (step: number) => void;
  clinicUsers?: NonNullable<DentalPlanStudioProps["clinicUsers"]>;
}) {
  const totals = calculateCommercial({
    ...plan.commercial,
    hotelTotal: plan.travel.hotelIncluded ? plan.commercial.hotelTotal : 0,
    transferTotal:
      plan.travel.includedServices.includes("Airport Transfer") ||
      plan.travel.includedServices.includes("Hotel Transfer")
        ? plan.commercial.transferTotal
        : 0,
  });
  const defaults = derivePlanDefaults(plan);
  const scheduled = plan.commercial.paymentSchedule.reduce((sum, item) => sum + item.amount, 0);
  const dentist = clinicUsers.find((user) => user.id === plan.patient.dentistId);
  const coordinator = clinicUsers.find((user) => user.id === plan.patient.coordinatorId);
  const readiness = [
    { label: "Patient", ready: Boolean(plan.patient.fullName), step: 0 },
    { label: "Clinical plan", ready: plan.proposedTreatments.length > 0, step: 1 },
    { label: "Pricing", ready: totals.total > 0, step: 3 },
    { label: "Payments", ready: totals.total > 0 && scheduled === totals.total, step: 3 },
  ];
  const missing = readiness.filter((item) => !item.ready);
  const warnings = [
    ...defaults.warnings,
    ...(!plan.patient.dentistId ? ["No dentist is assigned to this plan."] : []),
    ...(scheduled > totals.total ? ["Scheduled payments exceed the final total."] : []),
  ];
  const shareReady = missing.length === 0;

  return (
    <div className="space-y-4">
      <Card className={shareReady ? "border-success/40" : "border-warning/50"}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Clinic validation</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Resolve missing information before sharing the patient document.
              </p>
            </div>
            <Badge variant={shareReady ? "secondary" : "outline"}>
              {shareReady ? "Ready to share" : `${missing.length} item(s) need attention`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {readiness.map((item) => (
            <Button
              key={item.label}
              type="button"
              variant="outline"
              className="h-auto justify-start gap-2 py-3"
              onClick={() => onNavigate?.(item.step)}
            >
              {item.ready ? (
                <Check className="size-4 text-success" />
              ) : (
                <AlertTriangle className="size-4 text-warning-foreground" />
              )}
              <span className="text-left">
                <span className="block text-xs text-muted-foreground">
                  {item.ready ? "Ready" : "Review needed"}
                </span>
                {item.label}
              </span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {(missing.length > 0 || warnings.length > 0) && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>
            {missing.length ? "Plan is not share-ready" : "Clinical review advised"}
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {missing.map((item) => (
                <li key={item.label}>{item.label} requires attention.</li>
              ))}
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Patient & ownership</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Meta label="Patient" value={plan.patient.fullName || "Missing"} />
            <Meta label="Country" value={plan.patient.country || "Not provided"} />
            <Meta label="Dentist" value={dentist?.name || "Unassigned"} />
            <Meta label="Coordinator" value={coordinator?.name || "Unassigned"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delivery plan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Meta label="Visits" value={String(defaults.recommendedVisits)} />
            <Meta label="Visit duration" value={defaults.visitDurationSummary} />
            <Meta label="Healing" value={defaults.healingPeriodSummary} />
            <Meta
              label="Accommodation"
              value={
                plan.travel.hotelIncluded
                  ? `${plan.travel.hotelName || "To confirm"} · ${plan.travel.hotelNights} nights`
                  : "Not included"
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DentalChart
          title="Current Dental Condition"
          mode="current"
          currentConditions={plan.currentConditions}
          proposedTreatments={plan.proposedTreatments}
          selected={[]}
          readOnly
          onSelect={() => {}}
        />
        <DentalChart
          title="Proposed Treatment Plan"
          mode="proposed"
          currentConditions={plan.currentConditions}
          proposedTreatments={plan.proposedTreatments}
          selected={[]}
          readOnly
          onSelect={() => {}}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ConditionSummary conditions={plan.currentConditions} onRemove={() => {}} />
        <TreatmentSummary
          treatments={plan.proposedTreatments}
          onDelete={() => {}}
          onHighlight={() => {}}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient-visible plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <Meta
              label="Included services"
              value={plan.travel.includedServices.join(", ") || "None selected"}
            />
            <Meta label="Plan validity" value={plan.commercial.validUntil || "Not set"} />
          </div>
          <Separator />
          <div className="space-y-2">
            <PriceRow
              label="Treatment and services"
              value={formatQuoteMoney(totals.subtotal, plan.commercial.currency)}
            />
            <PriceRow
              label="Discount"
              value={formatQuoteMoney(totals.discount, plan.commercial.currency)}
            />
            <PriceRow
              label="Final total"
              value={formatQuoteMoney(totals.total, plan.commercial.currency)}
              strong
            />
          </div>
          {plan.commercial.paymentSchedule.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {plan.commercial.paymentSchedule.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <p className="font-medium">{item.label}</p>
                  <p>{formatQuoteMoney(item.amount, plan.commercial.currency)}</p>
                  <p className="text-xs text-muted-foreground">{item.due || "Due date not set"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-warning/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="size-4" /> Clinic only
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{plan.travel.internalNotes || "No internal clinic notes."}</p>
          <p className="text-xs text-muted-foreground">
            This content is excluded from the Shared Patient View.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function PriceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-lg font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
