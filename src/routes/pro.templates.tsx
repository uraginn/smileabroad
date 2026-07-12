import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/pro/templates")({
  component: () => (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Templates" description="Reusable treatment plan and email templates." />
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Template builder coming soon.
        </CardContent>
      </Card>
    </div>
  ),
});
