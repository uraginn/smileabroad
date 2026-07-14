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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui-bits";
import { useMockStore } from "@/lib/mock/store";
import { isTreatmentPlanPubliclyViewable } from "@/lib/treatment-plan-status";
import type { Clinic, ClinicBranding, Patient, TreatmentPlan } from "@/types/models";

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
  const markSent = useMockStore((state) => state.markTreatmentPlanSent);
  const ensureToken = useMockStore((state) => state.ensureTreatmentPlanShareToken);
  const status = plan.status ?? "draft";
  const canApprove = ["dentist", "clinic_owner", "clinic_admin"].includes(role ?? "");
  const publicLinkReady = Boolean(plan.share_token && isTreatmentPlanPubliclyViewable(plan.status));
  const preview = () => {
    const token = ensureToken(plan.id, plan.clinic_id);
    if (!token) return;
    window.open(`/shared/treatment-plan/${token}?preview=true`, "_blank", "noopener,noreferrer");
  };
  const copyLink = () => {
    if (!publicLinkReady || !plan.share_token) return;
    void navigator.clipboard.writeText(
      `${window.location.origin}/shared/treatment-plan/${plan.share_token}`,
    );
    toast.success("Share link copied");
  };
  const approve = () => {
    updateStatus(plan.id, plan.clinic_id, "approved", actorId);
    ensureToken(plan.id, plan.clinic_id);
    toast.success("Treatment Plan approved");
  };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Share & delivery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Current status</p>
              <StatusBadge status={status} />
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {shareGuidance(status, canApprove)}
              </p>
            </div>
            <Button variant={status === "draft" ? "default" : "outline"} onClick={preview}>
              Preview Patient View
            </Button>
          </div>
          <Alert>
            <AlertTitle>Private preview is always safe</AlertTitle>
            <AlertDescription>
              Previewing does not approve the plan, publish a link or mark it as viewed.
            </AlertDescription>
          </Alert>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {status === "draft" && (
              <Button
                variant="outline"
                onClick={() => updateStatus(plan.id, plan.clinic_id, "doctor_review", actorId)}
              >
                Send for Doctor Review
              </Button>
            )}
            {status === "doctor_review" && canApprove && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>Approve Treatment Plan</Button>
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
            )}
            {status === "approved" && (
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
            <Button
              variant={publicLinkReady ? "default" : "outline"}
              disabled={!publicLinkReady}
              onClick={copyLink}
            >
              Copy Patient Link
            </Button>
            {["approved", "sent", "viewed"].includes(status) && (
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
              The public link becomes available after clinical approval.
            </p>
          )}
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Meta label="Validity" value={plan.valid_until ?? "Not set"} />
            <Meta label="Last shared" value={formatDate(plan.shared_at)} />
            <Meta label="Viewed" value={formatDate(plan.viewed_at)} />
            <Meta
              label="Accepted / declined"
              value={formatDate(plan.accepted_at ?? plan.declined_at)}
            />
          </dl>
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
