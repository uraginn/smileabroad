import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarCheck2,
  CheckSquare,
  ClipboardList,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Stethoscope,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/mock-auth";
import { calculateQuoteTotals, formatQuoteMoney } from "@/lib/quote";
import { isQuotePubliclyViewable } from "@/lib/quote-visibility";
import type { AssessmentUploads } from "@/types/models";

export const Route = createFileRoute("/pro/patients/$id")({ component: PatientDetail });

function PatientDetail() {
  const { id } = Route.useParams();
  const activeUser = useAuth((s) => s.user);
  const hydrated = useMockStoreHydrated();
  const navigate = useNavigate();
  const patient = useMockStore((s) =>
    s.patients.find((p) => p.id === id && p.clinic_id === activeUser?.clinic_id),
  );
  const users = useMockStore((s) => s.users);
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
  const allTasks = useMockStore((s) => s.tasks);
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
  const tasks = useMemo(
    () =>
      allTasks
        .filter(
          (task) =>
            task.clinic_id === patient?.clinic_id &&
            (task.lead_id === lead?.id ||
              (!!patient?.user_id && task.patient_user_id === patient.user_id)),
        )
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          if (a.due_at && b.due_at) return +new Date(a.due_at) - +new Date(b.due_at);
          if (a.due_at) return -1;
          if (b.due_at) return 1;
          return +new Date(b.created_at) - +new Date(a.created_at);
        }),
    [allTasks, lead?.id, patient?.clinic_id, patient?.user_id],
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

  const clinicUsers = useMemo(
    () => users.filter((user) => user.clinic_id === patient?.clinic_id),
    [patient?.clinic_id, users],
  );
  const coordinator = useMemo(
    () =>
      clinicUsers.find((user) => user.id === lead?.assigned_to) ??
      clinicUsers.find((user) => user.role === "coordinator"),
    [clinicUsers, lead?.assigned_to],
  );
  const dentist = useMemo(() => clinicUsers.find((user) => user.role === "dentist"), [clinicUsers]);

  const activitiesNewestFirst = useMemo(
    () =>
      activities
        .slice()
        .sort(
          (a, b) =>
            +new Date(b.occurred_at ?? b.created_at) - +new Date(a.occurred_at ?? a.created_at),
        ),
    [activities],
  );
  const nextFollowUp = useMemo(
    () =>
      tasks.find((task) => !task.done && !!task.due_at && task.category === "follow_up") ??
      tasks.find((task) => !task.done && !!task.due_at),
    [tasks],
  );

  const assessmentTimeframe =
    [assessment?.travel.earliest_date, assessment?.travel.latest_date]
      .filter(Boolean)
      .join(" - ") || assessment?.travel.treatment_timeline;
  const warningText =
    [assessment?.medical.complications, assessment?.medical.additional_notes]
      .filter(Boolean)
      .join("\n") || undefined;

  const timelineEvents = useMemo(() => {
    const events: Array<{ id: string; at: string; title: string; detail?: string }> = [];
    if (lead) {
      events.push({
        id: `lead-${lead.id}`,
        at: lead.created_at,
        title: "Lead Created",
        detail: `${lead.treatment} · ${lead.source}`,
      });
    }
    if (assessment) {
      events.push({
        id: `assessment-${assessment.id}`,
        at: assessment.created_at,
        title: "Assessment Submitted",
      });
    }
    if (roadmap) {
      events.push({
        id: `roadmap-${roadmap.id}`,
        at: roadmap.created_at,
        title: "Roadmap Generated",
        detail: roadmap.estimated_treatment,
      });
    }
    if (application) {
      events.push({
        id: `application-${application.id}`,
        at: application.created_at,
        title: "Applied to Clinic",
        detail: application.status,
      });
    }
    for (const activity of activities) {
      events.push({
        id: `activity-${activity.id}`,
        at: activity.occurred_at ?? activity.created_at,
        title: activity.kind === "status_change" ? "Status Changed" : kindLabel(activity.kind),
        detail: activity.body,
      });
    }
    for (const plan of plans) {
      events.push({
        id: `plan-${plan.id}`,
        at: plan.created_at,
        title: "Treatment Plan Created",
        detail: plan.title,
      });
    }
    for (const quote of quotes) {
      events.push({
        id: `quote-${quote.id}`,
        at: quote.created_at,
        title: "Quote Sent",
        detail: quote.id,
      });
    }
    return events.sort((a, b) => +new Date(a.at) - +new Date(b.at));
  }, [activities, application, assessment, lead, plans, quotes, roadmap]);

  const [internalNote, setInternalNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [communicationType, setCommunicationType] = useState<
    "whatsapp" | "call" | "email" | "in_person"
  >("whatsapp");
  const [communicationSummary, setCommunicationSummary] = useState("");
  const [communicationAt, setCommunicationAt] = useState(() =>
    format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  );
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpAssignee, setFollowUpAssignee] = useState("");
  const addTreatmentPlan = useMockStore((s) => s.addTreatmentPlan);
  const addLeadActivity = useMockStore((s) => s.addLeadActivity);
  const addTask = useMockStore((s) => s.addTask);
  const toggleTask = useMockStore((s) => s.toggleTask);

  if (!hydrated) return null;
  if (!patient) throw notFound();

  const createTreatmentPlan = () => {
    if (!patient.user_id) return;
    const treatment = assessment?.dental.treatment_interest || patient.treatment_interest;
    const plan = addTreatmentPlan(
      {
        clinic_id: patient.clinic_id,
        patient_user_id: patient.user_id,
        clinic_patient_id: patient.id,
        lead_id: lead?.id,
        clinic_application_id: application?.id,
        assessment_id: assessment?.id,
        roadmap_id: roadmap?.id,
        title: treatment
          ? `${treatment} treatment plan`
          : `Treatment plan for ${patient.first_name} ${patient.last_name}`,
        summary: assessment?.dental.concerns || "Draft clinical treatment plan.",
        items: [],
        visits: 1,
        healing_weeks: 0,
        preliminary_suggestions: roadmap?.treatment_estimates?.map((item) => ({ ...item })) ?? [],
        status: "draft",
      },
      activeUser?.clinic_id === patient.clinic_id ? activeUser.id : "system",
    );
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

  const saveTask = () => {
    const title = taskTitle.trim();
    if (!title) return;
    addTask(
      {
        clinic_id: patient.clinic_id,
        lead_id: lead?.id,
        patient_user_id: patient.user_id,
        title,
        due_at: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
        assigned_to: taskAssignee || coordinator?.id || activeUser?.id,
        priority: taskPriority,
        category: "task",
        done: false,
      },
      activeUser?.clinic_id === patient.clinic_id ? activeUser.id : "system",
    );
    setTaskTitle("");
    setTaskDueDate("");
    toast.success("Task added");
  };

  const saveCommunication = () => {
    const body = communicationSummary.trim();
    if (!body || !lead || !communicationAt) return;
    addLeadActivity({
      clinic_id: patient.clinic_id,
      lead_id: lead.id,
      kind: communicationType,
      body,
      internal: true,
      occurred_at: new Date(communicationAt).toISOString(),
      created_by: activeUser?.clinic_id === patient.clinic_id ? activeUser.id : "system",
    });
    setCommunicationSummary("");
    toast.success("Communication recorded");
  };

  const saveFollowUp = () => {
    const note = followUpNote.trim();
    if (!followUpDate || !note) return;
    addTask(
      {
        clinic_id: patient.clinic_id,
        lead_id: lead?.id,
        patient_user_id: patient.user_id,
        title: note,
        due_at: new Date(followUpDate).toISOString(),
        assigned_to: followUpAssignee || coordinator?.id || activeUser?.id,
        priority: "medium",
        category: "follow_up",
        done: false,
      },
      activeUser?.clinic_id === patient.clinic_id ? activeUser.id : "system",
    );
    setFollowUpDate("");
    setFollowUpNote("");
    toast.success("Follow-up scheduled");
  };

  const patientName = `${patient.first_name} ${patient.last_name}`;

  return (
    <div className="p-4 sm:p-6 max-w-6xl space-y-6">
      <PageHeader
        title={patientName}
        description={`${patient.country} • ${patient.language ?? "Language not set"} • ${patient.email}`}
        actions={
          <>
            <Button onClick={createTreatmentPlan} disabled={!patient.user_id}>
              <Plus className="size-4 mr-1" /> Create Treatment Plan
            </Button>
            <Button asChild variant="outline" disabled={quotes.length === 0}>
              <Link to="." hash="quotes">
                View Quotes
              </Link>
            </Button>
            <Button variant="outline" disabled>
              <CalendarCheck2 className="size-4 mr-1" /> Schedule Appointment
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            <HeaderField label="Country" value={patient.country} />
            <HeaderField label="Preferred language" value={patient.language} />
            <HeaderField label="Lead source" value={lead?.source ?? patient.source} capitalize />
            <HeaderField
              label="Treatment interest"
              value={patient.treatment_interest ?? assessment?.dental.treatment_interest}
            />
            <HeaderField label="Coordinator" value={coordinator?.name} />
            <HeaderField label="Dentist" value={dentist?.name ?? "Not assigned"} />
            <HeaderField
              label="Current CRM stage"
              value={lead?.status?.replace(/_/g, " ") ?? "Not linked"}
              capitalize
            />
            <HeaderField label="Last activity" value={formatDateTime(lead?.last_activity_at)} />
            <HeaderField label="Next follow-up" value={formatDateTime(nextFollowUp?.due_at)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {clinic && <Badge variant="outline">{clinic.name}</Badge>}
            {application?.status && (
              <Badge variant="secondary">Application: {application.status}</Badge>
            )}
            {lead?.priority && <Badge variant="outline">Priority: {lead.priority}</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div>
            <p className="font-display font-semibold">Next follow-up</p>
            <p className="text-sm text-muted-foreground">
              {nextFollowUp
                ? `${formatDateTime(nextFollowUp.due_at)} · ${nextFollowUp.title}`
                : "No follow-up scheduled"}
            </p>
          </div>
          <div className="grid md:grid-cols-[auto_1fr_200px_auto] gap-2">
            <Input
              type="datetime-local"
              aria-label="Follow-up date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
            />
            <Input
              aria-label="Follow-up note"
              placeholder="Short follow-up note"
              value={followUpNote}
              onChange={(event) => setFollowUpNote(event.target.value)}
            />
            <Select
              value={followUpAssignee || "auto"}
              onValueChange={(value) => setFollowUpAssignee(value === "auto" ? "" : value)}
            >
              <SelectTrigger aria-label="Follow-up assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Default coordinator</SelectItem>
                {clinicUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={saveFollowUp} disabled={!followUpDate || !followUpNote.trim()}>
              Set follow-up
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-display font-semibold">Assessment</h3>
            <DetailRows
              rows={[
                ["Treatment interest", assessment?.dental.treatment_interest],
                ["Preferred destination", assessment?.travel.destination_country],
                ["Preferred cities", assessment?.travel.preferred_cities?.join(", ")],
                ["Travel timeframe", assessmentTimeframe],
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-display font-semibold">Medical</h3>
            <DetailRows
              rows={[
                ["Allergies", assessment?.medical.allergies],
                ["Medications", assessment?.medical.medications],
                ["Smoking", assessment ? (assessment.medical.smoking ? "Yes" : "No") : undefined],
                ["Important warnings", warningText],
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-display font-semibold">Files</h3>
            {files.length === 0 ? (
              <EmptyState
                title="No uploads yet"
                description="Uploaded file metadata will appear here."
              />
            ) : (
              <div className="space-y-2">
                {files.slice(0, 3).map((file) => (
                  <div key={file.id} className="rounded-lg border p-2.5">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.kind.replace(/_/g, " ")} · {formatBytes(file.size)}
                    </p>
                  </div>
                ))}
                {files.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{files.length - 3} more files</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex-wrap h-auto">
          {[
            ["overview", "Overview"],
            ["roadmap", "Roadmap Summary"],
            ["assessment", "Assessment"],
            ["medical", "Medical"],
            ["files", "Files"],
            ["notes", "Notes"],
            ["communication", "Communication"],
            ["tasks", "Tasks"],
            ["treatment-plans", "Treatment Plans"],
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
                <p className="text-xs text-muted-foreground">Open tasks</p>
                <p className="text-2xl font-display font-semibold mt-1">
                  {tasks.filter((task) => !task.done).length}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="roadmap">
          {!roadmap || !assessment ? (
            <EmptyState
              title="No Roadmap linked"
              description="A preliminary Roadmap summary will appear when the Lead includes a valid Roadmap reference."
            />
          ) : (
            <div className="space-y-4">
              <Alert>
                <Lock className="size-4" />
                <AlertTitle>Read-only preliminary Roadmap</AlertTitle>
                <AlertDescription>
                  This patient-provided Roadmap is an immutable source record. Clinical decisions
                  belong in the clinic Treatment Plan.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4 lg:grid-cols-2">
                <DetailCard
                  title="Roadmap summary"
                  rows={[
                    ["Reference", roadmap.id.slice(-8).toUpperCase()],
                    ["Destination", assessment.travel.destination_country],
                    ["Preferred cities", assessment.travel.preferred_cities.join(", ")],
                    [
                      "Estimated price",
                      roadmap.price_max > 0
                        ? `${formatRoadmapMoney(roadmap.price_min, roadmap.currency)}–${formatRoadmapMoney(roadmap.price_max, roadmap.currency)}`
                        : "Not available",
                    ],
                    ["Prepared", format(new Date(roadmap.created_at), "MMM d, yyyy")],
                  ]}
                />
                <DetailCard
                  title="Medical summary"
                  rows={[
                    [
                      "Conditions",
                      assessment.medical.conditions.length
                        ? assessment.medical.conditions.join(", ")
                        : "None reported",
                    ],
                    ["Medications", assessment.medical.medications || "None reported"],
                    ["Allergies", assessment.medical.allergies || "None reported"],
                    ["Smoking", assessment.medical.smoking ? "Yes" : "No"],
                  ]}
                />
              </div>
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                      Estimated treatments
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(roadmap.treatment_estimates ?? []).map((item) => (
                        <Badge key={item.treatment_key} variant="secondary">
                          {item.label}
                          {item.estimated_quantity ? ` × ${item.estimated_quantity}` : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <DetailRows
                    rows={[
                      [
                        "Treatment journey",
                        (roadmap.treatment_journey ?? []).map((step) => step.title).join(" → ") ||
                          roadmap.timeline_summary,
                      ],
                      ["Uploaded files", roadmapUploadSummary(assessment.uploads)],
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        <TabsContent value="assessment">
          {!assessment ? (
            <EmptyState
              title="No assessment linked"
              description="Assessment details will appear when available."
            />
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
                <EmptyState
                  title="No medical data linked"
                  description="Medical details will appear when available."
                />
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
                <EmptyState
                  title="No uploaded files"
                  description="File metadata will appear here when uploads exist."
                />
              ) : (
                <div className="divide-y">
                  {files.map((file) => (
                    <div key={file.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.kind.replace(/_/g, " ")} · {formatDateTime(file.created_at)}
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
              {internalNotes.length === 0 ? (
                <EmptyState
                  title="No internal notes"
                  description="Add a note to keep clinic-only context on this patient."
                />
              ) : (
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
        <TabsContent value="communication">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="size-4" /> Communication records are clinic-only manual entries.
              </div>
              <div className="grid md:grid-cols-[180px_220px_1fr_auto] gap-2">
                <Select
                  value={communicationType}
                  onValueChange={(value) => setCommunicationType(value as typeof communicationType)}
                >
                  <SelectTrigger aria-label="Communication type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="datetime-local"
                  aria-label="Communication date"
                  value={communicationAt}
                  onChange={(event) => setCommunicationAt(event.target.value)}
                />
                <Input
                  aria-label="Communication summary"
                  placeholder="Short summary"
                  value={communicationSummary}
                  onChange={(event) => setCommunicationSummary(event.target.value)}
                />
                <Button
                  onClick={saveCommunication}
                  disabled={!lead || !communicationAt || !communicationSummary.trim()}
                >
                  Add record
                </Button>
              </div>
              {!lead && (
                <p className="text-xs text-muted-foreground">
                  A CRM lead is required before communication can be recorded.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tasks">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 xl:grid-cols-[1fr_auto_150px_200px_auto] gap-2">
                <Input
                  placeholder="Add task"
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                />
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(event) => setTaskDueDate(event.target.value)}
                />
                <Select
                  value={taskPriority}
                  onValueChange={(value) => setTaskPriority(value as typeof taskPriority)}
                >
                  <SelectTrigger aria-label="Task priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={taskAssignee || "auto"}
                  onValueChange={(value) => setTaskAssignee(value === "auto" ? "" : value)}
                >
                  <SelectTrigger aria-label="Task assignee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Default coordinator</SelectItem>
                    {clinicUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={saveTask} disabled={!taskTitle.trim()}>
                  <Plus className="size-4 mr-1" /> Add task
                </Button>
              </div>

              {tasks.length === 0 ? (
                <EmptyState
                  title="No tasks"
                  description="Add tasks to track follow-ups for this patient."
                />
              ) : (
                <div className="divide-y rounded-lg border">
                  {tasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface/70"
                    >
                      <Checkbox
                        checked={task.done}
                        onCheckedChange={() =>
                          toggleTask(
                            task.id,
                            activeUser?.clinic_id === patient.clinic_id ? activeUser.id : "system",
                          )
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className={task.done ? "line-through text-muted-foreground" : ""}>
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {task.due_at
                            ? `Due ${format(new Date(task.due_at), "MMM d, yyyy")}`
                            : "No due date"}
                          {` · ${(task.priority ?? "medium").replace(/^./, (letter) => letter.toUpperCase())} priority`}
                          {task.assigned_to &&
                            ` · ${users.find((user) => user.id === task.assigned_to)?.name ?? "Assigned"}`}
                        </p>
                      </div>
                      <Badge variant={task.done ? "outline" : "secondary"}>
                        {task.done ? "Completed" : "Open"}
                      </Badge>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="treatment-plans">
          <div className="space-y-2">
            {plans.length === 0 ? (
              <EmptyState
                title="No treatment plans yet"
                description="Create a treatment plan to capture clinical scope and pricing assumptions."
                action={
                  <Button onClick={createTreatmentPlan} disabled={!patient.user_id}>
                    <Plus className="size-4 mr-1" /> Create Treatment Plan
                  </Button>
                }
              />
            ) : (
              plans.map((p) => {
                const planDentist = clinicUsers.find((user) => user.id === p.dentist_id);
                const estimatedTotal = p.items.reduce((sum, item) => sum + item.unit_price, 0);
                return (
                  <Card key={p.id}>
                    <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {formatDateTime(p.created_at)} · Updated{" "}
                          {formatDateTime(p.updated_at)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {planDentist?.name ?? "Dentist not assigned"} · {p.items.length} items · €
                          {estimatedTotal.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="capitalize">
                          {(p.status ?? "draft").replace(/_/g, " ")}
                        </Badge>
                        <Button asChild variant="outline" size="sm">
                          <Link to="/pro/treatment-plans/$id" params={{ id: p.id }}>
                            Open Plan
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
        <TabsContent value="quotes">
          <div className="space-y-2" id="quotes">
            {quotes.length === 0 ? (
              <EmptyState
                title="No quotes yet"
                description="Once a treatment plan is priced, related quotes will appear here."
              />
            ) : (
              quotes.map((q) => {
                const quotePlan = plans.find((plan) => plan.id === q.treatment_plan_id);
                return (
                  <Card key={q.id}>
                    <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">Quote {q.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {quotePlan?.title ?? "Treatment plan"} · Updated{" "}
                          {formatDateTime(q.updated_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="capitalize">{q.status ?? "draft"}</Badge>
                        <span className="text-sm font-medium">
                          {formatQuoteMoney(calculateQuoteTotals(q).total, q.currency)}
                        </span>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/pro/quotes/$id" params={{ id: q.id }}>
                            Open Quote
                          </Link>
                        </Button>
                        {q.share_token && (
                          <Button asChild size="sm" variant="ghost">
                            <Link
                              to="/shared/treatment-plan/$token"
                              params={{ token: q.share_token }}
                              search={
                                isQuotePubliclyViewable(q.status)
                                  ? { preview: false }
                                  : { preview: true }
                              }
                            >
                              {isQuotePubliclyViewable(q.status) ? "View shared" : "Preview quote"}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6">
              {activitiesNewestFirst.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  description="Lead status changes and notes will be listed once available."
                />
              ) : (
                <div className="space-y-3">
                  {activitiesNewestFirst.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-3 border-l-2 border-primary/30 pl-4 py-1"
                    >
                      <div className="mt-0.5">{kindIcon(activity.kind)}</div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.body}</p>
                        <p className="text-xs text-muted-foreground">
                          {kindLabel(activity.kind)}
                          {users.find((user) => user.id === activity.created_by)
                            ? ` · ${users.find((user) => user.id === activity.created_by)?.name}`
                            : ""}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(activity.occurred_at ?? activity.created_at),
                          "MMM d, HH:mm",
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="size-4 text-muted-foreground" />
            <h3 className="font-display font-semibold">Timeline</h3>
          </div>
          {timelineEvents.length === 0 ? (
            <EmptyState
              title="No timeline events"
              description="Timeline events will appear as patient records are created."
            />
          ) : (
            <div className="space-y-3">
              {timelineEvents.map((event) => (
                <div key={event.id} className="flex gap-3 border-l-2 border-primary/30 pl-4 py-1">
                  <p className="text-xs text-muted-foreground w-36 shrink-0">
                    {formatDateTime(event.at)}
                  </p>
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.detail && (
                      <p className="text-xs text-muted-foreground">{event.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HeaderField({
  label,
  value,
  capitalize,
}: {
  label: string;
  value?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-surface/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium mt-1 line-clamp-2 ${capitalize ? "capitalize" : ""}`}>
        {value ?? "Not available"}
      </p>
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

function kindLabel(kind: string) {
  switch (kind) {
    case "note":
      return "Note";
    case "status_change":
      return "Status change";
    case "email":
      return "Email";
    case "call":
      return "Phone call";
    case "whatsapp":
      return "WhatsApp";
    case "in_person":
      return "In person";
    case "task":
      return "Task";
    case "file":
      return "File";
    default:
      return kind;
  }
}

function kindIcon(kind: string): ReactNode {
  const className = "size-4 text-muted-foreground";
  switch (kind) {
    case "note":
      return <MessageSquare className={className} />;
    case "status_change":
      return <Stethoscope className={className} />;
    case "email":
      return <Mail className={className} />;
    case "call":
      return <Phone className={className} />;
    case "whatsapp":
    case "in_person":
      return <MessageSquare className={className} />;
    case "task":
      return <CheckSquare className={className} />;
    case "file":
      return <FileText className={className} />;
    default:
      return <MessageSquare className={className} />;
  }
}

function formatDateTime(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return format(date, "MMM d, yyyy HH:mm");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRoadmapMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function roadmapUploadSummary(uploads: AssessmentUploads) {
  const labels = [
    uploads.uploaded_panoramic && "Panoramic X-ray",
    uploads.uploaded_dental_photos && "Dental photos",
    uploads.uploaded_smile_photo && "Smile photo",
    uploads.uploaded_cbct && "CBCT",
    uploads.uploaded_previous_plan && "Previous plan",
    uploads.uploaded_previous_report && "Previous report",
  ].filter(Boolean);
  return labels.length ? labels.join(", ") : "No uploads provided";
}
