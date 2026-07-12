import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/pro/settings/")({
  component: ClinicSettings,
});

function ClinicSettings() {
  return (
    <div className="max-w-3xl p-6">
      <PageHeader title="Clinic settings" description="Team, roles and clinic profile." />
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Clinic name</Label>
            <Input defaultValue="Bosphorus Dental Istanbul" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Country</Label>
              <Input defaultValue="Turkey" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input defaultValue="Istanbul" />
            </div>
          </div>
          <Button>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
