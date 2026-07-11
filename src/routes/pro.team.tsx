import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/pro/team")({ component: TeamPage });

function TeamPage() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <PageHeader
        title="Team"
        description="Clinic owners will manage dentists, coordinators, sales agents and administrators here."
        actions={
          <Button disabled title="Team invitations are not available yet">
            Invite Team Member (unavailable)
          </Button>
        }
      />

      <EmptyState
        title="Team management is coming soon"
        description="This section is reserved for role-based clinic team management. Invitation, permissions and member workflows are not enabled yet."
      />
    </div>
  );
}
