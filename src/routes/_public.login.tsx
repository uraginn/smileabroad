import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, demoUsers } from "@/lib/auth/mock-auth";
import type { Role } from "@/types/models";
import { useState } from "react";

export const Route = createFileRoute("/_public/login")({ component: Login });
const roles: { role: Role; label: string }[] = [
  { role: "clinic_owner", label: "Owner" },
  { role: "coordinator", label: "Coordinator" },
  { role: "dentist", label: "Dentist" },
  { role: "platform_admin", label: "Admin" },
  { role: "viewer", label: "Viewer" },
];

function Login() {
  const { loginAs } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(demoUsers.clinic_owner.email);
  const [role, setRole] = useState<Role>("clinic_owner");
  const go: Record<Role, string> = {
    clinic_owner: "/pro/dashboard",
    clinic_admin: "/pro/dashboard",
    coordinator: "/pro/dashboard",
    dentist: "/pro/dashboard",
    viewer: "/pro/dashboard",
    sales: "/pro/dashboard",
    platform_admin: "/admin/dashboard",
  };
  return (
    <section className="container-app py-20 max-w-md mx-auto">
      <h1 className="font-display text-4xl font-semibold text-center">Professional login</h1>
      <p className="text-center text-muted-foreground mt-2">Clinic staff access only.</p>
      <Card className="mt-8">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {roles.map((item) => (
              <Button
                key={item.role}
                type="button"
                variant={role === item.role ? "default" : "outline"}
                onClick={() => {
                  setRole(item.role);
                  setEmail(demoUsers[item.role].email);
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" placeholder="Password" defaultValue="demo" />
          </div>
          <Button
            className="w-full"
            onClick={() => {
              loginAs(role);
              navigate({ to: go[role] });
            }}
          >
            Log in
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Patients do not need an account. Assessments are completed on the public website.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
