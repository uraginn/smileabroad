import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, CalendarCheck, FileCheck2, FileText, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/mock-auth";
import { buildClinicReport, type ReportRange } from "@/lib/crm-reports";
import { formatQuoteMoney } from "@/lib/quote";
import { useMockStore } from "@/lib/mock/store";
import { PageHeader, StatCard } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/pro/reports")({ component: ReportsPage });
function ReportsPage() {
  const user = useAuth((s) => s.user);
  const applications = useMockStore((s) => s.applications);
  const leads = useMockStore((s) => s.leads);
  const patients = useMockStore((s) => s.patients);
  const plans = useMockStore((s) => s.treatmentPlans);
  const appointments = useMockStore((s) => s.appointments);
  const followUps = useMockStore((s) => s.followUps);
  const users = useMockStore((s) => s.users);
  const [range, setRange] = useState<ReportRange>("30");
  const report = useMemo(
    () =>
      buildClinicReport({
        clinicId: user?.clinic_id ?? "",
        range,
        applications,
        leads,
        patients,
        plans,
        appointments,
        followUps,
        users,
      }),
    [user?.clinic_id, range, applications, leads, patients, plans, appointments, followUps, users],
  );
  const currency = plans.find((p) => p.clinic_id === user?.clinic_id)?.currency ?? "EUR";
  const max = Math.max(1, ...report.funnel.map((x) => x[1]));
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Reports"
        description="Clinic-scoped operational and Treatment Plan performance based on recorded CRM data."
        actions={
          <Select value={range} onValueChange={(v) => setRange(v as ReportRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="year">This year</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={FileText} label="Applications" value={report.overview.applications} />
        <StatCard icon={Users} label="Leads" value={report.overview.leads} />
        <StatCard icon={FileCheck2} label="Plans accepted" value={report.overview.accepted} />
        <StatCard icon={CalendarCheck} label="Appointments" value={report.overview.appointments} />
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Treatment Plans</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="distribution">Geography & treatments</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Conversion funnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.funnel.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <Progress value={(value / max) * 100} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Commercial overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Metric label="Plans created" value={report.overview.plans} />
              <Metric label="Plans sent" value={report.overview.sent} />
              <Metric
                label="Estimated plan value"
                value={formatQuoteMoney(report.overview.value, currency)}
              />
              <Metric
                label="Average plan value"
                value={formatQuoteMoney(report.averagePlanValue, currency)}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="plans">
          <Rows title="Plans by current status" rows={report.planStatuses} />
        </TabsContent>
        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Source performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.sourceRows.map((r) => (
                <div
                  key={r.source}
                  className="grid grid-cols-2 gap-2 border-b pb-3 text-sm sm:grid-cols-5"
                >
                  <strong>{r.source.replace(/_/g, " ")}</strong>
                  <span>{r.leads} Leads</span>
                  <span>{r.plans} Plans</span>
                  <span>{r.accepted} accepted</span>
                  <span>{formatQuoteMoney(r.value, currency)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.team.map((r) => (
                <div key={r.id} className="grid gap-1 border-b pb-3 text-sm sm:grid-cols-4">
                  <strong>{r.name}</strong>
                  <span>{r.assignedLeads} assigned Leads</span>
                  <span>{r.completedFollowUps} follow-ups completed</span>
                  <span>{r.upcomingAppointments} upcoming appointments</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="distribution" className="grid gap-4 lg:grid-cols-2">
          <Rows title="Patient countries" rows={report.countries} />
          <Rows title="Preliminary treatment interest" rows={report.interests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
function Rows({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? (
          rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b pb-2 text-sm">
              <span>{label.replace(/_/g, " ")}</span>
              <strong>{value}</strong>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No matching records in this period.</p>
        )}
      </CardContent>
    </Card>
  );
}
