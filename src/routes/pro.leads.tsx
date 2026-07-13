import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMockStore, selectClinicLeads } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import {
  deriveLeadOperationalStage,
  getFollowUpState,
  getNextFollowUp,
  LEAD_PIPELINE_STAGES,
} from "@/lib/lead-workflow";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-bits";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogContactDialog, ScheduleFollowUpDialog } from "@/components/lead-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowRight,
  CalendarCheck,
  Clock3,
  FileCheck2,
  FileText,
  Search,
  Send,
  UsersRound,
} from "lucide-react";
import type {
  Lead,
  LeadStatus,
  Patient,
  Task,
  TreatmentPlan,
  UploadedFile,
  User,
  LeadFollowUp,
  Assessment,
} from "@/types/models";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/pro/leads")({
  validateSearch: (search: Record<string, unknown>): { followUp?: string } => ({
    followUp: typeof search.followUp === "string" ? search.followUp : undefined,
  }),
  component: LeadsKanban,
});

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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeSearch = Route.useSearch();
  const activeUser = useAuth((s) => s.user);
  const clinicId = activeUser?.clinic_id ?? "clinic_istanbul";
  const leads = useMockStore(useShallow(selectClinicLeads(clinicId)));
  const { users, patients, files, plans, followUps, assessments, updateLeadStatus } = useMockStore(
    useShallow((s) => ({
      users: s.users,
      patients: s.patients,
      files: s.files,
      plans: s.treatmentPlans,
      followUps: s.followUps,
      assessments: s.assessments,
      updateLeadStatus: s.updateLeadStatus,
    })),
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [coordinator, setCoordinator] = useState("all");
  const [dentist, setDentist] = useState("all");
  const [priority, setPriority] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState("all");
  const [country, setCountry] = useState("all");
  const [destination, setDestination] = useState("all");
  const [roadmapFilter, setRoadmapFilter] = useState("all");
  const [uploadsFilter, setUploadsFilter] = useState("all");
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [sort, setSort] = useState<SortOption>("last_activity");
  useEffect(() => {
    if (routeSearch.followUp) setFollowUpFilter(routeSearch.followUp);
  }, [routeSearch.followUp]);

  const clinicPatients = useMemo(
    () => patients.filter((p) => p.clinic_id === clinicId),
    [patients, clinicId],
  );
  const patientFor = (lead: Lead) =>
    clinicPatients.find(
      (p) =>
        p.id === lead.clinic_patient_id ||
        p.user_id === lead.patient_user_id ||
        p.id === lead.patient_user_id,
    );
  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return leads
      .filter((lead) => {
        const patient = clinicPatients.find(
          (item) =>
            item.id === lead.clinic_patient_id ||
            item.user_id === lead.patient_user_id ||
            item.id === lead.patient_user_id,
        );
        const searchable = [
          lead.patient_name,
          lead.patient_country,
          patient?.email,
          patient?.phone,
          patient?.whatsapp,
          lead.source,
          lead.treatment,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase();
        const plan = plans.find(
          (item) =>
            item.clinic_id === clinicId &&
            (item.lead_id === lead.id || item.clinic_patient_id === lead.clinic_patient_id),
        );
        const operationalStage = deriveLeadOperationalStage({ lead, treatmentPlan: plan });
        const assessment = assessments.find((item) => item.id === lead.assessment_id);
        const nextFollowUp = getNextFollowUp(followUps, lead.id);
        const followUpState = nextFollowUp ? getFollowUpState(nextFollowUp) : "none";
        const hasUploads = files.some(
          (file) =>
            file.patient_user_id === lead.patient_user_id ||
            file.patient_user_id === patient?.user_id,
        );
        return (
          (!normalizedQuery || searchable.includes(normalizedQuery)) &&
          (status === "all" || operationalStage === status) &&
          (source === "all" || lead.source === source) &&
          (coordinator === "all" ||
            (coordinator === "unassigned"
              ? !lead.assigned_to
              : lead.assigned_to === coordinator)) &&
          (dentist === "all" || plan?.dentist_id === dentist) &&
          (priority === "all" || lead.priority === priority) &&
          (country === "all" || lead.patient_country === country) &&
          (destination === "all" || assessment?.travel.destination_country === destination) &&
          (followUpFilter === "all" || followUpState === followUpFilter) &&
          (roadmapFilter === "all" ||
            (roadmapFilter === "yes" ? !!lead.roadmap_id : !lead.roadmap_id)) &&
          (uploadsFilter === "all" || (uploadsFilter === "yes" ? hasUploads : !hasUploads))
        );
      })
      .sort((a, b) => {
        if (sort === "priority") return priorityRank[b.priority] - priorityRank[a.priority];
        const field = sort === "last_activity" ? "last_activity_at" : "created_at";
        const direction = sort === "oldest" ? 1 : -1;
        return (new Date(a[field]).getTime() - new Date(b[field]).getTime()) * direction;
      });
  }, [
    leads,
    clinicPatients,
    query,
    status,
    source,
    coordinator,
    dentist,
    priority,
    sort,
    plans,
    clinicId,
    followUps,
    files,
    country,
    destination,
    followUpFilter,
    roadmapFilter,
    uploadsFilter,
    assessments,
  ]);

  const byStatus = useMemo(
    () =>
      LEAD_PIPELINE_STAGES.reduce<Record<string, Lead[]>>((acc, item) => {
        acc[item.key] = filteredLeads.filter(
          (lead) =>
            deriveLeadOperationalStage({
              lead,
              treatmentPlan: plans.find(
                (plan) =>
                  plan.clinic_id === clinicId &&
                  (plan.lead_id === lead.id || plan.clinic_patient_id === lead.clinic_patient_id),
              ),
            }) === item.key,
        );
        return acc;
      }, {}),
    [filteredLeads, plans, clinicId],
  );
  const coordinators = users.filter((u) => leads.some((lead) => lead.assigned_to === u.id));
  const sources = Array.from(new Set(leads.map((lead) => lead.source)));
  const countries = Array.from(new Set(leads.map((lead) => lead.patient_country))).sort();
  const destinations = Array.from(
    new Set(
      assessments
        .filter((item) => leads.some((lead) => lead.assessment_id === item.id))
        .map((item) => item.travel.destination_country),
    ),
  ).sort();
  const dentists = users.filter(
    (user) => user.clinic_id === clinicId && user.role === "dentist" && user.active !== false,
  );
  const metrics = {
    total: leads.length,
    new: leads.filter(
      (lead) =>
        deriveLeadOperationalStage({
          lead,
          treatmentPlan: plans.find((plan) => plan.lead_id === lead.id),
        }) === "new_lead",
    ).length,
    review: leads.filter(
      (lead) =>
        deriveLeadOperationalStage({
          lead,
          treatmentPlan: plans.find((plan) => plan.lead_id === lead.id),
        }) === "doctor_review",
    ).length,
    quoted: leads.filter(
      (lead) =>
        deriveLeadOperationalStage({
          lead,
          treatmentPlan: plans.find((plan) => plan.lead_id === lead.id),
        }) === "quote_sent",
    ).length,
    booked: leads.filter(
      (lead) =>
        deriveLeadOperationalStage({
          lead,
          treatmentPlan: plans.find((plan) => plan.lead_id === lead.id),
        }) === "booked",
    ).length,
  };

  if (pathname !== "/pro/leads") return <Outlet />;

  return (
    <div className="p-4 sm:p-6 space-y-5 min-w-0">
      <PageHeader
        title="CRM pipeline"
        description="Manage every dental tourism lead from first contact through treatment completion."
      />
      <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={UsersRound} label="Total Leads" value={metrics.total} />
        <StatCard icon={FileText} label="New Leads" value={metrics.new} tone="accent" />
        <StatCard icon={Clock3} label="Awaiting Review" value={metrics.review} tone="warning" />
        <StatCard icon={Send} label="Plans Sent" value={metrics.quoted} />
        <StatCard icon={CalendarCheck} label="Converted" value={metrics.booked} tone="success" />
      </div>

      <Card className="p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(5,minmax(145px,auto))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search leads"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone, country"
              className="pl-9"
            />
          </div>
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={LEAD_PIPELINE_STAGES.map((s) => ({ value: s.key, label: s.label }))}
          />
          <FilterSelect
            label="Source"
            value={source}
            onChange={setSource}
            options={sources.map((value) => ({ value, label: sourceLabel[value] }))}
          />
          <FilterSelect
            label="Country"
            value={country}
            onChange={setCountry}
            options={countries.map((value) => ({ value, label: value }))}
          />
          <FilterSelect
            label="Destination"
            value={destination}
            onChange={setDestination}
            options={destinations.map((value) => ({ value, label: value }))}
          />
          <FilterSelect
            label="Follow-up"
            value={followUpFilter}
            onChange={setFollowUpFilter}
            options={[
              { value: "overdue", label: "Overdue" },
              { value: "due_today", label: "Due today" },
              { value: "upcoming", label: "Upcoming" },
              { value: "none", label: "No follow-up" },
            ]}
          />
          <FilterSelect
            label="Roadmap"
            value={roadmapFilter}
            onChange={setRoadmapFilter}
            options={[
              { value: "yes", label: "Available" },
              { value: "no", label: "Not available" },
            ]}
          />
          <FilterSelect
            label="Uploads"
            value={uploadsFilter}
            onChange={setUploadsFilter}
            options={[
              { value: "yes", label: "Available" },
              { value: "no", label: "Not available" },
            ]}
          />
          <FilterSelect
            label="Coordinator"
            value={coordinator}
            onChange={setCoordinator}
            options={[
              { value: "unassigned", label: "Unassigned" },
              ...coordinators.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
          <FilterSelect
            label="Dentist"
            value={dentist}
            onChange={setDentist}
            options={dentists.map((user) => ({ value: user.id, label: user.name }))}
          />
          <FilterSelect
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={["low", "medium", "high", "urgent"].map((value) => ({
              value,
              label: value === "medium" ? "Normal" : value[0].toUpperCase() + value.slice(1),
            }))}
          />
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={(value) => setSort(value as SortOption)}
            includeAll={false}
            options={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
              { value: "last_activity", label: "Last Activity" },
              { value: "priority", label: "Priority" },
            ]}
          />
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setSource("all");
              setCoordinator("all");
              setDentist("all");
              setPriority("all");
              setCountry("all");
              setDestination("all");
              setFollowUpFilter("all");
              setRoadmapFilter("all");
              setUploadsFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      </Card>

      {leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Patient applications will appear here when they enter your clinic pipeline."
        />
      ) : (
        <div className="-mx-4 px-4 sm:-mx-6 sm:px-6">
          {filteredLeads.length === 0 && (
            <p className="mb-3 text-sm text-muted-foreground">
              No leads match the current search and filters.
            </p>
          )}
          {view === "list" && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  patient={patientFor(lead)}
                  users={users}
                  files={files}
                  plans={plans}
                  followUps={followUps}
                  assessment={assessments.find((item) => item.id === lead.assessment_id)}
                  onStatusChange={(next) =>
                    updateLeadStatus(lead.id, next, activeUser?.id ?? "system")
                  }
                />
              ))}
            </div>
          )}
          {view === "pipeline" && (
            <div className="hidden gap-4 overflow-x-auto pb-4 md:flex">
              {LEAD_PIPELINE_STAGES.map((column) => (
                <section key={column.key} className="w-[300px] shrink-0" aria-label={column.label}>
                  <div className="flex items-center justify-between mb-2 sticky top-0 bg-background z-10 py-1">
                    <h2 className="text-sm font-semibold">{column.label}</h2>
                    <Badge variant="secondary">{byStatus[column.key]?.length ?? 0}</Badge>
                  </div>
                  <div className="space-y-2">
                    {(byStatus[column.key] ?? []).map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        patient={patientFor(lead)}
                        users={users}
                        files={files}
                        plans={plans}
                        followUps={followUps}
                        assessment={assessments.find((item) => item.id === lead.assessment_id)}
                        onStatusChange={(next) =>
                          updateLeadStatus(lead.id, next, activeUser?.id ?? "system")
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {view === "pipeline" && (
            <div className="grid gap-3 md:hidden">
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  patient={patientFor(lead)}
                  users={users}
                  files={files}
                  plans={plans}
                  followUps={followUps}
                  assessment={assessments.find((item) => item.id === lead.assessment_id)}
                  onStatusChange={(next) =>
                    updateLeadStatus(lead.id, next, activeUser?.id ?? "system")
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  includeAll = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  includeAll?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">All {label}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LeadCard({
  lead,
  patient,
  users,
  files,
  plans,
  followUps,
  assessment,
  onStatusChange,
}: {
  lead: Lead;
  patient?: Patient;
  users: User[];
  files: UploadedFile[];
  plans: TreatmentPlan[];
  followUps: LeadFollowUp[];
  assessment?: Assessment;
  onStatusChange: (status: LeadStatus) => void;
}) {
  const navigate = useNavigate();
  const activeUser = useAuth((state) => state.user);
  const addTreatmentPlan = useMockStore((state) => state.addTreatmentPlan);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const coordinator = users.find((user) => user.id === lead.assigned_to)?.name ?? "Unassigned";
  const hasFiles = files.some(
    (file) =>
      file.patient_user_id === lead.patient_user_id || file.patient_user_id === patient?.user_id,
  );
  const hasSharedPlan = plans.some(
    (plan) =>
      plan.clinic_id === lead.clinic_id &&
      plan.patient_user_id === lead.patient_user_id &&
      ["sent", "viewed", "accepted"].includes(plan.status ?? ""),
  );
  const linkedPlan = plans.find(
    (plan) =>
      plan.clinic_id === lead.clinic_id &&
      (plan.lead_id === lead.id || plan.clinic_patient_id === lead.clinic_patient_id),
  );
  const operationalStage = deriveLeadOperationalStage({ lead, treatmentPlan: linkedPlan });
  const nextFollowUp = getNextFollowUp(followUps, lead.id);
  const legacy = !lead.clinic_patient_id;
  const openTreatmentPlan = () => {
    if (linkedPlan) {
      void navigate({ to: "/dentalplan", search: { treatmentPlanId: linkedPlan.id } });
      return;
    }
    if (!patient) return;
    const plan = addTreatmentPlan(
      {
        clinic_id: lead.clinic_id,
        patient_user_id: patient.user_id ?? lead.patient_user_id,
        clinic_patient_id: patient.id,
        lead_id: lead.id,
        clinic_application_id: lead.clinic_application_id,
        assessment_id: lead.assessment_id,
        roadmap_id: lead.roadmap_id,
        title: `${lead.treatment || "Dental"} Treatment Plan`,
        summary: "Draft clinical Treatment Plan.",
        items: [],
        visits: 1,
        healing_weeks: 0,
        status: "draft",
      },
      activeUser?.id,
    );
    void navigate({ to: "/dentalplan", search: { treatmentPlanId: plan.id } });
  };
  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{lead.patient_name}</p>
          <p className="text-xs text-muted-foreground">{lead.patient_country}</p>
        </div>
        <Badge className={cn("text-[10px] capitalize", priorityColor[lead.priority])}>
          {lead.priority}
        </Badge>
      </div>
      <p className="text-xs mt-2 line-clamp-2">{lead.treatment}</p>
      {assessment?.travel.destination_country && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Destination: {assessment.travel.destination_country}
        </p>
      )}
      <div className="flex flex-wrap gap-1 mt-2">
        <Badge variant="outline" className="text-[10px]">
          {sourceLabel[lead.source]}
        </Badge>
        {legacy && (
          <Badge variant="secondary" className="text-[10px]">
            Legacy Record
          </Badge>
        )}
        {lead.assessment_id && (
          <Badge variant="secondary" className="text-[10px]">
            Assessment Submitted
          </Badge>
        )}
        {lead.roadmap_id && (
          <Badge variant="secondary" className="text-[10px]">
            Roadmap Available
          </Badge>
        )}
        {hasFiles && (
          <Badge variant="secondary" className="text-[10px]">
            Files Uploaded
          </Badge>
        )}
        {hasSharedPlan && (
          <Badge variant="secondary" className="text-[10px]">
            Plan Sent
          </Badge>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px]">
        <dt className="text-muted-foreground">Coordinator</dt>
        <dd className="truncate">{coordinator}</dd>
        <dt className="text-muted-foreground">Dentist</dt>
        <dd>{users.find((user) => user.id === linkedPlan?.dentist_id)?.name ?? "Not assigned"}</dd>
        <dt className="text-muted-foreground">Last activity</dt>
        <dd>{format(new Date(lead.last_activity_at), "MMM d, yyyy")}</dd>
        <dt className="text-muted-foreground">Follow-up</dt>
        <dd>
          {nextFollowUp
            ? `${format(new Date(nextFollowUp.due_at), "MMM d, yyyy")} · ${getFollowUpState(nextFollowUp).replace(/_/g, " ")}`
            : "No follow-up scheduled"}
        </dd>
      </dl>
      <div className="mt-3">
        {["booked", "lost"].includes(operationalStage) ? (
          <Badge variant="outline">
            {LEAD_PIPELINE_STAGES.find((item) => item.key === operationalStage)?.label}
          </Badge>
        ) : (
          <Select
            value={operationalStage}
            onValueChange={(value) => onStatusChange(value as LeadStatus)}
          >
            <SelectTrigger aria-label={`Status for ${lead.patient_name}`} className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_PIPELINE_STAGES.filter((status) => !status.terminal).map((status) => (
                <SelectItem key={status.key} value={status.key}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="mt-2 flex gap-1.5">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link to="/pro/leads/$id" params={{ id: lead.id }}>
            Open Lead <ArrowRight className="ml-1 size-3.5" />
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setContactOpen(true)}>
          Log contact
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => setFollowUpOpen(true)}
        >
          Follow-up
        </Button>
        {lead.clinic_patient_id ? (
          <Button asChild variant="ghost" size="sm" className="h-7 px-2">
            <Link to="/pro/patients/$id" params={{ id: lead.clinic_patient_id }}>
              Open Patient <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 px-2" disabled>
            Open Patient
          </Button>
        )}
        {lead.clinic_patient_id && (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={openTreatmentPlan}>
            {linkedPlan ? "Open Treatment Plan" : "Create Treatment Plan"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          disabled
          title={
            lead.assessment_id ? "Assessment view is not available yet" : "No assessment linked"
          }
        >
          <FileCheck2 className="size-3.5 mr-1" />
          View Assessment
        </Button>
      </div>
      <LogContactDialog open={contactOpen} onOpenChange={setContactOpen} lead={lead} />
      <ScheduleFollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        lead={lead}
        patient={patient}
        users={users.filter((user) => user.clinic_id === lead.clinic_id && user.active !== false)}
      />
    </Card>
  );
}
