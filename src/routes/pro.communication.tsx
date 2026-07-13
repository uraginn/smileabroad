import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Mail, MessageSquare, Phone, Plus, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/mock-auth";
import { useMockStore } from "@/lib/mock/store";
import { makeId } from "@/lib/mock/seed";
import type { CommunicationTemplate, Lead, LeadActivity, Patient } from "@/types/models";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/pro/communication")({ component: CommunicationPage });
const KINDS = ["call", "whatsapp", "email", "note"] as const;
function CommunicationPage() {
  const actor = useAuth((s) => s.user);
  const clinicId = actor?.clinic_id ?? "";
  const activities = useMockStore((s) => s.activities);
  const patients = useMockStore((s) => s.patients);
  const leads = useMockStore((s) => s.leads);
  const users = useMockStore((s) => s.users);
  const templates = useMockStore((s) => s.communicationTemplates);
  const addActivity = useMockStore((s) => s.addLeadActivity);
  const saveTemplate = useMockStore((s) => s.saveCommunicationTemplate);
  const deleteTemplate = useMockStore((s) => s.deleteCommunicationTemplate);
  const [section, setSection] = useState("log");
  const [kind, setKind] = useState("all");
  const [logOpen, setLogOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const records = useMemo(
    () =>
      activities
        .filter((a) => a.clinic_id === clinicId && KINDS.includes(a.kind as (typeof KINDS)[number]))
        .sort(
          (a, b) =>
            new Date(b.occurred_at ?? b.created_at).getTime() -
            new Date(a.occurred_at ?? a.created_at).getTime(),
        ),
    [activities, clinicId],
  );
  const clinicPatients = useMemo(
    () => patients.filter((p) => p.clinic_id === clinicId),
    [patients, clinicId],
  );
  const clinicLeads = useMemo(
    () => leads.filter((l) => l.clinic_id === clinicId),
    [leads, clinicId],
  );
  const clinicUsers = useMemo(
    () => users.filter((u) => u.clinic_id === clinicId),
    [users, clinicId],
  );
  const clinicTemplates = useMemo(
    () => templates.filter((t) => t.clinic_id === clinicId),
    [templates, clinicId],
  );
  const filtered = kind === "all" ? records : records.filter((r) => r.kind === kind);
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Communication"
        description="A clinic-wide log of calls, WhatsApp, email and internal notes. Logging does not send a message."
        actions={
          <Button
            onClick={() => (section === "templates" ? setTemplateOpen(true) : setLogOpen(true))}
          >
            <Plus />
            {section === "templates" ? "New template" : "Log communication"}
          </Button>
        }
      />
      <Tabs value={section} onValueChange={setSection}>
        <TabsList>
          <TabsTrigger value="log">Communication log</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="log" className="space-y-4">
          <Tabs value={kind} onValueChange={setKind}>
            <TabsList className="max-w-full overflow-x-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="call">Calls</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="note">Internal notes</TabsTrigger>
            </TabsList>
          </Tabs>
          {!filtered.length ? (
            <EmptyState
              title="No communication recorded"
              description="Log a real interaction or internal note. No message will be sent."
              action={<Button onClick={() => setLogOpen(true)}>Log communication</Button>}
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const patient = clinicPatients.find(
                  (p) => p.id === r.patient_id || p.user_id === r.patient_id,
                );
                const lead = clinicLeads.find((l) => l.id === r.lead_id);
                const staff = clinicUsers.find((u) => u.id === (r.staff_user_id ?? r.created_by));
                const Icon =
                  r.kind === "call"
                    ? Phone
                    : r.kind === "whatsapp"
                      ? MessageSquare
                      : r.kind === "email"
                        ? Mail
                        : StickyNote;
                return (
                  <Card key={r.id}>
                    <CardContent className="flex gap-3 p-4">
                      <Icon className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {r.subject ??
                              (r.kind === "note" ? "Internal note" : `${r.kind} logged`)}
                          </p>
                          <Badge variant="outline">
                            {r.direction ?? (r.kind === "note" ? "internal" : "outbound")}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {format(new Date(r.occurred_at ?? r.created_at), "dd MMM yyyy · HH:mm")} ·{" "}
                          {staff?.name ?? "Clinic team"}
                          {r.outcome ? ` · ${r.outcome}` : ""}
                        </p>
                      </div>
                      {patient ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/pro/patients/$id" params={{ id: patient.id }}>
                            {patient.first_name} {patient.last_name}
                          </Link>
                        </Button>
                      ) : lead ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/pro/leads/$id" params={{ id: lead.id }}>
                            {lead.patient_name}
                          </Link>
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="templates">
          {!clinicTemplates.length ? (
            <EmptyState
              title="No communication templates"
              description="Create reusable plain-text content for logging consistent communication."
              action={<Button onClick={() => setTemplateOpen(true)}>Create template</Button>}
            />
          ) : (
            <div className="space-y-2">
              {clinicTemplates.map((t) => (
                <Card key={t.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{t.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{t.body}</p>
                    </div>
                    <Badge variant="outline">{t.channel}</Badge>
                    <Badge variant={t.active ? "default" : "secondary"}>
                      {t.active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(t.id, clinicId)}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      <LogDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        clinicId={clinicId}
        actorId={actor?.id ?? "system"}
        patients={clinicPatients}
        leads={clinicLeads}
        templates={clinicTemplates}
        save={(r) => {
          addActivity(r);
          toast.success("Communication logged");
          setLogOpen(false);
        }}
      />
      <TemplateDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        clinicId={clinicId}
        save={(r) => {
          saveTemplate(r, actor?.id);
          toast.success("Template saved");
          setTemplateOpen(false);
        }}
      />
    </div>
  );
}
function LogDialog({
  open,
  onOpenChange,
  clinicId,
  actorId,
  patients,
  leads,
  templates,
  save,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clinicId: string;
  actorId: string;
  patients: Patient[];
  leads: Lead[];
  templates: CommunicationTemplate[];
  save: (r: Omit<LeadActivity, "id" | "created_at" | "updated_at">) => void;
}) {
  const [kind, setKind] = useState<(typeof KINDS)[number]>("call");
  const [related, setRelated] = useState("none");
  const [direction, setDirection] = useState<NonNullable<LeadActivity["direction"]>>("outbound");
  const [outcome, setOutcome] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [occurred, setOccurred] = useState(() => new Date().toISOString().slice(0, 16));
  const [templateId, setTemplateId] = useState("none");
  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject ?? "");
      setBody(t.body);
    }
  };
  const submit = () => {
    if (!body.trim()) return toast.error("Enter a summary or note");
    const isPatient = related.startsWith("patient:");
    save({
      clinic_id: clinicId,
      lead_id: related.startsWith("lead:") ? related.slice(5) : undefined,
      patient_id: isPatient ? related.slice(8) : undefined,
      kind,
      body: body.trim(),
      internal: true,
      occurred_at: new Date(occurred).toISOString(),
      staff_user_id: actorId,
      direction: kind === "note" ? "internal" : direction,
      communication_status: "logged",
      outcome: outcome || undefined,
      subject: subject || undefined,
      template_id: templateId === "none" ? undefined : templateId,
      created_by: actorId,
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log communication</DialogTitle>
          <DialogDescription>
            This records an interaction. It does not send email, WhatsApp, or place a call.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Type">
            <Pick
              value={kind}
              set={(v) => setKind(v as typeof kind)}
              options={KINDS.map((x) => ({ value: x, label: x === "note" ? "Internal note" : x }))}
            />
          </Field>
          <Field label="Patient or Lead">
            <Select value={related} onValueChange={setRelated}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No related record</SelectItem>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={`patient:${p.id}`}>
                    {p.first_name} {p.last_name}
                  </SelectItem>
                ))}
                {leads.map((l) => (
                  <SelectItem key={l.id} value={`lead:${l.id}`}>
                    Lead · {l.patient_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {kind !== "note" && (
            <Field label="Direction">
              <Pick
                value={direction}
                set={(value) => setDirection(value as NonNullable<LeadActivity["direction"]>)}
                options={["inbound", "outbound"].map((x) => ({ value: x, label: x }))}
              />
            </Field>
          )}
          <Field label="Template">
            <Pick
              value={templateId}
              set={chooseTemplate}
              options={templates
                .filter((t) => t.active)
                .map((t) => ({ value: t.id, label: t.name }))}
            />
          </Field>
          {kind === "email" && (
            <Field label="Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
          )}
          {kind === "call" && (
            <Field label="Outcome">
              <Input
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Reached patient, no answer…"
              />
            </Field>
          )}
          <Field label="Occurred at">
            <Input
              type="datetime-local"
              value={occurred}
              onChange={(e) => setOccurred(e.target.value)}
            />
          </Field>
          <Field label={kind === "note" ? "Note" : "Summary or copied message"}>
            <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function TemplateDialog({
  open,
  onOpenChange,
  clinicId,
  save,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clinicId: string;
  save: (r: Omit<CommunicationTemplate, "created_at" | "updated_at" | "created_by">) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Initial response");
  const [channel, setChannel] = useState<CommunicationTemplate["channel"]>("whatsapp");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [active, setActive] = useState(true);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create communication template</DialogTitle>
          <DialogDescription>
            Templates copy plain text into a log form; they do not send messages.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Category">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="Channel">
            <Pick
              value={channel}
              set={(value) => setChannel(value as CommunicationTemplate["channel"])}
              options={["whatsapp", "email", "generic"].map((x) => ({ value: x, label: x }))}
            />
          </Field>
          {channel === "email" && (
            <Field label="Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
          )}
          <Field label="Body">
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim() || !body.trim()) return toast.error("Enter a name and body");
              save({
                id: makeId("communication_template"),
                clinic_id: clinicId,
                name: name.trim(),
                category,
                channel,
                subject: subject || undefined,
                body: body.trim(),
                active,
              });
            }}
          >
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Pick({
  value,
  set,
  options,
}: {
  value: string;
  set: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={set}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
