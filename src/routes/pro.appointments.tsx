import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addMinutes, format, isSameDay } from "date-fns";
import { CalendarPlus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/mock-auth";
import { useMockStore } from "@/lib/mock/store";
import type { Appointment, AppointmentType, Patient, TreatmentPlan, User } from "@/types/models";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/pro/appointments")({ component: Appointments });
const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  ["online_meeting", "Online meeting"],
  ["phone_call", "Phone call"],
  ["video_assessment", "Video assessment"],
  ["clinic_consultation", "Clinic consultation"],
  ["doctor_review_meeting", "Doctor review meeting"],
  ["clinical_examination", "Clinical examination"],
  ["implant_surgery", "Implant surgery"],
  ["tooth_preparation", "Tooth preparation"],
  ["final_restorations", "Final restorations"],
  ["follow_up", "Follow-up"],
  ["other_treatment", "Other treatment"],
].map(([value, label]) => ({ value: value as AppointmentType, label }));

function Appointments() {
  const actor = useAuth((s) => s.user);
  const clinicId = actor?.clinic_id ?? "";
  const appointments = useMockStore((s) => s.appointments);
  const patients = useMockStore((s) => s.patients);
  const plans = useMockStore((s) => s.treatmentPlans);
  const users = useMockStore((s) => s.users);
  const addAppointment = useMockStore((s) => s.addAppointment);
  const updateAppointment = useMockStore((s) => s.updateAppointment);
  const [view, setView] = useState("list");
  const [open, setOpen] = useState(false);
  const clinicAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.clinic_id === clinicId)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [appointments, clinicId],
  );
  const clinicPatients = useMemo(
    () => patients.filter((p) => p.clinic_id === clinicId),
    [patients, clinicId],
  );
  const clinicPlans = useMemo(
    () => plans.filter((p) => p.clinic_id === clinicId),
    [plans, clinicId],
  );
  const clinicUsers = useMemo(
    () => users.filter((u) => u.clinic_id === clinicId),
    [users, clinicId],
  );
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Appointments"
        description="Schedule pre-treatment and clinical appointments with the responsible team."
        actions={
          <Button onClick={() => setOpen(true)}>
            <CalendarPlus />
            Book appointment
          </Button>
        }
      />
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
      </Tabs>
      {!clinicAppointments.length ? (
        <EmptyState
          title="No appointments scheduled"
          description="Book the first patient appointment to add it to the clinic schedule."
          action={<Button onClick={() => setOpen(true)}>Book appointment</Button>}
        />
      ) : view === "calendar" ? (
        <MonthView records={clinicAppointments} />
      ) : (
        <div className="space-y-5">
          {["Today", "Upcoming", "Past"].map((group) => {
            const now = new Date();
            const items = clinicAppointments.filter((a) => {
              const d = new Date(a.starts_at);
              return group === "Today"
                ? isSameDay(d, now)
                : group === "Upcoming"
                  ? d > now && !isSameDay(d, now)
                  : d < now && !isSameDay(d, now);
            });
            if (!items.length) return null;
            return (
              <section key={group}>
                <h2 className="mb-2 font-semibold">{group}</h2>
                <div className="space-y-2">
                  {items.map((a) => {
                    const patient = clinicPatients.find(
                      (p) =>
                        p.id === (a.patient_id ?? a.patient_user_id) ||
                        p.user_id === a.patient_user_id,
                    );
                    const dentist = clinicUsers.find((u) => u.id === a.dentist_id);
                    const plan = clinicPlans.find((p) => p.id === a.treatment_plan_id);
                    return (
                      <Card key={a.id}>
                        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{a.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(a.starts_at), "dd MMM yyyy · HH:mm")} ·{" "}
                              {a.duration_min} min
                            </p>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span>
                                {
                                  APPOINTMENT_TYPES.find(
                                    (x) => x.value === (a.type ?? "clinic_consultation"),
                                  )?.label
                                }
                              </span>
                              <span>{dentist?.name ?? "Dentist unassigned"}</span>
                              {a.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="size-3" />
                                  {a.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">{a.appointment_status ?? "scheduled"}</Badge>
                          {patient && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link to="/pro/patients/$id" params={{ id: patient.id }}>
                                {patient.first_name} {patient.last_name}
                              </Link>
                            </Button>
                          )}
                          {plan && (
                            <Button variant="outline" size="sm" asChild>
                              <Link to="/pro/treatment-plans/$id" params={{ id: plan.id }}>
                                Treatment Plan
                              </Link>
                            </Button>
                          )}
                          <Select
                            value={a.appointment_status ?? "scheduled"}
                            onValueChange={(status) => {
                              updateAppointment(
                                a.id,
                                clinicId,
                                { appointment_status: status as Appointment["appointment_status"] },
                                actor?.id,
                              );
                              toast.success("Appointment updated");
                            }}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["scheduled", "confirmed", "completed", "cancelled", "no_show"].map(
                                (s) => (
                                  <SelectItem key={s} value={s}>
                                    {s.replace("_", " ")}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <AppointmentDialog
        open={open}
        onOpenChange={setOpen}
        clinicId={clinicId}
        patients={clinicPatients}
        plans={clinicPlans}
        users={clinicUsers}
        appointments={clinicAppointments}
        onSave={(record) => {
          addAppointment(record, actor?.id);
          toast.success("Appointment booked");
          setOpen(false);
        }}
      />
    </div>
  );
}
function MonthView({ records }: { records: { id: string; title: string; starts_at: string }[] }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const month = new Date();
  return (
    <Card>
      <CardContent className="grid grid-cols-7 gap-px overflow-hidden p-0 text-xs">
        {days.map((day) => {
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const items = records.filter((a) => isSameDay(new Date(a.starts_at), date));
          return (
            <div key={day} className="min-h-20 border-b border-r p-2">
              <span className="font-medium">{day}</span>
              {items.slice(0, 2).map((a) => (
                <p
                  key={a.id}
                  className="mt-1 truncate rounded bg-primary/10 px-1 py-0.5 text-primary"
                >
                  {format(new Date(a.starts_at), "HH:mm")} {a.title}
                </p>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
function AppointmentDialog({
  open,
  onOpenChange,
  clinicId,
  patients,
  plans,
  users,
  appointments,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clinicId: string;
  patients: Patient[];
  plans: TreatmentPlan[];
  users: User[];
  appointments: Appointment[];
  onSave: (r: Omit<Appointment, "id" | "created_at" | "updated_at" | "created_by">) => void;
}) {
  const [patientId, setPatientId] = useState("none");
  const [type, setType] = useState<AppointmentType>("clinic_consultation");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState("45");
  const [dentist, setDentist] = useState("none");
  const [coordinator, setCoordinator] = useState("none");
  const [locationType, setLocationType] =
    useState<NonNullable<Appointment["location_type"]>>("clinic");
  const [location, setLocation] = useState("");
  const [planId, setPlanId] = useState("none");
  const [notes, setNotes] = useState("");
  const startDate = start ? new Date(start) : undefined;
  const end = startDate ? addMinutes(startDate, Number(duration)) : undefined;
  const conflict =
    startDate && end && dentist !== "none"
      ? appointments.find(
          (a) =>
            a.dentist_id === dentist &&
            !["cancelled", "completed"].includes(a.appointment_status ?? "scheduled") &&
            startDate < new Date(a.end_at ?? addMinutes(new Date(a.starts_at), a.duration_min)) &&
            end > new Date(a.starts_at),
        )
      : undefined;
  const submit = () => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient || !startDate || !end || end <= startDate)
      return toast.error("Choose a patient and valid appointment time");
    const linked = plans.find((p) => p.id === planId);
    if (
      linked &&
      linked.clinic_patient_id !== patient.id &&
      linked.patient_user_id !== patient.user_id &&
      linked.patient_user_id !== patient.id
    )
      return toast.error("Treatment Plan belongs to another patient");
    const label = APPOINTMENT_TYPES.find((x) => x.value === type)?.label ?? "Appointment";
    onSave({
      clinic_id: clinicId,
      patient_id: patient.id,
      patient_user_id: patient.user_id ?? patient.id,
      lead_id: undefined,
      treatment_plan_id: planId === "none" ? undefined : planId,
      dentist_id: dentist === "none" ? undefined : dentist,
      coordinator_id: coordinator === "none" ? undefined : coordinator,
      type,
      title: `${label} — ${patient.first_name} ${patient.last_name}`,
      starts_at: startDate.toISOString(),
      start_at: startDate.toISOString(),
      end_at: end.toISOString(),
      duration_min: Number(duration),
      location_type: locationType,
      location,
      notes,
      appointment_status: "scheduled",
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book appointment</DialogTitle>
          <DialogDescription>
            Create a clinic appointment. No external reminder is sent.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Patient">
            <Pick
              value={patientId}
              set={setPatientId}
              options={patients.map((p) => ({
                value: p.id,
                label: `${p.first_name} ${p.last_name}`,
              }))}
            />
          </Field>
          <Field label="Appointment type">
            <Pick
              value={type}
              set={(v) => setType(v as AppointmentType)}
              options={APPOINTMENT_TYPES}
            />
          </Field>
          <Field label="Start">
            <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Duration (minutes)">
            <Input
              type="number"
              min="15"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </Field>
          <Field label="Dentist">
            <Pick
              value={dentist}
              set={setDentist}
              options={users
                .filter((u) => u.role === "dentist")
                .map((u) => ({ value: u.id, label: u.name }))}
            />
          </Field>
          <Field label="Coordinator">
            <Pick
              value={coordinator}
              set={setCoordinator}
              options={users
                .filter((u) => u.role === "coordinator")
                .map((u) => ({ value: u.id, label: u.name }))}
            />
          </Field>
          <Field label="Location type">
            <Pick
              value={locationType}
              set={(value) => setLocationType(value as NonNullable<Appointment["location_type"]>)}
              options={["clinic", "online", "phone", "other"].map((x) => ({ value: x, label: x }))}
            />
          </Field>
          <Field label="Location">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <Field label="Treatment Plan">
            <Pick
              value={planId}
              set={setPlanId}
              options={plans
                .filter(
                  (p) =>
                    !patientId ||
                    patientId === "none" ||
                    p.clinic_patient_id === patientId ||
                    p.patient_user_id === patientId,
                )
                .map((p) => ({ value: p.id, label: p.title }))}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </div>
        {conflict && (
          <Alert>
            <AlertTitle>Dentist schedule conflict</AlertTitle>
            <AlertDescription>
              This overlaps with {conflict.title} at{" "}
              {format(new Date(conflict.starts_at), "dd MMM HH:mm")}. You can correct the time
              before saving.
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Book appointment</Button>
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
