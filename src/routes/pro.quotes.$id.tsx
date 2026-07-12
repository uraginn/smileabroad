import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/mock-auth";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageLoading } from "@/components/ui-bits";

export const Route = createFileRoute("/pro/quotes/$id")({ component: LegacyQuoteRedirect });

function LegacyQuoteRedirect() {
  const { id } = Route.useParams();
  const clinicId = useAuth((state) => state.user?.clinic_id);
  const hydrated = useMockStoreHydrated();
  const plan = useMockStore((state) =>
    state.treatmentPlans.find((item) => item.legacy_quote_id === id && item.clinic_id === clinicId),
  );
  if (!hydrated) return <PageLoading label="Opening treatment plan" />;
  if (plan) return <Navigate to="/dentalplan" search={{ treatmentPlanId: plan.id }} replace />;
  return (
    <div className="p-6">
      <Alert>
        <AlertTitle>Treatment Plan unavailable</AlertTitle>
        <AlertDescription>
          This legacy record has no Treatment Plan belonging to the active clinic.
        </AlertDescription>
      </Alert>
    </div>
  );
}
