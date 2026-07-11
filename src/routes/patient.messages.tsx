import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/ui-bits";
export const Route = createFileRoute("/patient/messages")({ component: () => (
  <div className="p-6 max-w-5xl">
    <PageHeader title="Messages" description="Conversations with your clinic coordinators." />
    <EmptyState title="No conversations yet" description="Messages from your coordinators will appear here." />
  </div>
) });
