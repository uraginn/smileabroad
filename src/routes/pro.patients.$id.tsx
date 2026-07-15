import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { format, isToday, isYesterday } from "date-fns";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Lock, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageLoading, StatusBadge } from "@/components/ui-bits";
import { LogContactDialog, ScheduleFollowUpDialog } from "@/components/lead-actions";
import { PatientFormDialog } from "@/components/patient-form-dialog";
import { useAuth } from "@/lib/auth/mock-auth";
import { formatCrmDate } from "@/lib/format";
import { getFollowUpState } from "@/lib/lead-workflow";
import {
  derivePatientOperationalStatus,
  getActivePatientPlan,
  getPatientActivity,
  getPatientNextFollowUp,
} from "@/lib/patient-workspace";
import { calculateTreatmentPlanTotals } from "@/lib/treatment-plan-commercial";
import { formatQuoteMoney } from "@/lib/quote";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";

export const Route = createFileRoute("/pro/patients/$id")({ component: PatientWorkspace });

function PatientWorkspace() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const actor = useAuth((state) => state.user);
  const hydrated = useMockStoreHydrated();
  const patients = useMockStore((state) => state.patients);
  const leads = useMockStore((state) => state.leads);
  const applications = useMockStore((state) => state.applications);
  const assessments = useMockStore((state) => state.assessments);
  const roadmaps = useMockStore((state) => state.roadmaps);
  const files = useMockStore((state) => state.files);
  const plans = useMockStore((state) => state.treatmentPlans);
  const appointments = useMockStore((state) => state.appointments);
  const activities = useMockStore((state) => state.activities);
  const followUps = useMockStore((state) => state.followUps);
  const users = useMockStore((state) => state.users);
  const createPatientAndTreatmentPlan = useMockStore(
    (state) => state.createPatientAndTreatmentPlan,
  );
  const completeFollowUp = useMockStore((state) => state.completeFollowUp);
  const patient = patients.find((item) => item.id === id && item.clinic_id === actor?.clinic_id);
  const patientLeads = useMemo(
    () =>
      leads
        .filter(
          (item) =>
            item.clinic_id === patient?.clinic_id &&
            (item.clinic_patient_id === patient?.id ||
              (!!patient?.user_id && item.patient_user_id === patient.user_id)),
        )
        .sort((a, b) => {
          const aHistorical = ["declined", "expired"].includes(a.status ?? "");
          const bHistorical = ["declined", "expired"].includes(b.status ?? "");
          if (aHistorical !== bHistorical) return aHistorical ? 1 : -1;
          return +new Date(b.updated_at) - +new Date(a.updated_at);
        }),
    [leads, patient?.clinic_id, patient?.id, patient?.user_id],
  );
  const lead = patientLeads[0];
  const application = applications.find(
    (item) =>
      item.clinic_id === patient?.clinic_id &&
      (item.clinic_patient_id === patient?.id || item.patient_user_id === patient?.user_id),
  );
  const assessment = assessments.find(
    (item) =>
      item.id === (patient?.assessment_id ?? lead?.assessment_id ?? application?.assessment_id),
  );
  const roadmap = roadmaps.find(
    (item) => item.id === (patient?.roadmap_id ?? lead?.roadmap_id ?? application?.roadmap_id),
  );
  const patientPlans = useMemo(
    () =>
      plans
        .filter(
          (item) =>
            item.clinic_id === patient?.clinic_id &&
            (item.clinic_patient_id === patient?.id ||
              (!item.clinic_patient_id && item.patient_user_id === patient?.user_id)),
        )
        .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)),
    [patient?.clinic_id, patient?.id, patient?.user_id, plans],
  );
  const activePlan = patient ? getActivePatientPlan(plans, patient) : undefined;
  const patientAppointments = useMemo(
    () =>
      appointments
        .filter(
          (item) =>
            item.clinic_id === patient?.clinic_id &&
            (item.patient_user_id === patient?.user_id || item.patient_user_id === patient?.id),
        )
        .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
    [appointments, patient?.clinic_id, patient?.id, patient?.user_id],
  );
  const patientFiles = useMemo(
    () =>
      files.filter(
        (item) =>
          (!item.clinic_id || item.clinic_id === patient?.clinic_id) &&
          (item.patient_user_id === patient?.user_id || item.patient_user_id === patient?.id),
      ),
    [files, patient?.clinic_id, patient?.id, patient?.user_id],
  );
  const patientActivity = useMemo(
    () =>
      patient
        ? getPatientActivity({ activities, patient, leadIds: patientLeads.map((item) => item.id) })
        : [],
    [activities, patient, patientLeads],
  );
  const nextFollowUp = patient
    ? getPatientNextFollowUp(
        followUps,
        patient,
        patientLeads.map((item) => item.id),
      )
    : undefined;
  const [editOpen, setEditOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  if (!hydrated) return <PageLoading label="Opening patient workspace" />;
  if (!patient || !actor?.clinic_id) throw notFound();
  const clinicUsers = users.filter(
    (item) => item.clinic_id === patient.clinic_id && item.active !== false,
  );
  const coordinator = users.find(
    (item) => item.id === (patient.coordinator_id ?? lead?.assigned_to),
  );
  const dentist = users.find((item) => item.id === (patient.dentist_id ?? activePlan?.dentist_id));
  const upcomingAppointments = patientAppointments.filter(
    (item) => new Date(item.starts_at) >= new Date(),
  );
  const pastAppointments = patientAppointments
    .filter((item) => new Date(item.starts_at) < new Date())
    .reverse();
  const status = derivePatientOperationalStatus({
    patient,
    lead,
    plan: activePlan,
    hasUpcomingAppointment: upcomingAppointments.length > 0,
  });
  const communications = patientActivity.filter((item) =>
    ["call", "whatsapp", "email", "in_person", "note"].includes(item.kind),
  );
  const lastContact = communications.find((item) => item.kind !== "note");
  const createOrOpenPlan = () => {
    if (activePlan?.share_token && ["sent", "viewed"].includes(activePlan.status ?? "draft")) {
      return void navigate({
        to: "/shared/treatment-plan/$token",
        params: { token: activePlan.share_token },
        search: { preview: true },
      });
    }
    if (activePlan)
      return void navigate({ to: "/dentalplan", search: { treatmentPlanId: activePlan.id } });
    try {
      const { plan } = createPatientAndTreatmentPlan(
        {
          patient_id: patient.id,
          plan: {
            clinic_id: patient.clinic_id,
            lead_id: lead?.id,
            clinic_application_id: application?.id,
            assessment_id: assessment?.id,
            roadmap_id: roadmap?.id,
            dentist_id: patient.dentist_id,
            coordinator_id: patient.coordinator_id ?? lead?.assigned_to,
            title: `${patient.treatment_interest ?? assessment?.dental.treatment_interest ?? "Dental"} Treatment Plan`,
            summary: assessment?.dental.concerns || "Draft clinical Treatment Plan.",
            preliminary_suggestions: roadmap?.treatment_estimates ?? [],
            status: "draft",
          },
        },
        actor.id,
      );
      void navigate({ to: "/dentalplan", search: { treatmentPlanId: plan.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Treatment Plan could not be created");
    }
  };
  const warnings = [
    nextFollowUp && getFollowUpState(nextFollowUp) === "overdue"
      ? "Patient follow-up is overdue."
      : undefined,
    !patientFiles.some((item) => ["panoramic", "cbct"].includes(item.kind)) &&
    !(assessment?.uploads.uploaded_panoramic || assessment?.uploads.uploaded_cbct)
      ? "No X-ray metadata is available."
      : undefined,
    activePlan?.status === "doctor_review"
      ? "Treatment Plan is awaiting doctor review."
      : undefined,
    activePlan?.status === "viewed"
      ? "Patient viewed the Treatment Plan; follow-up may be needed."
      : undefined,
  ].filter(Boolean) as string[];
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/pro/patients">← Patients</Link>
          </Button>
          <h1 className="mt-1 text-2xl font-semibold">
            {patient.first_name} {patient.last_name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={status} />
            <Badge variant="outline">{patient.country}</Badge>
            <Badge variant="outline">{patient.language || "Language not set"}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={createOrOpenPlan}>
            {activePlan
              ? activePlan.share_token && ["sent", "viewed"].includes(activePlan.status ?? "")
                ? "Open Patient View"
                : "Continue Planning"
              : "Create Treatment Plan"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" aria-label="More patient actions">
                <MoreHorizontal className="size-4" /> Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!lead} onClick={() => setContactOpen(true)}>
                Log contact
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!lead} onClick={() => setFollowUpOpen(true)}>
                Schedule follow-up
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/pro/tasks">Create task</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/pro/appointments">Book appointment</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit patient</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                ? `${formatCrmDate(nextFollowUp.due_at)} · ${getFollowUpState(nextFollowUp).replace(/_/g, " ")}`
                : "Not scheduled"
            }
          />
          <Meta
            label="Last contact"
            value={
              lastContact
                ? formatCrmDate(lastContact.occurred_at ?? lastContact.created_at)
                : "No contact logged"
            }
          />
          <Meta label="Source" value={patient.source ?? lead?.source ?? "manual"} />
        </CardContent>
      </Card>
      <Tabs defaultValue="overview">
        <TabsList className="h-auto max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clinical">Clinical Information</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="plans">Treatment Plans</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard title="Contact">
              <div className="grid gap-3 sm:grid-cols-2">
                <Meta label="Full name" value={`${patient.first_name} ${patient.last_name}`} />
                <Meta label="Email" value={patient.email} link={`mailto:${patient.email}`} />
                <Meta
                  label="WhatsApp / phone"
                  value={patient.whatsapp ?? patient.phone}
                  link={
                    patient.whatsapp || patient.phone
                      ? `tel:${patient.whatsapp ?? patient.phone}`
                      : undefined
                  }
                />
                <Meta
                  label="Preferred contact"
                  value={
                    patient.preferred_contact_method ??
                    assessment?.personal.preferred_contact_method
                  }
                />
                <Meta label="Preferred language" value={patient.language} />
                <Meta label="Country" value={patient.country} />
              </div>
            </InfoCard>
            <InfoCard title="Coordination">
              <div className="grid gap-3 sm:grid-cols-2">
                <Meta label="Coordinator" value={coordinator?.name} />
                <Meta label="Dentist" value={dentist?.name} />
                <Meta label="Source" value={patient.source ?? lead?.source} />
                <Meta label="Status" value={status.replace(/_/g, " ")} />
                <Meta label="Destination" value={assessment?.travel.destination_country} />
                <Meta
                  label="Preferred city"
                  value={assessment?.travel.preferred_cities?.join(", ")}
                />
              </div>
            </InfoCard>
          </div>
          <InfoCard title="Current case">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Meta label="Latest Lead" value={lead?.treatment} />
              <Meta
                label="Preliminary Roadmap"
                value={
                  roadmap ? `Available · ${formatCrmDate(roadmap.created_at)}` : "Not available"
                }
              />
              <Meta
                label="Clinic Treatment Plan"
                value={activePlan ? `${activePlan.title} · ${activePlan.status}` : "Not created"}
              />
              <Meta
                label="Next appointment"
                value={
                  upcomingAppointments[0]
                    ? formatCrmDate(upcomingAppointments[0].starts_at)
                    : "Not scheduled"
                }
              />
            </div>
          </InfoCard>
          {warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertTitle>Needs attention</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5">
                  {warnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {nextFollowUp && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Next follow-up</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    completeFollowUp(nextFollowUp.id, patient.clinic_id, actor.id);
                    toast.success("Follow-up completed");
                  }}
                >
                  <Check className="size-4" />
                  Complete
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{nextFollowUp.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(nextFollowUp.due_at), "MMM d, yyyy HH:mm")} ·{" "}
                  {nextFollowUp.notes || "No notes"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="clinical">
          <Accordion
            type="multiple"
            defaultValue={["dental", "medical"]}
            className="rounded-xl border px-4"
          >
            <ClinicalSection value="dental" title="Dental Concerns">
              <DetailGrid
                rows={[
                  [
                    "Treatment interest",
                    assessment?.dental.treatment_interest ?? patient.treatment_interest,
                  ],
                  ["Concerns", assessment?.dental.concerns],
                  ["Affected areas", assessment?.dental.affected_areas],
                  ["Missing teeth", assessment?.dental.missing_teeth],
                  ["Pain / sensitivity", assessment?.dental.pain],
                  ["Previous treatment", assessment?.dental.previous_treatment],
                  ["Expected result", assessment?.dental.expected_result],
                ]}
              />
            </ClinicalSection>
            <ClinicalSection value="medical" title="Medical Safety">
              {assessment ? (
                <>
                  <Alert>
                    <AlertTitle>Patient-reported safety information</AlertTitle>
                    <AlertDescription>
                      Review clinically; these answers are not a confirmed diagnosis.
                    </AlertDescription>
                  </Alert>
                  <div className="mt-4">
                    <DetailGrid
                      rows={[
                        ["Conditions", assessment.medical.conditions.join(", ") || "None reported"],
                        ["Medications", assessment.medical.medications],
                        ["Allergies", assessment.medical.allergies],
                        ["Smoking", assessment.medical.smoking ? "Yes" : "No"],
                        ["Blood thinners", assessment.medical.blood_thinners ? "Yes" : "No"],
                        ["Complications", assessment.medical.complications],
                      ]}
                    />
                  </div>
                </>
              ) : (
                <EmptyState title="No medical information" />
              )}
            </ClinicalSection>
            <ClinicalSection value="assessment" title="Assessment Summary">
              {assessment ? (
                <DetailGrid
                  rows={[
                    ["Submitted", formatCrmDate(assessment.created_at)],
                    ["Destination", assessment.travel.destination_country],
                    ["Preferred cities", assessment.travel.preferred_cities.join(", ")],
                    ["Treatment interest", assessment.dental.treatment_interest],
                    [
                      "Uploaded metadata",
                      Object.values(assessment.uploads).filter(Boolean).length
                        ? `${Object.values(assessment.uploads).filter(Boolean).length} categories`
                        : "None",
                    ],
                  ]}
                />
              ) : (
                <EmptyState title="No Assessment linked" />
              )}
            </ClinicalSection>
            <ClinicalSection value="roadmap" title="Preliminary Roadmap">
              {roadmap ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Read-only preliminary information; not a clinic-confirmed Treatment Plan.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(roadmap.treatment_estimates ?? []).map((item) => (
                      <Badge key={item.treatment_key} variant="outline">
                        {item.label}
                        {item.estimated_quantity ? ` · approx. ${item.estimated_quantity}` : ""}
                      </Badge>
                    ))}
                  </div>
                  <DetailGrid
                    rows={[
                      ["Destination", assessment?.travel.destination_country],
                      [
                        "Estimated range",
                        roadmap.price_max
                          ? `${roadmap.price_min}–${roadmap.price_max} ${roadmap.currency}`
                          : undefined,
                      ],
                      ["Prepared", formatCrmDate(roadmap.created_at)],
                    ]}
                  />
                  <Button asChild variant="outline" size="sm">
                    <Link to="/roadmap/$id" params={{ id: roadmap.id }}>
                      Open Roadmap
                    </Link>
                  </Button>
                </div>
              ) : (
                <EmptyState title="No Roadmap linked" />
              )}
            </ClinicalSection>
          </Accordion>
        </TabsContent>
        <TabsContent value="files">
          <FilesTab files={patientFiles} assessment={assessment} />
        </TabsContent>
        <TabsContent value="plans">
          <div className="space-y-3">
            {patientPlans.length ? (
              patientPlans.map((plan) => {
                const totals = calculateTreatmentPlanTotals(plan);
                const assigned = users.find((item) => item.id === plan.dentist_id);
                return (
                  <Card key={plan.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                      <div>
                        <p className="font-medium">{plan.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.summary || "Treatment summary not provided"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {assigned?.name ?? "Dentist not assigned"} · Updated{" "}
                          {formatCrmDate(plan.updated_at)} ·{" "}
                          {totals.total > 0
                            ? formatQuoteMoney(totals.total, plan.currency ?? "EUR")
                            : "Not priced"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={plan.status ?? "draft"} />
                        <Badge variant="outline">
                          {plan.share_token ? "Patient View prepared" : "Not shared"}
                        </Badge>
                        {plan.share_token && ["sent", "viewed"].includes(plan.status ?? "") ? (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              to="/shared/treatment-plan/$token"
                              params={{ token: plan.share_token }}
                              search={{ preview: true }}
                            >
                              Open Patient View
                            </Link>
                          </Button>
                        ) : (
                          <Button asChild variant="outline" size="sm">
                            <Link to="/dentalplan" search={{ treatmentPlanId: plan.id }}>
                              {plan === activePlan ? "Continue Planning" : "Open Plan"}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <EmptyState
                title="No Treatment Plans"
                description="Create the clinic-confirmed patient document when ready."
                action={
                  <Button onClick={createOrOpenPlan}>
                    <Plus className="size-4" />
                    Create Treatment Plan
                  </Button>
                }
              />
            )}
          </div>
        </TabsContent>
        <TabsContent value="appointments">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button asChild>
                <Link to="/pro/appointments">Book Appointment</Link>
              </Button>
            </div>
            <AppointmentGroup
              title="Upcoming appointments"
              items={upcomingAppointments}
              users={users}
              empty="No upcoming appointments"
            />
            <AppointmentGroup
              title="Past appointments"
              items={pastAppointments}
              users={users}
              empty="No past appointments"
            />
          </div>
        </TabsContent>
        <TabsContent value="communication">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Communication history</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manual clinic records; no message is sent from this screen.
                </p>
              </div>
              <Button disabled={!lead} onClick={() => setContactOpen(true)}>
                Log contact
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {communications.length ? (
                communications.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline" className="capitalize">
                        {item.kind.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatCrmDate(item.occurred_at ?? item.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{item.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {users.find((user) => user.id === item.created_by)?.name ?? "System"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No communication recorded"
                  description="Calls, WhatsApp, email and internal notes will appear here."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTimeline activities={patientActivity} users={users} />
        </TabsContent>
      </Tabs>
      <PatientFormDialog open={editOpen} onOpenChange={setEditOpen} patient={patient} />
      {lead && (
        <>
          <LogContactDialog open={contactOpen} onOpenChange={setContactOpen} lead={lead} />
          <ScheduleFollowUpDialog
            open={followUpOpen}
            onOpenChange={setFollowUpOpen}
            lead={lead}
            patient={patient}
            users={clinicUsers}
          />
        </>
      )}
    </div>
  );
}

function FilesTab({
  files,
  assessment,
}: {
  files: ReturnType<typeof useMockStore.getState>["files"];
  assessment?: ReturnType<typeof useMockStore.getState>["assessments"][number];
}) {
  const metadata = assessment
    ? Object.entries(assessment.uploads)
        .filter(([, present]) => present)
        .map(([kind]) => ({ kind, label: kind.replace(/^uploaded_/, "").replace(/_/g, " ") }))
    : [];
  const groups = [
    {
      title: "X-rays",
      files: files.filter((item) => ["panoramic", "cbct"].includes(item.kind)),
      metadata: metadata.filter((item) =>
        ["panoramic", "cbct"].some((kind) => item.kind.includes(kind)),
      ),
    },
    {
      title: "Dental Photos",
      files: files.filter((item) => item.kind === "dental_photo"),
      metadata: metadata.filter((item) => item.kind.includes("photo")),
    },
    {
      title: "Treatment Documents",
      files: files.filter((item) => ["previous_plan", "previous_report"].includes(item.kind)),
      metadata: metadata.filter(
        (item) => item.kind.includes("plan") || item.kind.includes("report"),
      ),
    },
    {
      title: "Other Files",
      files: files.filter(
        (item) =>
          !["panoramic", "cbct", "dental_photo", "previous_plan", "previous_report"].includes(
            item.kind,
          ),
      ),
      metadata: [],
    },
  ];
  return (
    <div className="space-y-4">
      <Alert>
        <Lock className="size-4" />
        <AlertTitle>Clinic-only file metadata</AlertTitle>
        <AlertDescription>
          Current localStorage and data-URL handling is development-only and is not production-grade
          file security.
        </AlertDescription>
      </Alert>
      {groups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {group.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.kind.replace(/_/g, " ")} · {formatCrmDate(file.created_at)} · Clinic
                    record
                  </p>
                </div>
                <Badge variant="outline">{file.mime}</Badge>
              </div>
            ))}
            {group.metadata.map((item) => (
              <div key={item.kind} className="rounded-lg border p-3">
                <p className="text-sm font-medium capitalize">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  Assessment metadata · File content unavailable in this development environment
                </p>
              </div>
            ))}
            {!group.files.length && !group.metadata.length && (
              <EmptyState title={`No ${group.title.toLowerCase()} available`} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
function AppointmentGroup({
  title,
  items,
  users,
  empty,
}: {
  title: string;
  items: ReturnType<typeof useMockStore.getState>["appointments"];
  users: ReturnType<typeof useMockStore.getState>["users"];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.starts_at), "MMM d, yyyy HH:mm")} ·{" "}
                  {item.location || "Location not set"}
                </p>
              </div>
              <Badge variant="outline">
                {users.find((user) => user.id === item.created_by)?.name ?? "Clinic appointment"}
              </Badge>
            </div>
          ))
        ) : (
          <EmptyState title={empty} />
        )}
      </CardContent>
    </Card>
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
    return <EmptyState title="No patient activity" description="Clinic events will appear here." />;
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
        {Object.entries(groups).map(([date, records]) => (
          <section key={date}>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{date}</h3>
            <div className="space-y-2">
              {records.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium capitalize">{item.kind.replace(/_/g, " ")}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(item.occurred_at ?? item.created_at), "HH:mm")} ·{" "}
                    {users.find((user) => user.id === item.created_by)?.name ?? "System"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
function ClinicalSection({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger>{title}</AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
function DetailGrid({ rows }: { rows: Array<[string, string | undefined]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <Meta key={label} label={label} value={value} />
      ))}
    </div>
  );
}
function Meta({ label, value, link }: { label: string; value?: string; link?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {link && value ? (
        <a href={link} className="break-all text-sm font-medium text-primary hover:underline">
          {value}
        </a>
      ) : (
        <p className="break-words text-sm font-medium capitalize">{value || "Not available"}</p>
      )}
    </div>
  );
}
