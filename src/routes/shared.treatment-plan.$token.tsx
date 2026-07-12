import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { DentalDiagram } from "@/components/dental-diagram";
import { TREATMENT_OPTIONS } from "@/lib/dental";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatQuoteMoney } from "@/lib/quote";
import { mapTreatmentPlanToPatientDocument } from "@/lib/care-plan";
import { isTreatmentPlanPubliclyViewable } from "@/lib/treatment-plan-status";
import { useAuth, useAuthHydrated } from "@/lib/auth/mock-auth";
import {
  PlanDisclaimer,
  PlanDocumentHeader,
  PlanDocumentShell,
  PlanSection,
  PlanSummaryGrid,
} from "@/components/care-plan/document";
import { CheckCircle2, ExternalLink, Mail, Phone, Printer, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/shared/treatment-plan/$token")({
  validateSearch: (search: Record<string, unknown>) => ({
    preview: search.preview === true || search.preview === "true" || search.preview === "1",
  }),
  component: SharedPlan,
});

function SharedPlan() {
  const { token } = Route.useParams();
  const { preview } = Route.useSearch();
  const activeUser = useAuth((state) => state.user);
  const authHydrated = useAuthHydrated();
  const hydrated = useMockStoreHydrated();
  const tokenPlan = useMockStore((s) =>
    s.treatmentPlans.find((plan) => plan.share_token === token),
  );
  const canClinicPreview =
    Boolean(preview) &&
    Boolean(tokenPlan) &&
    Boolean(activeUser) &&
    (activeUser?.role === "platform_admin" || activeUser?.clinic_id === tokenPlan?.clinic_id);
  const plan =
    tokenPlan && (isTreatmentPlanPubliclyViewable(tokenPlan.status) || canClinicPreview)
      ? tokenPlan
      : undefined;
  const clinic = useMockStore((s) =>
    plan ? s.clinics.find((item) => item.id === plan.clinic_id) : undefined,
  );
  const branding = useMockStore((s) =>
    plan ? s.branding.find((item) => item.clinic_id === plan.clinic_id) : undefined,
  );
  const patient = useMockStore((s) =>
    plan
      ? s.patients.find(
          (item) =>
            item.clinic_id === plan.clinic_id &&
            (item.id === plan.clinic_patient_id || item.user_id === plan.patient_user_id),
        )
      : undefined,
  );
  const dentist = useMockStore((s) =>
    plan?.dentist_id
      ? s.users.find((user) => user.id === plan.dentist_id && user.clinic_id === plan.clinic_id)
      : undefined,
  );
  const markPlanViewed = useMockStore((s) => s.markTreatmentPlanViewed);
  const markPlanAccepted = useMockStore((s) => s.markTreatmentPlanAccepted);

  useEffect(() => {
    if (!preview && plan?.status === "sent") markPlanViewed(plan.id, plan.clinic_id);
  }, [markPlanViewed, plan?.clinic_id, plan?.id, plan?.status, preview]);

  if (!hydrated || (preview && !authHydrated)) return null;
  if (!plan || !clinic) return <SafeNotFound />;

  const primary = branding?.primary_color || "#0f766e";
  const secondary = branding?.secondary_color || "#f97316";
  const carePlan = mapTreatmentPlanToPatientDocument(plan, clinic, patient, branding);
  const patientName = carePlan.patient_name || "Patient";
  const diagramItems = carePlan.plan.procedures.map((item) => ({ ...item, unit_price: 0 }));
  const contactHref = branding?.phone
    ? `tel:${branding.phone.replace(/\s/g, "")}`
    : branding?.email
      ? `mailto:${branding.email}`
      : branding?.website;

  return (
    <PlanDocumentShell
      variant="clinic"
      style={
        { "--clinic-primary": primary, "--clinic-secondary": secondary } as React.CSSProperties
      }
    >
      <style>{`@media print { .shared-plan .no-print { display:none!important } .shared-plan { background:white!important } .shared-plan .print-card { break-inside:avoid; box-shadow:none!important } }`}</style>
      <PlanDocumentHeader
        variant="clinic"
        eyebrow="Treatment Plan & Cost Estimate"
        title={clinic.name}
        description={`${clinic.city}, ${clinic.country}`}
        brand={
          <img
            src={branding?.logo_url || clinic.cover_image}
            alt={`${clinic.name} logo`}
            className="size-14 rounded-xl object-cover bg-white/90"
          />
        }
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="size-4 mr-1" /> Print Plan
            </Button>
            {branding?.website && (
              <Button asChild variant="secondary">
                <a href={branding.website} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4 mr-1" /> Website
                </a>
              </Button>
            )}
          </div>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <Card className="print-card overflow-hidden">
          <div className="h-1.5" style={{ background: primary }} />
          <CardContent className="p-5 sm:p-7">
            <div className="flex flex-wrap justify-between gap-5">
              <div>
                <p className="text-sm text-muted-foreground">Prepared for</p>
                <h2 className="text-2xl sm:text-3xl font-semibold mt-1">{patientName}</h2>
                <h3 className="text-lg mt-3">{carePlan.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{carePlan.summary}</p>
              </div>
              <div className="text-left sm:text-right">
                <Badge className="capitalize" style={{ background: primary }}>
                  {plan.status}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">Treatment Plan</p>
                <p className="text-xs text-muted-foreground">
                  Prepared {new Date(plan.prepared_at ?? plan.created_at).toLocaleDateString()}
                </p>
                {carePlan.price.valid_until && (
                  <p className="text-xs text-muted-foreground">
                    Valid until {new Date(carePlan.price.valid_until).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6">
              <PlanSummaryGrid
                items={[
                  { label: "Visits", value: carePlan.visit_information ?? "Not specified" },
                  {
                    label: "Healing period",
                    value: carePlan.healing_information ?? "Not specified",
                  },
                  { label: "Dentist", value: dentist?.name ?? "Clinic dental team" },
                  { label: "Currency", value: carePlan.price.currency },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        <PlanSection
          title="Patient and plan summary"
          description={carePlan.plan.patient_facing_notes}
        >
          <div className="grid gap-5 md:grid-cols-2">
            {carePlan.plan.clinical_findings.length > 0 && (
              <DetailList title="Clinical findings" items={carePlan.plan.clinical_findings} />
            )}
            {carePlan.plan.treatment_objectives.length > 0 && (
              <DetailList title="Treatment objectives" items={carePlan.plan.treatment_objectives} />
            )}
          </div>
        </PlanSection>

        <Card className="print-card">
          <CardContent className="p-5 sm:p-7">
            <h3 className="text-lg font-semibold mb-5">Your treatment plan</h3>
            <div className="pointer-events-none" aria-label="Read-only dental diagram">
              <DentalDiagram items={diagramItems} />
            </div>
            <div className="mt-5 pt-4 border-t flex flex-wrap gap-3">
              {TREATMENT_OPTIONS.map((option) => (
                <span key={option.value} className="inline-flex items-center gap-1.5 text-xs">
                  <span className="size-3 rounded" style={{ background: option.color }} />
                  {option.label}
                </span>
              ))}
            </div>
            {carePlan.plan.procedures.length > 0 && (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {carePlan.plan.procedures.map((procedure) => (
                  <div key={procedure.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">
                      Tooth {procedure.tooth} Â· {procedure.treatment.replace(/_/g, " ")}
                    </p>
                    {procedure.material && (
                      <p className="mt-1 text-muted-foreground">{procedure.material}</p>
                    )}
                    {procedure.patient_facing_note && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {procedure.patient_facing_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {carePlan.plan.treatment_stages.length > 0 && (
          <PlanSection
            title="Treatment stages"
            description="Your planned visits and treatment sequence."
          >
            <div className="relative space-y-4 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-px before:bg-border">
              {carePlan.plan.treatment_stages.map((stage) => (
                <div key={stage.stage_number} className="relative pl-10">
                  <span
                    className="absolute left-0 top-0 grid size-8 place-items-center rounded-full text-xs font-semibold text-white"
                    style={{ background: primary }}
                  >
                    {stage.stage_number}
                  </span>
                  <div className="rounded-lg border bg-white p-4">
                    <h3 className="font-semibold">{stage.title}</h3>
                    {stage.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{stage.description}</p>
                    )}
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      {stage.procedures.length > 0 && (
                        <DetailList title="Procedures" items={stage.procedures} />
                      )}
                      {stage.duration_or_stay && (
                        <StageFact label="Expected stay" value={stage.duration_or_stay} />
                      )}
                      {stage.healing_period_after && (
                        <StageFact label="Healing after stage" value={stage.healing_period_after} />
                      )}
                      {stage.patient_instructions && (
                        <StageFact label="Instructions" value={stage.patient_instructions} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PlanSection>
        )}

        {(carePlan.plan.materials.length > 0 ||
          carePlan.plan.implant_systems.length > 0 ||
          carePlan.plan.temporary_solution) && (
          <PlanSection title="Materials and clinical details">
            <div className="grid gap-5 md:grid-cols-3">
              {carePlan.plan.materials.length > 0 && (
                <DetailList title="Materials" items={carePlan.plan.materials} />
              )}
              {carePlan.plan.implant_systems.length > 0 && (
                <DetailList title="Implant systems" items={carePlan.plan.implant_systems} />
              )}
              {carePlan.plan.temporary_solution && (
                <StageFact label="Temporary solution" value={carePlan.plan.temporary_solution} />
              )}
            </div>
          </PlanSection>
        )}

        {(carePlan.plan.alternatives.length > 0 ||
          carePlan.plan.risks.length > 0 ||
          carePlan.plan.exclusions.length > 0) && (
          <PlanSection title="Alternatives, risks and exclusions">
            <div className="grid gap-5 md:grid-cols-3">
              {carePlan.plan.alternatives.length > 0 && (
                <DetailList title="Alternatives" items={carePlan.plan.alternatives} />
              )}
              {carePlan.plan.risks.length > 0 && (
                <DetailList title="Clinical considerations" items={carePlan.plan.risks} />
              )}
              {carePlan.plan.exclusions.length > 0 && (
                <DetailList title="Exclusions" items={carePlan.plan.exclusions} />
              )}
            </div>
          </PlanSection>
        )}

        {(carePlan.services.included_services.length > 0 ||
          carePlan.services.excluded_services.length > 0 ||
          carePlan.services.patient_message) && (
          <PlanSection title="Included services">
            <div className="grid gap-5 md:grid-cols-2">
              {carePlan.services.included_services.length > 0 && (
                <DetailList title="Included" items={carePlan.services.included_services} />
              )}
              {carePlan.services.excluded_services.length > 0 && (
                <DetailList title="Not included" items={carePlan.services.excluded_services} />
              )}
            </div>
            {carePlan.services.patient_message && (
              <p className="mt-4 rounded-lg bg-slate-100 p-4 text-sm">
                {carePlan.services.patient_message}
              </p>
            )}
          </PlanSection>
        )}

        <Card className="print-card">
          <CardContent className="p-5 sm:p-7 space-y-5">
            <h3 className="text-lg font-semibold">Treatment and included services</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Treatment</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carePlan.price.items?.map((item) => (
                    <TableRow key={item.label}>
                      <TableCell>{item.label}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatQuoteMoney(item.unit_price, plan.currency ?? "EUR")}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatQuoteMoney(item.total, plan.currency ?? "EUR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="sm:ml-auto sm:max-w-sm space-y-1 text-sm">
              <PriceRow
                label="Subtotal"
                value={formatQuoteMoney(carePlan.price.subtotal ?? 0, plan.currency ?? "EUR")}
              />
              <PriceRow
                label="Hotel"
                value={formatQuoteMoney(carePlan.price.hotel_total ?? 0, plan.currency ?? "EUR")}
              />
              <PriceRow
                label="Transfers"
                value={formatQuoteMoney(carePlan.price.transfer_total ?? 0, plan.currency ?? "EUR")}
              />
              {(carePlan.price.discount ?? 0) > 0 && (
                <PriceRow
                  label="Discount"
                  value={`- ${formatQuoteMoney(carePlan.price.discount ?? 0, plan.currency ?? "EUR")}`}
                />
              )}
              <div className="border-t mt-2 pt-2 text-lg font-semibold">
                <PriceRow
                  label="Total"
                  value={formatQuoteMoney(carePlan.price.total ?? 0, plan.currency ?? "EUR")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {(carePlan.price.payment_schedule?.length ?? 0) > 0 && (
          <Card className="print-card">
            <CardContent className="p-5 sm:p-7">
              <h3 className="text-lg font-semibold mb-4">Payment schedule</h3>
              <div className="space-y-2">
                {carePlan.price.payment_schedule?.map((payment, index) => (
                  <div
                    key={index}
                    className="grid sm:grid-cols-[1fr_1fr_auto] gap-1 sm:gap-4 rounded-lg bg-slate-100 p-3 text-sm"
                  >
                    <span className="font-medium">{payment.label}</span>
                    <span className="text-muted-foreground">{payment.due}</span>
                    <span className="font-medium">
                      {formatQuoteMoney(payment.amount, plan.currency ?? "EUR")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {(branding?.hotel_info || branding?.transfer_info || branding?.guarantees?.length) && (
          <div className="grid md:grid-cols-2 gap-4">
            <InfoCard title="Travel and services">
              {branding?.hotel_info && <p>{branding.hotel_info}</p>}
              {branding?.transfer_info && <p>{branding.transfer_info}</p>}
            </InfoCard>
            <InfoCard title="Clinic guarantees">
              {branding?.guarantees?.map((guarantee) => (
                <p key={guarantee} className="flex gap-2">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" style={{ color: primary }} />
                  {guarantee}
                </p>
              ))}
            </InfoCard>
          </div>
        )}

        {(branding?.doctors?.length ?? 0) > 0 && (
          <Card className="print-card">
            <CardContent className="p-5 sm:p-7">
              <h3 className="text-lg font-semibold mb-4">Your clinic team</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {branding?.doctors.map((doctor) => (
                  <div key={doctor.name} className="flex items-center gap-3 rounded-lg border p-3">
                    {doctor.photo ? (
                      <img
                        src={doctor.photo}
                        alt=""
                        className="size-11 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="size-11 rounded-full grid place-items-center text-white font-semibold"
                        style={{ background: secondary }}
                      >
                        {doctor.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{doctor.name}</p>
                      <p className="text-xs text-muted-foreground">{doctor.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {branding?.terms && (
          <div className="print-card rounded-xl border bg-white p-5 flex gap-3">
            <ShieldCheck className="size-5 shrink-0" style={{ color: primary }} />
            <p className="text-xs text-muted-foreground">{branding.terms}</p>
          </div>
        )}

        <PlanDisclaimer>{carePlan.disclaimer}</PlanDisclaimer>

        <Card className="no-print">
          <CardContent className="p-5 sm:p-7 text-center space-y-4">
            {plan.status === "accepted" ? (
              <div>
                <CheckCircle2 className="size-10 mx-auto mb-2" style={{ color: primary }} />
                <h3 className="text-xl font-semibold">Plan accepted</h3>
                <p className="text-sm text-muted-foreground">
                  Your acceptance has been recorded with this Treatment Plan.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold">Ready for your next step?</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {contactHref && (
                    <Button asChild style={{ background: primary }}>
                      <a href={contactHref}>
                        <Phone className="size-4 mr-1" /> Contact Clinic
                      </a>
                    </Button>
                  )}
                  {branding?.email && (
                    <Button asChild variant="outline">
                      <a href={`mailto:${branding.email}?subject=Question about my Treatment Plan`}>
                        <Mail className="size-4 mr-1" /> Ask a Question
                      </a>
                    </Button>
                  )}
                  {!preview && plan.status === "viewed" && (
                    <Button
                      variant="outline"
                      onClick={() => markPlanAccepted(plan.id, plan.clinic_id)}
                    >
                      Accept Plan
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center text-xs text-muted-foreground">
        <p>
          {branding?.phone || ""}
          {branding?.phone && branding?.email ? " Â· " : ""}
          {branding?.email || ""}
        </p>
        <p className="mt-2">Delivered securely by SmileAbroad</p>
      </footer>
    </PlanDocumentShell>
  );
}

function SafeNotFound() {
  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <ShieldCheck className="size-10 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-semibold mt-4">Shared plan not available</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This link is invalid, expired, or the plan is not currently available for viewing.
        </p>
      </div>
    </main>
  );
}
function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">â€¢</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
function StageFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="print-card">
      <CardContent className="p-5 sm:p-7">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}
