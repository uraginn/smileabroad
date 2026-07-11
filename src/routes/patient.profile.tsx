import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/mock-auth";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/patient/profile")({ component: Profile });

function Profile() {
  const user = useAuth((s) => s.user);
  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Profile" description="Update your personal details." />
      <Card><CardContent className="p-6 space-y-4">
        <div className="space-y-2"><Label>Name</Label><Input defaultValue={user?.name ?? ""} /></div>
        <div className="space-y-2"><Label>Email</Label><Input defaultValue={user?.email ?? ""} /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Phone</Label><Input placeholder="+00 000 000 000" /></div>
          <div className="space-y-2"><Label>Country</Label><Input placeholder="United Kingdom" /></div>
        </div>
        <div className="space-y-2"><Label>Preferred language</Label><Input defaultValue="English" /></div>
        <Button>Save changes</Button>
      </CardContent></Card>
    </div>
  );
}
