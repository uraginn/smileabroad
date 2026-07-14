import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { format, isToday, isYesterday } from "date-fns";
import { useMemo, useState } from "react";
import { CalendarClock, Check, CircleDot, FileText, MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageLoading, StatusBadge } from "@/components/ui-bits";
import { LogContactDialog, ScheduleFollowUpDialog } from "@/components/lead-actions";
import { useAuth } from "@/lib/auth/mock-auth";
import {
  deriveLeadOperationalStage,
  getFollowUpState,
  getNextFollowUp,
  LEAD_PIPELINE_STAGES,
} from "@/lib/lead-workflow";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";

export const Route = createFileRoute("/pro/leads/$id")({ component: LeadWorkspace });

function LeadWorkspace() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const actor = useAuth((state) => state.user);
  const clinicId = actor?.clinic_id;
  const hydrated = useMockStoreHydrated();
  const leads = useMockStore((state) => state.leads);
  const patients = useMockStore((state) => state.patients);
  const applications = useMockStore((state) => state.applications);
  const assessments = useMockStore((state) => state.assessments);
  const roadmaps = useMockStore((state) => state.roadmaps);
  const files = useMockStore((state) => state.files);
  const plans = useMockStore((state) => state.treatmentPlans);
  const users = useMockStore((state) => state.users);
  const activities = useMockStore((state) => state.activities);
  const followUps = useMockStore((state) => state.followUps);
  const tasks = useMockStore((state) => state.tasks);
  const updateStatus = useMockStore((state) => state.updateLeadStatus);
  const updateLead = useMockStore((state) => state.updateLead);
  const addPatient = useMockStore((state) => state.addPatient);
  const addPlan = useMockStore((state) => state.addTreatmentPlan);
  const completeFollowUp = useMockStore((state) => state.completeFollowUp);
  const lead = leads.find((item) => item.id === id && item.clinic_id === clinicId);
  const patient = patients.find(
    (item) =>
      item.clinic_id === clinicId &&
      (item.id === lead?.clinic_patient_id || item.user_id === lead?.patient_user_id),
  );
  const application = applications.find(
    (item) => item.id === lead?.clinic_application_id && item.clinic_id === clinicId,
  );
  const assessment = assessments.find((item) => item.id === lead?.assessment_id);
  const roadmap = roadmaps.find((item) => item.id === lead?.roadmap_id);
  const linkedFiles = files.filter(
    (item) =>
      item.patient_user_id === lead?.patient_user_id || item.patient_user_id === patient?.user_id,
  );
  const linkedPlans = plans
    .filter(
      (item) =>
        item.clinic_id === clinicId &&
        (item.lead_id === lead?.id || item.clinic_patient_id === patient?.id),
    )
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
  const activePlan =
    linkedPlans.find((item) => !["declined", "expired"].includes(item.status ?? "")) ??
    linkedPlans[0];
  const leadActivities = useMemo(
    () =>
      activities
        .filter((item) => item.clinic_id === clinicId && item.lead_id === id)
        .sort(
          (a, b) =>
            +new Date(b.occurred_at ?? b.created_at) - +new Date(a.occurred_at ?? a.created_at),
        ),
    [activities, clinicId, id],
  );
  const leadFollowUps = useMemo(
    () =>
      followUps
        .filter((item) => item.clinic_id === clinicId && item.lead_id === id)
        .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at)),
    [clinicId, followUps, id],
  );
  const nextFollowUp = getNextFollowUp(leadFollowUps, id);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("No response");
  const [lostNote, setLostNote] = useState("");

  if (!hydrated) return <PageLoading label="Opening Lead workspace" />;
  if (!lead || !clinicId) throw notFound();
  const clinicUsers = users.filter((item) => item.clinic_id === clinicId && item.active !== false);
  const coordinator = users.find((item) => item.id === lead.assigned_to);
  const dentist = users.find((item) => item.id === activePlan?.dentist_id);
  const operationalStage = deriveLeadOperationalStage({ lead, treatmentPlan: activePlan });
  const latestContact = leadActivities.find((item) =>
    ["call", "whatsapp", "email", "in_person"].includes(item.kind),
  );

  const openPlan = () => {
    if (activePlan)
      return void navigate({ to: "/dentalplan", search: { treatmentPlanId: activePlan.id } });
    if (!patient) return toast.error("A clinic patient record is required before planning");
    const plan = addPlan(
      {
        clinic_id: clinicId,
        patient_user_id: patient.user_id ?? patient.id,
        clinic_patient_id: patient.id,
        lead_id: lead.id,
        clinic_application_id: application?.id,
        assessment_id: assessment?.id,
        roadmap_id: roadmap?.id,
        coordinator_id: lead.assigned_to,
        title: `${lead.treatment || "Dental"} Treatment Plan`,
        summary: assessment?.dental.concerns || "Draft clinical Treatment Plan.",
        items: [],
        visits: 1,
        healing_weeks: 0,
        preliminary_suggestions: roadmap?.treatment_estimates ?? [],
        status: "draft",
      },
      actor?.id,
    );
    void navigate({ to: "/dentalplan", search: { treatmentPlanId: plan.id } });
  };
  const convert = () => {
    let linkedPatient = patient;
    if (!linkedPatient && assessment?.personal.email) {
      const email = assessment.personal.email.trim().toLowerCase();
      linkedPatient = patients.find(
        (item) => item.clinic_id === clinicId && item.email?.trim().toLowerCase() === email,
      );
      linkedPatient ??= addPatient(
        {
          clinic_id: clinicId,
          user_id: lead.patient_user_id,
          first_name: assessment.personal.first_name,
          last_name: assessment.personal.last_name ?? "",
          email: assessment.personal.email,
          phone: assessment.personal.phone,
          whatsapp: assessment.personal.whatsapp,
          country: assessment.personal.country ?? lead.patient_country,
          city: assessment.personal.city,
          language: assessment.personal.preferred_language,
          source: "smileabroad",
          assessment_id: assessment.id,
          roadmap_id: roadmap?.id,
          treatment_interest: assessment.dental.treatment_interest,
        },
        actor?.id,
      );
      updateLead(lead.id, clinicId, { clinic_patient_id: linkedPatient.id }, actor?.id);
    }
    if (!linkedPatient)
      return toast.error("Patient identity is incomplete; conversion was not performed");
    updateStatus(lead.id, "booked", actor?.id, "Converted to active clinic opportunity");
    toast.success("Lead marked converted");
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/pro/leads">← Leads</Link>
          </Button>
          <h1 className="mt-1 text-2xl font-semibold">{lead.patient_name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={operationalStage} />
            <Badge variant="outline" className="capitalize">
              {lead.priority} priority
            </Badge>
            <Badge variant="outline">{lead.patient_country}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openPlan}>
            {activePlan ? "Open Treatment Plan" : "Create Treatment Plan"}
          </Button>
          <Button variant="outline" onClick={() => setContactOpen(true)}>
            <MessageSquare className="size-4" />
            Log contact
          </Button>
          <Button variant="outline" onClick={() => setFollowUpOpen(true)}>
            <CalendarClock className="size-4" />
            Schedule follow-up
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Meta label="Coordinator" value={coordinator?.name ?? "Unassigned"} />
          <Meta label="Dentist" value={dentist?.name ?? "Not assigned"} />
          <Meta
            label="Next follow-up"
            value={
              nextFollowUp
                ? format(new Date(nextFollowUp.due_at), "MMM d, yyyy HH:mm")
                : "Not scheduled"
            }
          />
          <Meta
            label="Latest contact"
            value={
              latestContact
                ? format(
                    new Date(latestContact.occurred_at ?? latestContact.created_at),
                    "MMM d, yyyy HH:mm",
                  )
                : "No contact logged"
            }
          />
          <Meta label="Source" value={lead.source.replace(/_/g, " ")} />
        </CardContent>
      </Card>
      <Tabs defaultValue="overview">
        <TabsList className="h-auto max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessment">Assessment & Roadmap</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Meta label="Full name" value={lead.patient_name} />
                <Meta label="Email" value={patient?.email ?? assessment?.personal.email} />
                <Meta
                  label="Phone / WhatsApp"
                  value={
                    patient?.whatsapp ??
                    patient?.phone ??
                    assessment?.personal.whatsapp ??
                    assessment?.personal.phone
                  }
                />
                <Meta
                  label="Preferred language"
                  value={patient?.language ?? assessment?.personal.preferred_language}
                />
                <Meta label="Country" value={patient?.country ?? lead.patient_country} />
                <Meta
                  label="Preferred contact"
                  value={assessment?.personal.preferred_contact_method}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Coordination</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Meta
                  label="Stage"
                  value={LEAD_PIPELINE_STAGES.find((item) => item.key === operationalStage)?.label}
                />
                <Meta label="Priority" value={lead.priority} />
                <Meta label="Destination" value={assessment?.travel.destination_country} />
                <Meta
                  label="Preferred cities"
                  value={assessment?.travel.preferred_cities?.join(", ")}
                />
                <Meta label="Coordinator" value={coordinator?.name} />
                <Meta label="Dentist" value={dentist?.name} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Follow-up</CardTitle>
              <Button size="sm" onClick={() => setFollowUpOpen(true)}>
                <Plus className="size-4" />
                Schedule
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {leadFollowUps.length ? (
                leadFollowUps.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.due_at), "MMM d, yyyy HH:mm")} ·{" "}
                        {item.notes || "No notes"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {getFollowUpState(item).replace(/_/g, " ")}
                      </Badge>
                      {item.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            completeFollowUp(item.id, clinicId, actor?.id);
                            toast.success("Follow-up completed");
                          }}
                        >
                          <Check className="size-4" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No follow-up scheduled"
                  description="Schedule the next patient contact when needed."
                />
              )}
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Select
              value={
                LEAD_PIPELINE_STAGES.some((item) => item.key === lead.status)
                  ? lead.status
                  : operationalStage
              }
              disabled={["booked", "lost"].includes(operationalStage)}
              onValueChange={(value) =>
                value === "lost"
                  ? setLostOpen(true)
                  : updateStatus(lead.id, value as typeof lead.status, actor?.id)
              }
            >
              <SelectTrigger className="w-64" aria-label="Change Lead stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_PIPELINE_STAGES.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={convert} disabled={operationalStage === "booked"}>
              Mark Converted
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="assessment" className="space-y-4">
          {assessment ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Assessment summary</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Meta label="Treatment interest" value={assessment.dental.treatment_interest} />
                  <Meta label="Dental concerns" value={assessment.dental.concerns} />
                  <Meta label="Destination" value={assessment.travel.destination_country} />
                  <Meta
                    label="Submitted"
                    value={format(new Date(assessment.created_at), "MMM d, yyyy")}
                  />
                  <Meta
                    label="Uploads available"
                    value={Object.values(assessment.uploads).some(Boolean) ? "Yes" : "No"}
                  />
                </CardContent>
              </Card>
              {(assessment.medical.conditions.length ||
                assessment.medical.allergies ||
                assessment.medical.medications) && (
                <Alert>
                  <AlertTitle>Clinical review information</AlertTitle>
                  <AlertDescription>
                    Conditions: {assessment.medical.conditions.join(", ") || "None listed"}.
                    Allergies: {assessment.medical.allergies || "None listed"}. Medications:{" "}
                    {assessment.medical.medications || "None listed"}.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <EmptyState
              title="No Assessment linked"
              description="This Lead does not have an Assessment reference."
            />
          )}
          {roadmap ? (
            <Card>
              <CardHeader>
                <CardTitle>Preliminary Roadmap information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Read-only preliminary suggestions; these are not confirmed clinical treatments.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(roadmap.treatment_estimates ?? []).map((item) => (
                    <Badge key={item.treatment_key} variant="outline">
                      {item.label}
                      {item.estimated_quantity ? ` · approx. ${item.estimated_quantity}` : ""}
                    </Badge>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/roadmap/$id" params={{ id: roadmap.id }}>
                    Open Roadmap
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No Roadmap linked"
              description="Preliminary Roadmap context is unavailable."
            />
          )}
        </TabsContent>
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Case files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {linkedFiles.length ? (
                linkedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(file.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline">{file.kind.replace(/_/g, " ")}</Badge>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No files have been provided"
                  description="Uploaded file metadata will appear here."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTimeline activities={leadActivities} users={users} />
        </TabsContent>
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Lead tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks
                .filter((item) => item.clinic_id === clinicId && item.lead_id === lead.id)
                .map((item) => (
                  <div key={item.id} className="flex justify-between rounded-lg border p-3 text-sm">
                    <span>{item.title}</span>
                    <Badge variant="outline">{item.done ? "Completed" : "Open"}</Badge>
                  </div>
                ))}
              {!tasks.some((item) => item.clinic_id === clinicId && item.lead_id === lead.id) && (
                <EmptyState
                  title="No tasks"
                  description="Create Lead tasks from the Tasks workspace."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <ScheduleFollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        lead={lead}
        patient={patient}
        users={clinicUsers}
      />
      <LogContactDialog open={contactOpen} onOpenChange={setContactOpen} lead={lead} />
      <AlertDialog open={lostOpen} onOpenChange={setLostOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this Lead as Lost?</AlertDialogTitle>
            <AlertDialogDescription>
              The Lead and its history will be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={lostReason} onValueChange={setLostReason}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "No response",
                "Price",
                "Chose another clinic",
                "Not ready",
                "Medical reason",
                "Invalid application",
                "Duplicate",
                "Other",
              ].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={lostNote}
            onChange={(event) => setLostNote(event.target.value)}
            placeholder="Optional note"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                updateStatus(
                  lead.id,
                  "lost",
                  actor?.id,
                  [lostReason, lostNote.trim()].filter(Boolean).join(": "),
                )
              }
            >
              Mark Lost
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActivityTimeline({
  activities,
  users,
}: {
  activities: ReturnType<typeof useMockStore.getState>["activities"];
  users: ReturnType<typeof useMockStore.getState>["users"];
}) {
  if (!activities.length)
    return (
      <EmptyState
        title="No activity recorded"
        description="Lead actions and contact history will appear here."
      />
    );
  const groups = activities.reduce<Record<string, typeof activities>>((result, item) => {
    const date = new Date(item.occurred_at ?? item.created_at);
    const key = isToday(date)
      ? "Today"
      : isYesterday(date)
        ? "Yesterday"
        : format(date, "MMM d, yyyy");
    (result[key] ??= []).push(item);
    return result;
  }, {});
  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        {Object.entries(groups).map(([date, items]) => (
          <section key={date}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {date}
            </h3>
            <div className="space-y-2">
              {items.map((item) => {
                const actor = users.find((user) => user.id === item.created_by);
                return (
                  <div key={item.id} className="flex gap-3 rounded-lg border p-3">
                    <CircleDot className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {item.kind.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(item.occurred_at ?? item.created_at), "HH:mm")} ·{" "}
                        {actor?.name ?? "System"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize">{value || "Not available"}</p>
    </div>
  );
}
