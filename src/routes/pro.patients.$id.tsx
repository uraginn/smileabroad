import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Building2, Lock, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/mock-auth";

export const Route = createFileRoute("/pro/patients/$id")({ component: PatientDetail });

function PatientDetail() {
  const { id } = Route.useParams();
  const hydrated = useMockStoreHydrated();
  const navigate = useNavigate();
  const patient = useMockStore((s) => s.patients.find((p) => p.id === id));
  const clinic = useMockStore((s) => s.clinics.find((c) => c.id === patient?.clinic_id));
  const application = useMockStore((s) =>
    s.applications.find(
      (a) =>
        a.clinic_id === patient?.clinic_id &&
        (a.clinic_patient_id === patient?.id || a.patient_user_id === patient?.user_id),
    ),
  );
  const assessment = useMockStore((s) =>
    s.assessments.find((a) => a.id === (patient?.assessment_id ?? application?.assessment_id)),
  );
  const roadmap = useMockStore((s) =>
    s.roadmaps.find((r) => r.id === (patient?.roadmap_id ?? application?.roadmap_id)),
  );
  const lead = useMockStore((s) =>
    s.leads.find(
      (l) =>
        l.clinic_id === patient?.clinic_id &&
        (l.clinic_patient_id === patient?.id ||
          l.clinic_application_id === application?.id ||
          (!l.clinic_patient_id && l.patient_user_id === patient?.user_id)),
    ),
  );
  const allFiles = useMockStore((s) => s.files);
  const allActivities = useMockStore((s) => s.activities);
  const allPlans = useMockStore((s) => s.treatmentPlans);
  const allQuotes = useMockStore((s) => s.quotes);
  const files = useMemo(
    () =>
      allFiles.filter(
        (f) =>
          f.patient_user_id === patient?.user_id &&
          (!f.clinic_id || f.clinic_id === patient?.clinic_id),
      ),
    [allFiles, patient?.clinic_id, patient?.user_id],
  );
  const activities = useMemo(
    () => allActivities.filter((a) => a.clinic_id === patient?.clinic_id && a.lead_id === lead?.id),
    [allActivities, lead?.id, patient?.clinic_id],
  );
  const internalNotes = useMemo(
    () => activities.filter((activity) => activity.kind === "note" && activity.internal),
    [activities],
  );
  const plans = useMemo(
    () =>
      allPlans.filter(
        (t) =>
          t.clinic_id === patient?.clinic_id &&
          (t.clinic_patient_id === patient?.id ||
            (!t.clinic_patient_id && t.patient_user_id === patient?.user_id)),
      ),
    [allPlans, patient?.clinic_id, patient?.id, patient?.user_id],
  );
  const quotes = useMemo(
    () =>
      allQuotes.filter(
        (q) => q.clinic_id === patient?.clinic_id && q.patient_user_id === patient?.user_id,
      ),
    [allQuotes, patient?.clinic_id, patient?.user_id],
  );
  const [internalNote, setInternalNote] = useState("");
  const addTreatmentPlan = useMockStore((s) => s.addTreatmentPlan);
  const addLeadActivity = useMockStore((s) => s.addLeadActivity);
  const activeUser = useAuth((s) => s.user);

  if (!hydrated) return null;
  if (!patient) throw notFound();

  const createTreatmentPlan = () => {
    if (!patient.user_id) return;
    const treatment = assessment?.dental.treatment_interest || patient.treatment_interest;
    const plan = addTreatmentPlan({
      clinic_id: patient.clinic_id,
      patient_user_id: patient.user_id,
      clinic_patient_id: patient.id,
      title: treatment
        ? `${treatment} treatment plan`
        : `Treatment plan for ${patient.first_name} ${patient.last_name}`,
      summary: roadmap?.summary || assessment?.dental.concerns || "Draft treatment plan.",
      items: [],
      visits: roadmap?.estimated_visits ?? 1,
      healing_weeks: roadmap?.healing_weeks ?? 0,
      status: "draft",
    });
    navigate({ to: "/pro/treatment-plans/$id", params: { id: plan.id } });
  };
  const saveInternalNote = () => {
    const body = internalNote.trim();
    if (!body || !lead) return;
    addLeadActivity({
      clinic_id: patient.clinic_id,
      lead_id: lead.id,
      kind: "note",
      body,
      internal: true,
      created_by: activeUser?.clinic_id === patient.clinic_id ? activeUser.id : "system",
    });
    setInternalNote("");
    toast.success("Internal note saved");
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl space-y-4">
      <PageHeader
        title={`${patient.first_name} ${patient.last_name}`}
        description={`${patient.country} • ${patient.language ?? "Language not set"} • ${patient.email}`}
        actions={
          <Button onClick={createTreatmentPlan} disabled={!patient.user_id}>
            <Plus className="size-4 mr-1" /> Create treatment plan
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Summary
              title="Clinic"
              value={clinic?.name ?? patient.clinic_id}
              icon={<Building2 className="size-4" />}
            />
            <Summary
              title="Treatment interest"
              value={
                patient.treatment_interest ??
                assessment?.dental.treatment_interest ??
                "Not specified"
              }
            />
            <Summary title="Application" value={application?.status ?? "Not linked"} />
            <Summary title="Roadmap" value={roadmap ? "Linked" : "Not linked"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {lead?.status && (
              <Badge variant="secondary" className="capitalize">
                Lead: {lead.status.replace(/_/g, " ")}
              </Badge>
            )}
            {patient.source && (
              <Badge variant="outline" className="capitalize">
                Source: {patient.source}
              </Badge>
            )}
            {application?.id && (
              <Badge variant="outline">Application {application.id.slice(0, 8)}</Badge>
            )}
            {roadmap?.id && <Badge variant="outline">Roadmap {roadmap.id.slice(0, 8)}</Badge>}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex-wrap h-auto">
          {[
            ["overview", "Overview"],
            ["assessment", "Assessment"],
            ["medical", "Medical"],
            ["files", "Files"],
            ["notes", "Notes"],
            ["tasks", "Tasks"],
            ["plans", "Treatment Plans"],
            ["quotes", "Quotes"],
            ["activity", "Activity"],
          ].map(([value, label]) => (
            <TabsTrigger key={value} value={value} className="capitalize">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Treatment plans</p>
                <p className="text-2xl font-display font-semibold mt-1">{plans.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Quotes</p>
                <p className="text-2xl font-display font-semibold mt-1">{quotes.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className="mt-2">Active</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="assessment">
          {!assessment ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No assessment is linked to this patient.
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              <DetailCard
                title="Dental information"
                rows={[
                  ["Treatment interest", assessment.dental.treatment_interest],
                  ["Concerns", assessment.dental.concerns],
                  ["Affected areas", assessment.dental.affected_areas],
                  ["Missing teeth", assessment.dental.missing_teeth],
                  ["Expected result", assessment.dental.expected_result],
                  ["Additional notes", assessment.dental.additional_notes],
                ]}
              />
              <DetailCard
                title="Personal information"
                rows={[
                  [
                    "Name",
                    `${assessment.personal.first_name} ${assessment.personal.last_name ?? ""}`.trim(),
                  ],
                  ["Email", assessment.personal.email],
                  ["Phone", assessment.personal.phone],
                  ["WhatsApp", assessment.personal.whatsapp],
                  ["Country", assessment.personal.country],
                  ["Language", assessment.personal.preferred_language],
                ]}
              />
              <DetailCard
                title="Travel preferences"
                rows={[
                  ["Destination", assessment.travel.destination_country],
                  ["Preferred cities", assessment.travel.preferred_cities.join(", ")],
                  ["Travelling from", assessment.travel.travel_from],
                  [
                    "Travel dates",
                    [assessment.travel.earliest_date, assessment.travel.latest_date]
                      .filter(Boolean)
                      .join(" – "),
                  ],
                  ["Companions", String(assessment.travel.companions)],
                  ["Hotel", assessment.travel.needs_hotel ? "Required" : "Not required"],
                  [
                    "Airport transfer",
                    assessment.travel.needs_airport_transfer ? "Required" : "Not required",
                  ],
                  ["Budget", assessment.travel.budget],
                ]}
              />
              <DetailCard
                title="Application"
                rows={[
                  ["Status", application?.status],
                  ["Source", patient.source],
                  ["Roadmap", application?.roadmap_id ?? patient.roadmap_id],
                  [
                    "Submitted",
                    application
                      ? format(new Date(application.created_at), "MMM d, yyyy HH:mm")
                      : undefined,
                  ],
                ]}
              />
            </div>
          )}
        </TabsContent>
        <TabsContent value="medical">
          <Card>
            <CardContent className="p-6">
              {!assessment ? (
                <p className="text-sm text-muted-foreground">
                  No medical information is linked to this patient.
                </p>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Conditions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {assessment.medical.conditions.length > 0 ? (
                        assessment.medical.conditions.map((condition) => (
                          <Badge key={condition} variant="secondary">
                            {condition}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None reported</span>
                      )}
                    </div>
                  </div>
                  <DetailRows
                    rows={[
                      ["Medications", assessment.medical.medications],
                      ["Allergies", assessment.medical.allergies],
                      ["Smoking", assessment.medical.smoking ? "Yes" : "No"],
                      ["Pregnancy", assessment.medical.pregnancy ? "Yes" : "No"],
                      ["Complications", assessment.medical.complications],
                      ["Additional notes", assessment.medical.additional_notes],
                    ]}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="files">
          <Card>
            <CardContent className="p-6">
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">No uploaded files.</p>
              ) : (
                <div className="divide-y">
                  {files.map((file) => (
                    <div key={file.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.kind.replace(/_/g, " ")}
                        </p>
                      </div>
                      <Badge variant="outline">{file.mime}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notes">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="size-4" /> Internal notes are never shared with the patient.
              </div>
              <Textarea
                rows={4}
                placeholder="Add an internal note…"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
              />
              <Button size="sm" onClick={saveInternalNote} disabled={!lead || !internalNote.trim()}>
                Save note
              </Button>
              {!lead && (
                <p className="text-xs text-muted-foreground">
                  A CRM lead is required before notes can be saved.
                </p>
              )}
              {internalNotes.length > 0 && (
                <div className="pt-4 border-t space-y-3">
                  {internalNotes
                    .slice()
                    .reverse()
                    .map((note) => (
                      <div key={note.id} className="rounded-lg bg-surface p-3">
                        <p className="text-sm whitespace-pre-line">{note.body}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(note.created_at), "MMM d, yyyy HH:mm")} · Internal
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tasks">
          <Card>
            <CardContent className="p-6">
              <EmptyState
                title="No linked tasks yet"
                description="Patient-specific task workflow is not configured in this mock screen."
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="plans">
          <div className="space-y-2">
            {plans.length === 0 ? (
              <EmptyState
                title="No treatment plans yet"
                description="Create a treatment plan to capture clinical scope and pricing assumptions."
              />
            ) : (
              plans.map((p) => (
                <Link key={p.id} to="/pro/treatment-plans/$id" params={{ id: p.id }}>
                  <Card className="hover:border-primary transition">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.items.length} items · {p.visits} visits
                        </p>
                      </div>
                      <Badge className="capitalize">{p.status ?? "draft"}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="quotes">
          <div className="space-y-2">
            {quotes.length === 0 ? (
              <EmptyState
                title="No quotes yet"
                description="Once a treatment plan is priced, related quotes will appear here."
              />
            ) : (
              quotes.map((q) => (
                <Link key={q.id} to="/pro/quotes/$id" params={{ id: q.id }}>
                  <Card className="hover:border-primary transition">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">Quote {q.id.slice(0, 6)}</p>
                        <p className="text-xs text-muted-foreground">{q.items.length} items</p>
                      </div>
                      <Badge>{q.currency}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6">
              {activities.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  description="Lead status changes and notes will be listed once available."
                />
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-3 border-l-2 border-primary/30 pl-4 py-1"
                    >
                      <div className="flex-1">
                        <p className="text-sm">{activity.body}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {activity.kind.replace(/_/g, " ")}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), "MMM d, HH:mm")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <ArrowRight className="size-3" />
        Patient and lead links remain clinic-scoped in mock selectors.
      </div>
    </div>
  );
}

function Summary({ title, value, icon }: { title: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border bg-surface/50 p-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {title}
      </p>
      <p className="text-sm font-medium mt-1 line-clamp-2">{value}</p>
    </div>
  );
}

type DetailRow = [string, string | undefined];

function DetailCard({ title, rows }: { title: string; rows: DetailRow[] }) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-display font-semibold mb-4">{title}</h3>
        <DetailRows rows={rows} />
      </CardContent>
    </Card>
  );
}

function DetailRows({ rows }: { rows: DetailRow[] }) {
  const visibleRows = rows.filter(([, value]) => value != null && value !== "");
  if (visibleRows.length === 0)
    return <p className="text-sm text-muted-foreground">No information provided.</p>;
  return (
    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
      {visibleRows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
          <dd className="text-sm mt-0.5 whitespace-pre-line">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
