import { LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatQuoteMoney } from "@/lib/quote";
import type { DentalPlan, DentalPlanStudioProps } from "../types/dental-plan.types";
import { calculateCommercial } from "../utils/commercial";
import { derivePlanDefaults } from "../utils/derivePlanDefaults";
import { DentalChart } from "./DentalChart";
import { ConditionSummary } from "./ConditionSummary";
import { TreatmentSummary } from "./TreatmentSummary";
export function FinalReviewStep({
  plan,
  hotels = [],
}: {
  plan: DentalPlan;
  hotels?: DentalPlanStudioProps["hotels"];
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
  const selectedHotel = hotels?.find((hotel) => hotel.id === plan.travel.selectedHotelId);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Patient and assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <b>Patient:</b> {plan.patient.fullName || "Not provided"}
            </p>
            <p>
              <b>Country:</b>{" "}
              {[plan.patient.city, plan.patient.country].filter(Boolean).join(", ") ||
                "Not provided"}
            </p>
            <p>
              <b>Contact:</b> {plan.patient.email || plan.patient.phone || "Not provided"}
            </p>
            <div className="flex flex-wrap gap-2">
              {plan.importedAssessment.medicalConditions.map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))}
              {plan.importedAssessment.allergies && (
                <Badge variant="outline">Allergies: {plan.importedAssessment.allergies}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Visits and timing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <b>Visits:</b> {defaults.recommendedVisits}
            </p>
            <p>
              <b>Visit duration:</b> {defaults.visitDurationSummary}
            </p>
            <p>
              <b>Healing:</b> {defaults.healingPeriodSummary}
            </p>
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Hotel</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {plan.travel.hotelIncluded ? (
              <>
                <p>{plan.travel.hotelName || "Hotel to be confirmed"}</p>
                <p>
                  {plan.travel.roomType || "Room type not specified"} Â· {plan.travel.hotelNights}{" "}
                  nights
                </p>
                <p>{plan.travel.boardType}</p>
                <p>Companion: {plan.travel.companionIncluded ? "Included" : "Not included"}</p>
                {selectedHotel?.images?.length ? (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {selectedHotel.images
                      .slice(0, 4)
                      .map(
                        (image) =>
                          image.dataUrl && (
                            <img
                              key={image.id}
                              src={image.dataUrl}
                              alt={image.name}
                              className="h-16 w-24 shrink-0 rounded border object-cover"
                            />
                          ),
                      )}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">Not included</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Airport Transfer:{" "}
              {plan.travel.includedServices.includes("Airport Transfer")
                ? "Included"
                : "Not included"}
            </p>
            <p>
              Hotel Transfer:{" "}
              {plan.travel.includedServices.includes("Hotel Transfer")
                ? "Included"
                : "Not included"}
            </p>
            <p>
              Flight Included:{" "}
              {plan.travel.includedServices.includes("Flight Included") ? "Yes" : "No"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Included services</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {plan.travel.includedServices.length ? (
              plan.travel.includedServices.map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">None selected</span>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="border-warning/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole />
            Private clinic notes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {plan.travel.internalNotes || "No internal notes"}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pricing and payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {plan.commercial.items.map((item) => (
            <div key={item.treatmentId} className="flex justify-between gap-3">
              <span>
                {item.label} Ã— {item.qty}
              </span>
              <span>{formatQuoteMoney(item.qty * item.unitPrice, plan.commercial.currency)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2">
            <span>Discount</span>
            <span>{formatQuoteMoney(totals.discount, plan.commercial.currency)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Final total</span>
            <span>{formatQuoteMoney(totals.total, plan.commercial.currency)}</span>
          </div>
          {plan.commercial.paymentSchedule.map((item) => (
            <p key={item.id}>
              {item.label}: {formatQuoteMoney(item.amount, plan.commercial.currency)} Â· {item.due}
            </p>
          ))}
        </CardContent>
      </Card>
      {[
        ...defaults.warnings,
        ...(!plan.proposedTreatments.length ? ["No proposed treatment has been added."] : []),
      ].map((warning) => (
        <p key={warning} className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
          {warning}
        </p>
      ))}
    </div>
  );
}
