import { createFileRoute } from "@tanstack/react-router";
import { DentalPlanStudio } from "@/features/dentalplan";

export const Route = createFileRoute("/dentalplan")({
  head: () => ({ meta: [{ title: "DentalPlan Studio — SmileAbroad" }] }),
  component: DentalPlanDevelopmentRoute,
});

function DentalPlanDevelopmentRoute() {
  return <DentalPlanStudio />;
}
