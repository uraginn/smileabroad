import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/pro/communication")({ component: CommunicationPage });

function CommunicationPage() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Communication"
        description="Patient communication history remains available inside each patient record."
      />
      <EmptyState
        title="No communication selected"
        description="Open a patient record to review or add clinic communication."
      />
    </div>
  );
}
