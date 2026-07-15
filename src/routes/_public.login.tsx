import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useAuthHydrated, demoUsers } from "@/lib/auth/mock-auth";
import type { Role } from "@/types/models";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_public/login")({ component: Login });
const roles: { role: Role; label: string }[] = [
  { role: "clinic_owner", label: "Owner" },
  { role: "coordinator", label: "Coordinator" },
  { role: "dentist", label: "Dentist" },
  { role: "platform_admin", label: "Admin" },
  { role: "viewer", label: "Viewer" },
];

function Login() {
  const loginAs = useAuth((state) => state.loginAs);
  const hydrated = useAuthHydrated();
  const navigate = useNavigate();
  const [email, setEmail] = useState(demoUsers.clinic_owner.email);
  const [role, setRole] = useState<Role>("clinic_owner");
  const [submitting, setSubmitting] = useState(false);
  const go: Record<Role, string> = {
    clinic_owner: "/pro/dashboard",
    clinic_admin: "/pro/dashboard",
    coordinator: "/pro/dashboard",
    dentist: "/pro/dashboard",
    viewer: "/pro/dashboard",
    sales: "/pro/dashboard",
    platform_admin: "/admin/dashboard",
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hydrated || submitting) return;
    setSubmitting(true);
    try {
      loginAs(role);
      const authenticatedUser = useAuth.getState().user;
      if (!authenticatedUser || authenticatedUser.role !== role) {
        throw new Error("Clinic session could not be created.");
      }
      await navigate({ to: go[authenticatedUser.role], replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Clinic login failed");
      setSubmitting(false);
    }
  };
  return (
    <section className="container-app py-20 max-w-md mx-auto">
      <h1 className="font-display text-4xl font-semibold text-center">Professional login</h1>
      <p className="text-center text-muted-foreground mt-2">Clinic staff access only.</p>
      <Card className="mt-8">
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={submit}>
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
              <Label htmlFor="clinic-login-email">Email</Label>
              <Input
                id="clinic-login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-login-password">Password</Label>
              <Input
                id="clinic-login-password"
                type="password"
                placeholder="Password"
                defaultValue="demo"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!hydrated || submitting}>
              {!hydrated ? "Preparing login…" : submitting ? "Logging in…" : "Log in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Patients do not need an account. Assessments are completed on the public website.
            </p>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
