import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/pro/reports")({ component: ReportsPage });

function ReportsPage() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Reports"
        description="Operational reporting will use the clinic data already recorded in the CRM."
      />
      <EmptyState
        title="Reports are not configured"
        description="Continue using Dashboard for daily operational work."
      />
    </div>
  );
}
