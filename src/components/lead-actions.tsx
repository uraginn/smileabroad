import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/mock-auth";
import { FOLLOW_UP_REASONS } from "@/lib/lead-workflow";
import { useMockStore } from "@/lib/mock/store";
import type { Lead, Patient, User } from "@/types/models";

export function ScheduleFollowUpDialog({
  open,
  onOpenChange,
  lead,
  patient,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  patient?: Patient;
  users: User[];
}) {
  const actor = useAuth((state) => state.user);
  const schedule = useMockStore((state) => state.scheduleFollowUp);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [assigned, setAssigned] = useState(lead.assigned_to ?? actor?.id ?? "");
  const [reason, setReason] = useState<(typeof FOLLOW_UP_REASONS)[number]>("Initial contact");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = () => {
    const due = new Date(`${date}T${time}`);
    if (!date || Number.isNaN(due.getTime()) || due <= new Date()) {
      toast.error("Choose a valid future follow-up date and time");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      schedule(
        {
          clinic_id: lead.clinic_id,
          lead_id: lead.id,
          patient_id: patient?.id,
          assigned_user_id: assigned || undefined,
          due_at: due.toISOString(),
          reason,
          notes: notes.trim() || undefined,
        },
        actor?.id,
      );
      toast.success("Follow-up scheduled");
      onOpenChange(false);
      setDate("");
      setNotes("");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule follow-up</DialogTitle>
          <DialogDescription>
            Create one clinic follow-up without sending a message.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </Field>
          <Field label="Assigned user">
            <Select value={assigned} onValueChange={setAssigned}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reason">
            <Select value={reason} onValueChange={(value) => setReason(value as typeof reason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={submitting} onClick={submit}>
            {submitting ? "Scheduling…" : "Schedule follow-up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CONTACT_TYPES = ["call", "whatsapp", "email", "note"] as const;
const OUTCOMES = [
  "Reached patient",
  "No answer",
  "Patient replied",
  "Information requested",
  "Information received",
  "Interested",
  "Not interested",
  "Follow-up required",
  "Other",
];

export function LogContactDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}) {
  const actor = useAuth((state) => state.user);
  const addActivity = useMockStore((state) => state.addLeadActivity);
  const [type, setType] = useState<(typeof CONTACT_TYPES)[number]>("call");
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [notes, setNotes] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const submit = () => {
    if (submitting || !notes.trim()) return;
    const occurred = new Date(occurredAt);
    if (Number.isNaN(occurred.getTime())) return toast.error("Choose a valid contact time");
    setSubmitting(true);
    addActivity({
      clinic_id: lead.clinic_id,
      lead_id: lead.id,
      kind: type === "note" ? "note" : type,
      body: `${outcome}: ${notes.trim()}`,
      internal: true,
      occurred_at: occurred.toISOString(),
      created_by: actor?.id ?? "system",
    });
    toast.success("Contact activity recorded");
    setSubmitting(false);
    setNotes("");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log contact</DialogTitle>
          <DialogDescription>
            This records an interaction; it does not call or message the patient.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Contact type">
            <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === "note" ? "Internal note" : item[0].toUpperCase() + item.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Outcome">
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Occurred at">
            <Input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={submitting || !notes.trim()} onClick={submit}>
            Save activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
