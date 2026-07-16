import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DentalPlan, DentalPlanStudioProps } from "../types/dental-plan.types";
import { calculateCommercial } from "../utils/commercial";
import { derivePlanDefaults } from "../utils/derivePlanDefaults";
import { validateClinicalTreatment, validatePlanForFinalize } from "../rules/clinicalRules";

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
  const clinicalErrors = validatePlanForFinalize(plan);
  const clinicalWarnings = [
    ...new Set(
      plan.proposedTreatments.flatMap((treatment) =>
        validateClinicalTreatment(plan, treatment.treatmentType, treatment.toothNumbers)
          .filter((result) => result.allowed && result.severity === "warning")
          .map((result) => result.message),
      ),
    ),
  ];
  const missing = [
    ...readiness.filter((item) => !item.ready),
    ...clinicalErrors.map((label) => ({ label, step: 1 })),
  ];
  const warningItems = [
    ...clinicalWarnings.map((label) => ({ label, step: 1 })),
    ...defaults.warnings.map((label) => ({ label, step: 1 })),
    ...(!plan.patient.dentistId
      ? [{ label: "No dentist is assigned to this case.", step: 0 }]
      : []),
    ...(scheduled > totals.total
      ? [{ label: "Scheduled payments exceed the final total.", step: 3 }]
      : []),
  ];
  const informationItems = [
    ...(!plan.travel.selectedHotelId
      ? [{ label: "Accommodation has not been selected.", step: 2 }]
      : []),
  ];
  const ready = missing.length === 0;

  return (
    <section className="rounded-xl bg-card p-4 shadow-sm sm:p-6">
      <header className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Final Validation</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm the case is clinically and commercially ready before sharing.
            </p>
          </div>
          <Badge variant={ready ? "secondary" : "outline"}>
            {ready ? "Ready to share" : `${missing.length} item(s) need attention`}
          </Badge>
        </div>
      </header>
      <TreatmentPlanValidationStack
        ready={readiness.filter((item) => item.ready)}
        information={informationItems}
        warnings={warningItems}
        blocking={missing}
        onNavigate={onNavigate}
      />
    </section>
  );
}

function TreatmentPlanValidationStack({
  ready,
  information,
  warnings,
  blocking,
  onNavigate,
}: {
  ready: Array<{ label: string; step: number }>;
  information: Array<{ label: string; step: number }>;
  warnings: Array<{ label: string; step: number }>;
  blocking: Array<{ label: string; step: number }>;
  onNavigate?: (step: number) => void;
}) {
  const groups = [
    {
      key: "ready",
      label: "Ready",
      items: ready,
      icon: CheckCircle2,
      className: "border-green-500 bg-green-100 text-green-900 hover:bg-green-200",
      iconClass: "text-green-600",
    },
    {
      key: "information",
      label: "Information",
      items: information,
      icon: Info,
      className: "border-blue-500 bg-blue-100 text-blue-900 hover:bg-blue-200",
      iconClass: "text-blue-600",
    },
    {
      key: "warning",
      label: "Warning",
      items: warnings,
      icon: AlertTriangle,
      className: "border-yellow-500 bg-yellow-100 text-yellow-900 hover:bg-yellow-200",
      iconClass: "text-yellow-600",
    },
    {
      key: "blocking",
      label: "Blocking Error",
      items: blocking,
      icon: XCircle,
      className: "border-red-500 bg-red-100 text-red-900 hover:bg-red-200",
      iconClass: "text-red-600",
    },
  ].filter((group) => group.items.length > 0);
  return (
    <div className="space-y-2 p-4">
      {groups.flatMap((group) =>
        group.items.map((item) => {
          const Icon = group.icon;
          return (
            <div
              key={`${group.key}-${item.label}`}
              role="alert"
              className={`flex items-center rounded-lg border-l-4 p-2 transition duration-300 ease-in-out ${group.className}`}
            >
              <Icon className={`mr-2 size-5 shrink-0 ${group.iconClass}`} aria-hidden="true" />
              <p className="min-w-0 flex-1 text-xs font-semibold">
                {group.label} - {item.label}
              </p>
              {onNavigate && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ml-2 h-7 shrink-0 px-2 text-xs"
                  onClick={() => onNavigate(item.step)}
                >
                  Review
                </Button>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
