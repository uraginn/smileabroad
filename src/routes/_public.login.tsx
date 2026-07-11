import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, demoUsers } from "@/lib/auth/mock-auth";
import type { Role } from "@/types/models";
import { useState } from "react";

export const Route = createFileRoute("/_public/login")({ component: Login });

const roles: { role: Role; label: string }[] = [
  { role: "patient", label: "Patient" },
  { role: "clinic_owner", label: "Clinic" },
  { role: "platform_admin", label: "Admin" },
];

function Login() {
  const { loginAs } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("sofia@example.com");
  const [role, setRole] = useState<Role>("patient");
  const go: Record<Role, string> = { patient: "/patient/dashboard", clinic_owner: "/pro/dashboard", clinic_admin: "/pro/dashboard", coordinator: "/pro/dashboard", dentist: "/pro/dashboard", sales: "/pro/dashboard", platform_admin: "/admin/dashboard" };

  return (
    <section className="container-app py-20 max-w-md mx-auto">
      <h1 className="font-display text-4xl font-semibold text-center">Welcome back</h1>
      <p className="text-center text-muted-foreground mt-2">Mock login — pick a demo user below.</p>
      <Card className="mt-8"><CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {roles.map((r) => (
            <Button key={r.role} type="button" variant={role === r.role ? "default" : "outline"} onClick={() => { setRole(r.role); setEmail(demoUsers[r.role].email); }}>{r.label}</Button>
          ))}
        </div>
        <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-2"><Label>Password</Label><Input type="password" placeholder="••••••••" defaultValue="demo" /></div>
        <Button className="w-full" onClick={() => { loginAs(role); navigate({ to: go[role] }); }}>Log in</Button>
        <p className="text-center text-sm text-muted-foreground">No account? <Link to="/register" className="text-primary hover:underline">Sign up</Link></p>
      </CardContent></Card>
    </section>
  );
}
