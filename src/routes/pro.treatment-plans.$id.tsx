import { createFileRoute, Navigate, notFound } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/mock-auth";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { PageLoading } from "@/components/ui-bits";

export const Route = createFileRoute("/pro/treatment-plans/$id")({ component: OpenUnifiedPlan });

function OpenUnifiedPlan() {
  const { id } = Route.useParams();
  const clinicId = useAuth((state) => state.user?.clinic_id);
  const hydrated = useMockStoreHydrated();
  const plan = useMockStore((state) =>
    state.treatmentPlans.find((item) => item.id === id && item.clinic_id === clinicId),
  );
  if (!hydrated) return <PageLoading label="Opening treatment plan" />;
  if (!plan) throw notFound();
  return <Navigate to="/dentalplan" search={{ treatmentPlanId: plan.id }} replace />;
}
