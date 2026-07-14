import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
export const Route = createFileRoute("/admin/settings")({
  component: () => (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Platform settings" />
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Platform configuration coming soon.
        </CardContent>
      </Card>
    </div>
  ),
});
