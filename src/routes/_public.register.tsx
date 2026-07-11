import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/mock-auth";

export const Route = createFileRoute("/_public/register")({ component: Register });

function Register() {
  const { loginAs } = useAuth();
  const navigate = useNavigate();
  return (
    <section className="container-app py-20 max-w-md mx-auto">
      <h1 className="font-display text-4xl font-semibold text-center">Create your account</h1>
      <Card className="mt-8"><CardContent className="p-6 space-y-4">
        <div className="space-y-2"><Label>Name</Label><Input placeholder="Your name" /></div>
        <div className="space-y-2"><Label>Email</Label><Input placeholder="you@example.com" /></div>
        <div className="space-y-2"><Label>Password</Label><Input type="password" placeholder="Choose a password" /></div>
        <Button className="w-full" onClick={() => { loginAs("patient"); navigate({ to: "/patient/dashboard" }); }}>Create account</Button>
        <p className="text-center text-sm text-muted-foreground">Already have one? <Link to="/login" className="text-primary hover:underline">Log in</Link></p>
      </CardContent></Card>
    </section>
  );
}
