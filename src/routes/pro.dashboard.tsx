import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useMockStore,
  selectClinicLeads,
  selectClinicPatients,
  selectClinicPlans,
  selectClinicTasks,
  selectClinicAppointments,
} from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { StatCard, PageHeader, EmptyState } from "@/components/ui-bits";
import { RecentActivityList, type ActivityItem } from "@/components/recent-activity-list";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LEAD_STATUSES } from "@/lib/constants";
import { formatQuoteMoney } from "@/lib/quote";
import { calculateTreatmentPlanTotals } from "@/lib/treatment-plan-commercial";
import {
  Kanban,
  Users,
  ClipboardList,
  CheckSquare,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  CircleEllipsis,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/pro/dashboard")({ component: ProDashboard });

function ProDashboard() {
  const clinicId = useAuth((s) => s.user?.clinic_id) ?? "clinic_istanbul";
  const leads = useMockStore(useShallow(selectClinicLeads(clinicId)));
  const patients = useMockStore(useShallow(selectClinicPatients(clinicId)));
  const plans = useMockStore(useShallow(selectClinicPlans(clinicId)));
  const tasks = useMockStore(useShallow(selectClinicTasks(clinicId)));
  const appts = useMockStore(useShallow(selectClinicAppointments(clinicId)));
  const applications = useMockStore(
    useShallow((s) => s.applications.filter((a) => a.clinic_id === clinicId)),
  );
  const activities = useMockStore(
    useShallow((s) => s.activities.filter((a) => a.clinic_id === clinicId)),
  );
  const clinics = useMockStore((s) => s.clinics);
  const users = useMockStore((s) => s.users);
  const clinic = clinics.find((item) => item.id === clinicId);
  const newLeads = leads.filter((l) => l.status === "new_lead");
  const openTasks = tasks.filter((t) => !t.done);
  const nextAppts = appts
    .slice()
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
    .slice(0, 5);
  const draftPlans = plans.filter((plan) => (plan.status ?? "draft") === "draft");
  const awaitingReview = plans.filter((plan) => plan.status === "doctor_review");
  const totalPlanValue = plans.reduce(
    (sum, plan) => sum + calculateTreatmentPlanTotals(plan).total,
    0,
  );

  const activityItems: ActivityItem[] = [
    ...activities.map((item) => ({
      id: item.id,
      type: (item.kind === "status_change" ? "lead" : "note") as "lead" | "note",
      title: item.kind === "status_change" ? "Lead status updated" : "Lead note added",
      patient: leads.find((lead) => lead.id === item.lead_id)?.patient_name,
      status: item.kind.replace(/_/g, " "),
      timestamp: item.created_at,
      description: item.body,
      to: "/pro/leads",
    })),
    ...tasks.map((task) => ({
      id: task.id,
      type: "task" as const,
      title: task.title,
      patient: leads.find((lead) => lead.id === task.lead_id)?.patient_name,
      status: task.done ? "completed" : "open",
      timestamp: task.updated_at,
      description: "Task updated",
      to: "/pro/tasks",
    })),
    ...applications.map((app) => ({
      id: app.id,
      type: "application" as const,
      title: "Clinic application received",
      patient: leads.find((lead) => lead.clinic_application_id === app.id)?.patient_name,
      status: app.status,
      timestamp: app.updated_at,
      description: "Patient submitted roadmap application.",
      to: "/pro/leads",
    })),
    ...plans.map((plan) => ({
      id: plan.id,
      type: "plan" as const,
      title: plan.title,
      patient: leads.find((lead) => lead.clinic_patient_id === plan.clinic_patient_id)
        ?.patient_name,
      status: plan.status,
      timestamp: plan.updated_at,
      description: `${plan.items.length} treatment items`,
      to: "/pro/treatment-plans/$id",
      params: { id: plan.id },
    })),
  ]
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    .slice(0, 10);

  const leadCounts = LEAD_STATUSES.map((status) => ({
    ...status,
    count: leads.filter((lead) => lead.status === status.value).length,
  })).filter((item) => item.count > 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Clinic operations dashboard"
        description={`${clinic?.name ?? "Clinic"} overview • ${format(new Date(), "EEEE, MMM d, yyyy")}`}
        actions={
          <Button asChild>
            <Link to="/pro/leads">Open pipeline</Link>
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard
          icon={Kanban}
          label="New leads"
          value={newLeads.length}
          tone="accent"
          hint={`${leads.length} total`}
          comparison="vs all pipeline"
        />
        <StatCard
          icon={Users}
          label="Patients"
          value={patients.length}
          hint="Clinic-owned records"
        />
        <StatCard
          icon={ClipboardList}
          label="Active Treatment Plans"
          value={plans.length}
          tone="success"
          comparison={`${draftPlans.length} draft`}
        />
        <StatCard
          icon={Clock3}
          label="Awaiting Review"
          value={awaitingReview.length}
          hint={`Estimated value ${formatQuoteMoney(totalPlanValue, plans[0]?.currency ?? "EUR")}`}
        />
        <StatCard
          icon={CheckSquare}
          label="Open tasks"
          value={openTasks.length}
          tone="warning"
          comparison={`${tasks.length} total tasks`}
        />
        <StatCard
          icon={CalendarCheck}
          label="Appointments"
          value={appts.length}
          comparison={`${nextAppts.length} upcoming`}
        />
      </div>

      <div className="grid xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-7">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Pipeline snapshot</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/pro/leads">View board →</Link>
              </Button>
            </div>

            {leadCounts.length === 0 ? (
              <EmptyState
                title="No lead activity yet"
                description="New applications will appear as leads in your pipeline."
              />
            ) : (
              <div className="space-y-3">
                {leadCounts.map((item) => {
                  const pct = Math.max(
                    8,
                    Math.round((item.count / Math.max(1, leads.length)) * 100),
                  );
                  return (
                    <div key={item.value} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Separator className="my-5" />

            <div className="grid sm:grid-cols-3 gap-3">
              <MiniSummary
                icon={CircleEllipsis}
                label="Awaiting review"
                value={leads.filter((lead) => lead.status === "awaiting_review").length}
              />
              <MiniSummary
                icon={Clock3}
                label="Planning in progress"
                value={leads.filter((lead) => lead.status === "treatment_planning").length}
              />
              <MiniSummary
                icon={CheckCircle2}
                label="Booked"
                value={leads.filter((lead) => lead.status === "booked").length}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Tasks & appointments</h2>
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/pro/tasks">Tasks</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/pro/appointments">Calendar</Link>
                </Button>
              </div>
            </div>

            {openTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks.</p>
            ) : (
              <div className="space-y-2">
                {openTasks.slice(0, 4).map((task) => {
                  const assigned = users.find((user) => user.id === task.assigned_to);
                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg bg-surface border border-border/50"
                    >
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.due_at
                          ? `Due ${format(new Date(task.due_at), "MMM d, HH:mm")}`
                          : "No due date"}
                        {assigned ? ` • ${assigned.name}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <Separator className="my-4" />

            <h3 className="text-sm font-semibold mb-2">Upcoming appointments</h3>
            {nextAppts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
            ) : (
              <div className="space-y-2">
                {nextAppts.map((appointment) => (
                  <div key={appointment.id} className="p-3 rounded-lg border border-border/50">
                    <p className="text-sm font-medium">{appointment.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(appointment.starts_at), "MMM d, HH:mm")}
                      {appointment.location ? ` • ${appointment.location}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RecentActivityList items={activityItems} />
    </div>
  );
}

function MiniSummary({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-surface p-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="font-display text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
