import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMockStore, selectClinicLeads } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { LEAD_STATUSES } from "@/lib/constants";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-bits";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowRight, CalendarCheck, Clock3, FileCheck2, FileText, Search, Send, UsersRound } from "lucide-react";
import type { Lead, LeadStatus, Patient, Quote, Task, UploadedFile, User } from "@/types/models";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/pro/leads")({ component: LeadsKanban });

type SortOption = "newest" | "oldest" | "last_activity" | "priority";
const priorityRank: Record<Lead["priority"], number> = { low: 1, medium: 2, high: 3, urgent: 4 };
const priorityColor: Record<Lead["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/15 text-accent",
  high: "bg-destructive/15 text-destructive",
  urgent: "bg-destructive text-destructive-foreground",
};
const sourceLabel: Record<Lead["source"], string> = {
  assessment: "SmileAbroad",
  referral: "Referral",
  manual: "Manual",
  campaign: "Campaign",
};

function LeadsKanban() {
  const activeUser = useAuth((s) => s.user);
  const clinicId = activeUser?.clinic_id ?? "clinic_istanbul";
  const leads = useMockStore(useShallow(selectClinicLeads(clinicId)));
  const { users, patients, files, quotes, tasks, updateLeadStatus } = useMockStore(useShallow((s) => ({
    users: s.users, patients: s.patients, files: s.files, quotes: s.quotes, tasks: s.tasks, updateLeadStatus: s.updateLeadStatus,
  })));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [coordinator, setCoordinator] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState<SortOption>("last_activity");

  const clinicPatients = useMemo(() => patients.filter((p) => p.clinic_id === clinicId), [patients, clinicId]);
  const patientFor = (lead: Lead) => clinicPatients.find((p) =>
    p.id === lead.clinic_patient_id || p.user_id === lead.patient_user_id || p.id === lead.patient_user_id,
  );
  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return leads.filter((lead) => {
      const patient = patientFor(lead);
      const searchable = [lead.patient_name, lead.patient_country, patient?.email, patient?.phone]
        .filter(Boolean).join(" ").toLocaleLowerCase();
      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (status === "all" || lead.status === status)
        && (source === "all" || lead.source === source)
        && (coordinator === "all" || (coordinator === "unassigned" ? !lead.assigned_to : lead.assigned_to === coordinator))
        && (priority === "all" || lead.priority === priority);
    }).sort((a, b) => {
      if (sort === "priority") return priorityRank[b.priority] - priorityRank[a.priority];
      const field = sort === "last_activity" ? "last_activity_at" : "created_at";
      const direction = sort === "oldest" ? 1 : -1;
      return (new Date(a[field]).getTime() - new Date(b[field]).getTime()) * direction;
    });
  }, [leads, clinicPatients, query, status, source, coordinator, priority, sort]);

  const byStatus = useMemo(() => LEAD_STATUSES.reduce<Record<string, Lead[]>>((acc, item) => {
    acc[item.value] = filteredLeads.filter((lead) => lead.status === item.value);
    return acc;
  }, {}), [filteredLeads]);
  const coordinators = users.filter((u) => leads.some((lead) => lead.assigned_to === u.id));
  const sources = Array.from(new Set(leads.map((lead) => lead.source)));
  const metrics = {
    total: leads.length,
    new: leads.filter((lead) => lead.status === "new_lead").length,
    review: leads.filter((lead) => lead.status === "doctor_review").length,
    quoted: leads.filter((lead) => lead.status === "quote_sent").length,
    booked: leads.filter((lead) => lead.status === "booked").length,
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 min-w-0">
      <PageHeader title="CRM pipeline" description="Manage every dental tourism lead from first contact through treatment completion." />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={UsersRound} label="Total Leads" value={metrics.total} />
        <StatCard icon={FileText} label="New Leads" value={metrics.new} tone="accent" />
        <StatCard icon={Clock3} label="Awaiting Review" value={metrics.review} tone="warning" />
        <StatCard icon={Send} label="Quote Sent" value={metrics.quoted} />
        <StatCard icon={CalendarCheck} label="Booked" value={metrics.booked} tone="success" />
      </div>

      <Card className="p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(5,minmax(145px,auto))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search leads" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone, country" className="pl-9" />
          </div>
          <FilterSelect label="Status" value={status} onChange={setStatus} options={LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
          <FilterSelect label="Source" value={source} onChange={setSource} options={sources.map((value) => ({ value, label: sourceLabel[value] }))} />
          <FilterSelect label="Coordinator" value={coordinator} onChange={setCoordinator} options={[{ value: "unassigned", label: "Unassigned" }, ...coordinators.map((u) => ({ value: u.id, label: u.name }))]} />
          <FilterSelect label="Priority" value={priority} onChange={setPriority} options={["low", "medium", "high", "urgent"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} />
          <FilterSelect label="Sort" value={sort} onChange={(value) => setSort(value as SortOption)} includeAll={false} options={[
            { value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" },
            { value: "last_activity", label: "Last Activity" }, { value: "priority", label: "Priority" },
          ]} />
        </div>
      </Card>

      {leads.length === 0 ? <EmptyState title="No leads yet" description="Patient applications will appear here when they enter your clinic pipeline." /> : (
        <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
          {filteredLeads.length === 0 && <p className="mb-3 text-sm text-muted-foreground">No leads match the current search and filters.</p>}
          <div className="flex gap-4 min-w-max pb-4">
            {LEAD_STATUSES.map((column) => (
              <section key={column.value} className="w-[300px] shrink-0" aria-label={column.label}>
                <div className="flex items-center justify-between mb-2 sticky top-0 bg-background z-10 py-1">
                  <h2 className="text-sm font-semibold">{column.label}</h2>
                  <Badge variant="secondary">{byStatus[column.value]?.length ?? 0}</Badge>
                </div>
                <div className="space-y-2">
                  {(byStatus[column.value] ?? []).map((lead) => (
                    <LeadCard key={lead.id} lead={lead} patient={patientFor(lead)} users={users} files={files} quotes={quotes} tasks={tasks}
                      onStatusChange={(next) => updateLeadStatus(lead.id, next, activeUser?.id ?? "system")} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, includeAll = true }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; includeAll?: boolean }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue placeholder={label} /></SelectTrigger><SelectContent>
    {includeAll && <SelectItem value="all">All {label}</SelectItem>}
    {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
  </SelectContent></Select>;
}

function LeadCard({ lead, patient, users, files, quotes, tasks, onStatusChange }: { lead: Lead; patient?: Patient; users: User[]; files: UploadedFile[]; quotes: Quote[]; tasks: Task[]; onStatusChange: (status: LeadStatus) => void }) {
  const coordinator = users.find((user) => user.id === lead.assigned_to)?.name ?? "Unassigned";
  const hasFiles = files.some((file) => file.patient_user_id === lead.patient_user_id || file.patient_user_id === patient?.user_id);
  const hasQuote = quotes.some((quote) => quote.clinic_id === lead.clinic_id && quote.patient_user_id === lead.patient_user_id);
  const nextFollowUp = tasks
    .filter((task) => task.lead_id === lead.id && task.due_at && !task.done)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];
  const legacy = !lead.clinic_patient_id;
  return <Card className="p-3 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-medium text-sm truncate">{lead.patient_name}</p><p className="text-xs text-muted-foreground">{lead.patient_country}</p></div>
      <Badge className={cn("text-[10px] capitalize", priorityColor[lead.priority])}>{lead.priority}</Badge></div>
    <p className="text-xs mt-2 line-clamp-2">{lead.treatment}</p>
    <div className="flex flex-wrap gap-1 mt-2"><Badge variant="outline" className="text-[10px]">{sourceLabel[lead.source]}</Badge>{legacy && <Badge variant="secondary" className="text-[10px]">Legacy Record</Badge>}
      {lead.assessment_id && <Badge variant="secondary" className="text-[10px]">Assessment Submitted</Badge>}{hasFiles && <Badge variant="secondary" className="text-[10px]">Files Uploaded</Badge>}{hasQuote && <Badge variant="secondary" className="text-[10px]">Quote Sent</Badge>}</div>
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px]"><dt className="text-muted-foreground">Coordinator</dt><dd className="truncate">{coordinator}</dd><dt className="text-muted-foreground">Dentist</dt><dd>Not assigned</dd><dt className="text-muted-foreground">Last activity</dt><dd>{format(new Date(lead.last_activity_at), "MMM d, yyyy")}</dd><dt className="text-muted-foreground">Follow-up</dt><dd>{nextFollowUp ? format(new Date(nextFollowUp.due_at!), "MMM d, yyyy") : "No follow-up scheduled"}</dd></dl>
    <div className="mt-3"><Select value={lead.status} onValueChange={(value) => onStatusChange(value as LeadStatus)}><SelectTrigger aria-label={`Status for ${lead.patient_name}`} className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{LEAD_STATUSES.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent></Select></div>
    <div className="mt-2 flex gap-1.5">
      {lead.clinic_patient_id ? <Button asChild variant="ghost" size="sm" className="h-7 px-2"><Link to="/pro/patients/$id" params={{ id: lead.clinic_patient_id }}>Open Patient <ArrowRight className="size-3.5 ml-1" /></Link></Button> : <Button variant="ghost" size="sm" className="h-7 px-2" disabled>Open Patient</Button>}
      <Button variant="ghost" size="sm" className="h-7 px-2" disabled title={lead.assessment_id ? "Assessment view is not available yet" : "No assessment linked"}><FileCheck2 className="size-3.5 mr-1" />View Assessment</Button>
    </div>
  </Card>;
}
