import { isSameDay } from "date-fns";
import type { Lead, LeadFollowUp, LeadStatus, TreatmentPlan } from "@/types/models";

export const LEAD_PIPELINE_STAGES: Array<{
  key: LeadStatus;
  label: string;
  category: "active" | "terminal";
  terminal: boolean;
}> = [
  { key: "new_lead", label: "New Application", category: "active", terminal: false },
  { key: "contacted", label: "Contacted", category: "active", terminal: false },
  { key: "awaiting_images", label: "Awaiting Information", category: "active", terminal: false },
  { key: "doctor_review", label: "Clinical Review", category: "active", terminal: false },
  {
    key: "treatment_planning",
    label: "Ready for Treatment Plan",
    category: "active",
    terminal: false,
  },
  { key: "quote_sent", label: "Treatment Plan Sent", category: "active", terminal: false },
  { key: "follow_up", label: "Follow-up", category: "active", terminal: false },
  { key: "booked", label: "Converted", category: "terminal", terminal: true },
  { key: "lost", label: "Lost", category: "terminal", terminal: true },
];

const storedStage: Partial<Record<LeadStatus, LeadStatus>> = {
  assessment_submitted: "new_lead",
  awaiting_review: "doctor_review",
  negotiation: "follow_up",
  treatment_started: "booked",
  completed: "booked",
};

export function deriveLeadOperationalStage({
  lead,
  treatmentPlan,
}: {
  lead: Lead;
  treatmentPlan?: TreatmentPlan;
}): LeadStatus {
  if (lead.status === "lost" || ["booked", "treatment_started", "completed"].includes(lead.status))
    return lead.status === "lost" ? "lost" : "booked";
  if (treatmentPlan && ["sent", "viewed", "accepted"].includes(treatmentPlan.status ?? ""))
    return "quote_sent";
  return storedStage[lead.status] ?? lead.status;
}

export type FollowUpState = "overdue" | "due_today" | "upcoming" | "completed" | "cancelled";

export function getFollowUpState(followUp: LeadFollowUp, now = new Date()): FollowUpState {
  if (followUp.status === "completed") return "completed";
  if (followUp.status === "cancelled") return "cancelled";
  const due = new Date(followUp.due_at);
  if (isSameDay(due, now)) return "due_today";
  return due < now ? "overdue" : "upcoming";
}

export function getNextFollowUp(followUps: LeadFollowUp[], leadId: string) {
  return followUps
    .filter((item) => item.lead_id === leadId && item.status === "pending")
    .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at))[0];
}

export const FOLLOW_UP_REASONS = [
  "Initial contact",
  "Request dental photos",
  "Request X-ray",
  "Awaiting patient reply",
  "Treatment Plan follow-up",
  "Doctor review update",
  "Price discussion",
  "Appointment arrangement",
  "Travel confirmation",
  "Other",
] as const;
