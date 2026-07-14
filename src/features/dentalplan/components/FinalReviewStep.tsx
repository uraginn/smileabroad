import type { ReactNode } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DentalPlan, DentalPlanStudioProps } from "../types/dental-plan.types";
import { calculateCommercial } from "../utils/commercial";
import { derivePlanDefaults } from "../utils/derivePlanDefaults";

export function FinalReviewStep({
  plan,
  onNavigate,
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
  const readiness = [
    { label: "Patient & Case", ready: Boolean(plan.patient.fullName), step: 0 },
    { label: "Clinical Planning", ready: plan.proposedTreatments.length > 0, step: 1 },
    { label: "Commercial", ready: totals.total > 0, step: 3 },
    { label: "Payment", ready: totals.total > 0 && scheduled === totals.total, step: 3 },
  ];
  const missing = readiness.filter((item) => !item.ready);
  const warningItems = [
    ...defaults.warnings.map((label) => ({ label, step: 1 })),
    ...(!plan.patient.dentistId
      ? [{ label: "No dentist is assigned to this case.", step: 0 }]
      : []),
    ...(scheduled > totals.total
      ? [{ label: "Scheduled payments exceed the final total.", step: 3 }]
      : []),
  ];
  const ready = missing.length === 0;

  return (
    <section className="rounded-xl bg-card p-4 shadow-sm sm:p-6">
      <header className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Case validation</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm the case is clinically and commercially ready before sharing.
            </p>
          </div>
          <Badge variant={ready ? "secondary" : "outline"}>
            {ready ? "Ready to share" : `${missing.length} item(s) need attention`}
          </Badge>
        </div>
      </header>
      <div className="grid gap-3 lg:grid-cols-3">
        <ValidationGroup
          title="Ready"
          icon={<Check className="size-4 text-success" />}
          items={readiness.filter((item) => item.ready)}
          empty="Nothing completed yet."
          onNavigate={onNavigate}
        />
        <ValidationGroup
          title="Missing"
          icon={<AlertTriangle className="size-4 text-destructive" />}
          items={missing}
          empty="No required information is missing."
          onNavigate={onNavigate}
        />
        <ValidationGroup
          title="Warnings"
          icon={<AlertTriangle className="size-4 text-warning-foreground" />}
          items={warningItems}
          empty="No additional warnings."
          onNavigate={onNavigate}
        />
      </div>
    </section>
  );
}

function ValidationGroup({
  title,
  icon,
  items,
  empty,
  onNavigate,
}: {
  title: string;
  icon: ReactNode;
  items: Array<{ label: string; step: number }>;
  empty: string;
  onNavigate?: (step: number) => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
        <Badge variant="outline" className="ml-auto font-normal">
          {items.length}
        </Badge>
      </div>
      {items.length ? (
        <div className="space-y-1">
          {items.map((item) => (
            <Button
              key={`${title}-${item.label}`}
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start whitespace-normal px-2 py-1.5 text-left text-sm"
              onClick={() => onNavigate?.(item.step)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      ) : (
        <p className="px-2 py-1.5 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
