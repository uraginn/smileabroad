import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pro/settings")({ component: () => (
  <div className="p-6 max-w-3xl">
    <PageHeader title="Clinic settings" description="Team, roles and clinic profile." />
    <Card><CardContent className="p-6 space-y-4">
      <div className="space-y-2"><Label>Clinic name</Label><Input defaultValue="Bosphorus Dental Istanbul" /></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Country</Label><Input defaultValue="Turkey" /></div>
        <div className="space-y-2"><Label>City</Label><Input defaultValue="Istanbul" /></div>
      </div>
      <Button>Save</Button>
    </CardContent></Card>
  </div>
) });
