import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui-bits";
import { useMockStore } from "@/lib/mock/store";
import { isTreatmentPlanPubliclyViewable } from "@/lib/treatment-plan-status";
import type { Clinic, ClinicBranding, Patient, TreatmentPlan } from "@/types/models";
import { createDentalPlan } from "../utils/createDentalPlan";
import { validatePlanForFinalize } from "../rules/clinicalRules";

export function UnifiedPlanShareSection({
  plan,
  actorId,
  role,
}: {
  plan: TreatmentPlan;
  clinic?: Clinic;
  branding?: ClinicBranding;
  patient?: Patient;
  actorId?: string;
  role?: string;
}) {
  const updateStatus = useMockStore((state) => state.updateTreatmentPlanStatus);
  const updatePlan = useMockStore((state) => state.updateTreatmentPlan);
  const markSent = useMockStore((state) => state.markTreatmentPlanSent);
  const ensureToken = useMockStore((state) => state.ensureTreatmentPlanShareToken);
  const status = plan.status ?? "draft";
  const canApprove = ["dentist", "clinic_owner", "clinic_admin"].includes(role ?? "");
  const canSubmitReview = ["coordinator", "clinic_owner", "clinic_admin"].includes(role ?? "");
  const canShare = ["coordinator", "clinic_owner", "clinic_admin"].includes(role ?? "");
  const [reviewNote, setReviewNote] = useState("");
  const blockingErrors =
    plan.dental_plan_data && typeof plan.dental_plan_data === "object"
      ? validatePlanForFinalize(createDentalPlan(plan.dental_plan_data))
      : [];
  const sharingBlocked = blockingErrors.length > 0;
  const publicLinkReady = Boolean(plan.share_token && isTreatmentPlanPubliclyViewable(plan.status));
  const preview = () => {
    const token =
      plan.share_token ?? (canShare ? ensureToken(plan.id, plan.clinic_id, actorId) : undefined);
    if (!token) return;
    window.open(`/shared/treatment-plan/${token}?preview=true`, "_blank", "noopener,noreferrer");
  };
  const copyLink = async () => {
    if (!publicLinkReady || !plan.share_token) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/shared/treatment-plan/${plan.share_token}`,
      );
      toast.success("Share link copied");
    } catch {
      toast.error("Could not copy the patient link");
    }
  };
  const approve = () => {
    updateStatus(plan.id, plan.clinic_id, "approved", actorId);
    ensureToken(plan.id, plan.clinic_id, actorId);
    toast.success("Treatment Plan approved");
  };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 sm:items-center">
          <div>
            <CardTitle>Share & delivery</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview first, then complete the clinical approval and patient delivery workflow.
            </p>
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={!plan.share_token && !canShare}
            onClick={preview}
          >
            Preview Patient View
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <section aria-labelledby="share-actions-heading" className="space-y-3">
            <h3 id="share-actions-heading" className="text-sm font-semibold">
              Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!publicLinkReady || !canShare || sharingBlocked}
                onClick={() => void copyLink()}
              >
                Copy Patient Link
              </Button>
              {status === "draft" && canSubmitReview && (
                <Button
                  variant="outline"
                  disabled={sharingBlocked}
                  onClick={() => updateStatus(plan.id, plan.clinic_id, "doctor_review", actorId)}
                >
                  Send for Doctor Review
                </Button>
              )}
              {status === "doctor_review" && canApprove && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={sharingBlocked}>
                        Approve Treatment Plan
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Approve this Treatment Plan?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Approval makes the document eligible to be shared, but does not send it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={approve}>Approve</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">Request Changes</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Return this plan for changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Add a clinic-only review note for the coordinator. The plan returns to
                          Draft.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Textarea
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        placeholder="Describe the requested clinical changes"
                        aria-label="Clinic-only doctor review note"
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setReviewNote("")}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          disabled={!reviewNote.trim()}
                          onClick={() => {
                            updatePlan(
                              plan.id,
                              {
                                internal_clinical_notes: [
                                  plan.internal_clinical_notes,
                                  `Doctor Review: ${reviewNote.trim()}`,
                                ]
                                  .filter(Boolean)
                                  .join("\n\n"),
                              },
                              actorId,
                            );
                            updateStatus(plan.id, plan.clinic_id, "draft", actorId);
                            setReviewNote("");
                            toast.success("Changes requested; plan returned to Draft");
                          }}
                        >
                          Request Changes
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              {status === "approved" && canShare && (
                <Button
                  variant="outline"
                  onClick={() => {
                    markSent(plan.id, plan.clinic_id, actorId);
                    toast.success("Treatment Plan marked as sent");
                  }}
                >
                  Mark Sent
                </Button>
              )}
              {canShare && ["approved", "sent", "viewed"].includes(status) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive hover:text-destructive">
                      Revoke public access
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke public access?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The patient link will become unavailable. The token remains stable for a
                        future reapproval.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          updateStatus(plan.id, plan.clinic_id, "draft", actorId);
                          toast.success("Public access revoked");
                        }}
                      >
                        Revoke access
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            {!publicLinkReady && (
              <p className="text-xs text-muted-foreground">
                Copy Link becomes available after clinical approval. Private preview does not
                publish or change the plan status.
              </p>
            )}
            {sharingBlocked && (
              <p className="text-xs font-medium text-destructive">
                Resolve {blockingErrors.length} blocking clinical{" "}
                {blockingErrors.length === 1 ? "error" : "errors"} before sharing.
              </p>
            )}
          </section>
          <Separator />
          <section aria-labelledby="share-status-heading" className="space-y-2">
            <h3 id="share-status-heading" className="text-sm font-semibold">
              Status
            </h3>
            <StatusBadge status={status} />
            <p className="max-w-xl text-sm text-muted-foreground">
              {shareGuidance(status, canApprove)}
            </p>
          </section>
          <Separator />
          <section aria-labelledby="share-timeline-heading" className="space-y-3">
            <h3 id="share-timeline-heading" className="text-sm font-semibold">
              Timeline
            </h3>
            <dl className="grid gap-3 rounded-lg bg-muted/30 p-3 text-sm sm:grid-cols-2">
              <Meta label="Validity" value={plan.valid_until ?? "Not set"} />
              <Meta label="Last shared" value={formatDate(plan.shared_at)} />
              <Meta label="Viewed" value={formatDate(plan.viewed_at)} />
              <Meta
                label="Accepted / declined"
                value={formatDate(plan.accepted_at ?? plan.declined_at)}
              />
            </dl>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "Not available"}</dd>
    </div>
  );
}
function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

function shareGuidance(status: string, canApprove: boolean) {
  if (status === "draft") return "Preview the patient document, then send it for clinical review.";
  if (status === "doctor_review")
    return canApprove
      ? "Review the complete plan and approve it when clinically ready."
      : "Waiting for a dentist or clinic administrator to approve the plan.";
  if (status === "approved")
    return "The patient link is ready. Copy it, then mark the plan as sent.";
  if (["sent", "viewed"].includes(status))
    return "The patient link is active. Status timestamps update as the patient engages.";
  if (status === "accepted") return "The patient has accepted this Treatment Plan.";
  return "Public access is unavailable. Private preview remains available.";
}
