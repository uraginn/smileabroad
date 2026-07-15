import { createFileRoute, Link } from "@tanstack/react-router";
import { format, isSameDay } from "date-fns";
import {
  AlertCircle,
  CalendarCheck,
  CheckSquare,
  CircleCheckBig,
  ClipboardList,
  Eye,
  FileCheck2,
  Inbox,
  Plus,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-bits";
import { RecentActivityList, type ActivityItem } from "@/components/recent-activity-list";
import { useAuth } from "@/lib/auth/mock-auth";
import { formatCrmDate } from "@/lib/format";
import { getFollowUpState } from "@/lib/lead-workflow";
import {
  selectClinicAppointments,
  selectClinicLeads,
  selectClinicPatients,
  selectClinicPlans,
  selectClinicTasks,
  useMockStore,
} from "@/lib/mock/store";

export const Route = createFileRoute("/pro/dashboard")({ component: ProDashboard });

function ProDashboard() {
  const user = useAuth((state) => state.user);
  const clinicId = user?.clinic_id ?? "";
  const leads = useMockStore(useShallow(selectClinicLeads(clinicId)));
  const patients = useMockStore(useShallow(selectClinicPatients(clinicId)));
  const plans = useMockStore(useShallow(selectClinicPlans(clinicId)));
  const tasks = useMockStore(useShallow(selectClinicTasks(clinicId)));
  const appointments = useMockStore(useShallow(selectClinicAppointments(clinicId)));
  const applications = useMockStore(
    useShallow((state) => state.applications.filter((item) => item.clinic_id === clinicId)),
  );
  const activities = useMockStore(
    useShallow((state) => state.activities.filter((item) => item.clinic_id === clinicId)),
  );
  const followUps = useMockStore((state) => state.followUps);
  const users = useMockStore((state) => state.users);
  const clinics = useMockStore((state) => state.clinics);
  const clinic = clinics.find((item) => item.id === clinicId);
  const now = new Date();
  const overdueFollowUps = followUps.filter(
    (item) =>
      item.clinic_id === clinicId &&
      item.status === "pending" &&
      getFollowUpState(item, now) === "overdue",
  );
  const tasksDueToday = tasks.filter(
    (item) =>
      item.category !== "follow_up" &&
      !item.done &&
      item.due_at &&
      isSameDay(new Date(item.due_at), now),
  );
  const newApplications = applications.filter((item) => item.status === "submitted");
  const awaitingReview = plans.filter((item) => item.status === "doctor_review");
  const approvedNotSent = plans.filter((item) => item.status === "approved");
  const viewedPlans = plans.filter((item) => item.status === "viewed");
  const acceptedPlans = plans.filter((item) => item.status === "accepted");
  const upcomingAppointments = appointments
    .filter(
      (item) =>
        !["completed", "cancelled", "no_show"].includes(item.appointment_status ?? "scheduled") &&
        new Date(item.starts_at) >= now,
    )
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const actionablePlans = [...awaitingReview, ...approvedNotSent, ...viewedPlans, ...acceptedPlans]
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .slice(0, 5);
  const recentApplications = newApplications
    .slice()
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 5);
  const activityItems: ActivityItem[] = activities
    .slice()
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      type: item.kind === "status_change" ? "lead" : "note",
      title: item.kind === "status_change" ? "Lead status updated" : "Clinic activity",
      patient: leads.find((lead) => lead.id === item.lead_id)?.patient_name,
      status: item.kind.replace(/_/g, " "),
      timestamp: item.created_at,
      description: item.body,
      to: "/pro/leads?followUp=overdue",
    }));

  const attention = [
    {
      label: "Follow-ups overdue",
      count: overdueFollowUps.length,
      icon: AlertCircle,
      to: "/pro/leads",
      tone: "text-destructive",
    },
    {
      label: "Tasks due today",
      count: tasksDueToday.length,
      icon: CheckSquare,
      to: "/pro/tasks",
      tone: "text-warning-foreground",
    },
    {
      label: "New applications",
      count: newApplications.length,
      icon: Inbox,
      to: "/pro/leads",
      tone: "text-primary",
    },
    {
      label: "Awaiting doctor review",
      count: awaitingReview.length,
      icon: ClipboardList,
      to: "/pro/treatment-plans?status=doctor_review",
      tone: "text-warning-foreground",
    },
    {
      label: "Ready to share",
      count: approvedNotSent.length,
      icon: FileCheck2,
      to: "/pro/treatment-plans?status=approved",
      tone: "text-success",
    },
    {
      label: "Upcoming appointments",
      count: upcomingAppointments.length,
      icon: CalendarCheck,
      to: "/pro/appointments",
      tone: "text-primary",
    },
    {
      label: "Patient viewed plans",
      count: viewedPlans.length,
      icon: Eye,
      to: "/pro/treatment-plans?status=viewed",
      tone: "text-accent",
    },
    {
      label: "Accepted, follow up",
      count: acceptedPlans.length,
      icon: CircleCheckBig,
      to: "/pro/treatment-plans?status=accepted",
      tone: "text-success",
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Today in your clinic"
        description={`${clinic?.name ?? "Clinic"} · ${format(now, "EEEE, MMM d, yyyy")}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/pro/treatment-plans" search={{ create: true }}>
                <Plus className="size-4" />
                Create Treatment Plan
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/pro/leads">Add New Lead</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {attention.map(({ label, count, icon: Icon, to, tone }) => (
          <a
            key={label}
            href={to}
            className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-colors hover:bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Icon className={`size-4 ${tone}`} />
                  <Badge variant={count ? "default" : "outline"}>{count}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium">{label}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <WorkCard title="Recent applications" action={<Link to="/pro/leads">View Leads</Link>}>
          {recentApplications.length ? (
            recentApplications.map((application) => {
              const lead = leads.find((item) => item.clinic_application_id === application.id);
              const coordinator = users.find((item) => item.id === lead?.assigned_to);
              return (
                <WorkRow
                  key={application.id}
                  title={lead?.patient_name ?? "Patient application"}
                  subtitle={`${lead?.patient_country ?? "Country unavailable"} · ${lead?.treatment ?? "Treatment not specified"}`}
                  meta={`${formatCrmDate(application.created_at)}${coordinator ? ` · ${coordinator.name}` : ""}`}
                  status={lead?.status ?? application.status}
                  href={
                    lead?.clinic_patient_id
                      ? `/pro/patients/${lead.clinic_patient_id}`
                      : "/pro/leads"
                  }
                />
              );
            })
          ) : (
            <EmptyState
              title="No new applications"
              description="New clinic applications will appear here."
            />
          )}
        </WorkCard>

        <WorkCard
          title="Follow-ups requiring attention"
          action={<a href="/pro/leads?followUp=overdue">Open Leads</a>}
        >
          {overdueFollowUps.length ? (
            overdueFollowUps.slice(0, 5).map((followUp) => {
              const lead = leads.find((item) => item.id === followUp.lead_id);
              const assigned = users.find((item) => item.id === followUp.assigned_user_id);
              const overdueDays = Math.max(
                1,
                Math.floor((now.getTime() - new Date(followUp.due_at).getTime()) / 86400000),
              );
              return (
                <WorkRow
                  key={followUp.id}
                  title={lead?.patient_name ?? followUp.reason}
                  subtitle={followUp.reason}
                  meta={`${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue${assigned ? ` · ${assigned.name}` : ""}`}
                  status="overdue"
                  href={lead ? `/pro/leads/${lead.id}` : "/pro/leads"}
                />
              );
            })
          ) : (
            <EmptyState
              title="No overdue follow-ups"
              description="Your follow-up queue is up to date."
            />
          )}
        </WorkCard>

        <WorkCard
          title="Treatment Plans requiring action"
          action={<Link to="/pro/treatment-plans">View Plans</Link>}
        >
          {actionablePlans.length ? (
            actionablePlans.map((plan) => {
              const patient = patients.find((item) => item.id === plan.clinic_patient_id);
              const dentist = users.find((item) => item.id === plan.dentist_id);
              const next =
                plan.status === "doctor_review"
                  ? "Doctor review required"
                  : plan.status === "approved"
                    ? "Copy link and mark sent"
                    : plan.status === "accepted"
                      ? "Acceptance follow-up recommended"
                      : "Patient follow-up recommended";
              return (
                <WorkRow
                  key={plan.id}
                  title={patient ? `${patient.first_name} ${patient.last_name}` : plan.title}
                  subtitle={`${next}${dentist ? ` · ${dentist.name}` : ""}`}
                  meta={`Updated ${formatCrmDate(plan.updated_at)}`}
                  status={plan.status ?? "draft"}
                  href={`/pro/treatment-plans/${plan.id}`}
                />
              );
            })
          ) : (
            <EmptyState
              title="No Treatment Plans need attention"
              description="Plans awaiting review or patient follow-up will appear here."
            />
          )}
        </WorkCard>

        <WorkCard
          title="Upcoming appointments"
          action={<Link to="/pro/appointments">Open Calendar</Link>}
        >
          {upcomingAppointments.length ? (
            upcomingAppointments.slice(0, 5).map((appointment) => {
              const patient = patients.find(
                (item) =>
                  item.user_id === appointment.patient_user_id ||
                  item.id === appointment.patient_user_id,
              );
              return (
                <WorkRow
                  key={appointment.id}
                  title={patient ? `${patient.first_name} ${patient.last_name}` : appointment.title}
                  subtitle={appointment.title}
                  meta={format(new Date(appointment.starts_at), "MMM d, HH:mm")}
                  href="/pro/appointments"
                />
              );
            })
          ) : (
            <EmptyState
              title="No appointments scheduled"
              description="Upcoming clinic appointments will appear here."
            />
          )}
        </WorkCard>
      </div>

      <RecentActivityList items={activityItems} />
    </div>
  );
}

function WorkCard({
  title,
  action,
  children,
}: {
  title: string;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button asChild variant="ghost" size="sm">
          {action}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function WorkRow({
  title,
  subtitle,
  meta,
  status,
  href,
}: {
  title: string;
  subtitle: string;
  meta: string;
  status?: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{meta}</p>
      </div>
      {status && <StatusBadge status={status} />}
    </a>
  );
}
