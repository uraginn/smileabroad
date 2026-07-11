import { createFileRoute } from "@tanstack/react-router";
import { useMockStore, selectClinicBranding } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/pro/branding")({ component: Branding });

function Branding() {
  const clinicId = useAuth((s) => s.user?.clinic_id) ?? "clinic_istanbul";
  const branding = useMockStore(selectClinicBranding(clinicId));
  const update = useMockStore((s) => s.updateBranding);
  const [form, setForm] = useState(branding);
  useEffect(() => setForm(branding), [branding]);

  if (!form) return null;
  const save = () => { update(clinicId, form); toast.success("Branding updated"); };

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Clinic branding" description="Used on shared treatment plans and quotes." />
      <Card><CardContent className="p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Primary colour"><Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="h-10 p-1" /></Field>
          <Field label="Secondary colour"><Input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="h-10 p-1" /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        </div>
        <Field label="Website"><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
        <Field label="Hotel information"><Textarea rows={2} value={form.hotel_info} onChange={(e) => setForm({ ...form, hotel_info: e.target.value })} /></Field>
        <Field label="Transfer information"><Textarea rows={2} value={form.transfer_info} onChange={(e) => setForm({ ...form, transfer_info: e.target.value })} /></Field>
        <Field label="Terms & conditions"><Textarea rows={3} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></Field>
        <Button onClick={save}>Save branding</Button>
      </CardContent></Card>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
