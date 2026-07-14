import { AlertTriangle, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const warnings = [
    ...defaults.warnings,
    ...(!plan.patient.dentistId ? ["No dentist is assigned to this case."] : []),
    ...(scheduled > totals.total ? ["Scheduled payments exceed the final total."] : []),
  ];
  const ready = missing.length === 0;

  return (
    <div className="space-y-4">
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
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      </section>

      {(missing.length > 0 || warnings.length > 0) && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>
            {missing.length ? "Case is not share-ready" : "Clinical review advised"}
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
    </div>
  );
}
