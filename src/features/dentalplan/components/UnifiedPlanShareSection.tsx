import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui-bits";
import { mapTreatmentPlanToPatientDocument } from "@/lib/care-plan";
import { useMockStore } from "@/lib/mock/store";
import { formatQuoteMoney } from "@/lib/quote";
import { calculateTreatmentPlanTotals } from "@/lib/treatment-plan-commercial";
import { isTreatmentPlanPubliclyViewable } from "@/lib/treatment-plan-status";
import type { Clinic, ClinicBranding, Patient, TreatmentPlan } from "@/types/models";

export function UnifiedPlanShareSection({
  plan,
  clinic,
  branding,
  patient,
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const updateStatus = useMockStore((state) => state.updateTreatmentPlanStatus);
  const markSent = useMockStore((state) => state.markTreatmentPlanSent);
  const ensureToken = useMockStore((state) => state.ensureTreatmentPlanShareToken);
  const canApprove = ["dentist", "clinic_owner", "clinic_admin"].includes(role ?? "");
  const publicLinkReady = Boolean(plan.share_token && isTreatmentPlanPubliclyViewable(plan.status));
  const document = mapTreatmentPlanToPatientDocument(plan, clinic, patient, branding);
  const totals = calculateTreatmentPlanTotals(plan);
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
          <CardTitle>Share Treatment Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Current document status</p>
              <StatusBadge status={plan.status ?? "draft"} />
            </div>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
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
            {(plan.status ?? "draft") === "draft" && (
              <Button
                variant="outline"
                onClick={() => updateStatus(plan.id, plan.clinic_id, "doctor_review", actorId)}
              >
                Send for Doctor Review
              </Button>
            )}
            {(plan.status ?? "draft") === "doctor_review" && canApprove && (
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
            {(plan.status ?? "draft") === "approved" && (
              <Button
                onClick={() => {
                  markSent(plan.id, plan.clinic_id, actorId);
                  toast.success("Treatment Plan marked as sent");
                }}
              >
                Mark Sent
              </Button>
            )}
            <Button variant="outline" disabled={!publicLinkReady} onClick={copyLink}>
              Copy Share Link
            </Button>
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
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Patient View preview</DialogTitle>
            <DialogDescription>
              Clinic-only preview. Internal notes and private medical information are excluded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{document.title}</h3>
              <p className="text-muted-foreground">{document.summary}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Meta label="Patient" value={document.patient_name ?? "Patient"} />
              <Meta label="Planned visits" value={document.visit_information} />
              <Meta label="Healing" value={document.healing_information} />
              <Meta label="Total" value={formatQuoteMoney(totals.total, plan.currency ?? "EUR")} />
            </div>
            <Separator />
            <div>
              <p className="font-medium">Confirmed procedures</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {document.price.items?.map((item) => (
                  <li key={`${item.label}-${item.unit_price}`}>
                    {item.label} · {item.quantity} ×{" "}
                    {formatQuoteMoney(item.unit_price, plan.currency ?? "EUR")}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">Included services</p>
              <p className="text-sm text-muted-foreground">
                {document.quote.included_services.join(", ") || "None listed"}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
