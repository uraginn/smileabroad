import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, ExternalLink, Mail, Phone, Printer, ShieldCheck } from "lucide-react";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { useAuth, useAuthHydrated } from "@/lib/auth/mock-auth";
import { isTreatmentPlanPubliclyViewable } from "@/lib/treatment-plan-status";
import { mapTreatmentPlanToPatientDocument, type PatientTreatmentGroup } from "@/lib/care-plan";
import { formatQuoteMoney } from "@/lib/quote";
import { DentalChart } from "@/features/dentalplan/components/DentalChart";
import type { ToothNumber } from "@/features/dentalplan";
import type { PlanCurrency } from "@/types/models";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/shared/treatment-plan/$token")({
  validateSearch: (search: Record<string, unknown>) => ({
    preview: search.preview === true || search.preview === "true" || search.preview === "1",
  }),
  component: SharedPlan,
});
function SharedPlan() {
  const { token } = Route.useParams();
  const { preview } = Route.useSearch();
  const activeUser = useAuth((s) => s.user);
  const authHydrated = useAuthHydrated();
  const hydrated = useMockStoreHydrated();
  const tokenPlan = useMockStore((s) =>
    s.treatmentPlans.find((plan) => plan.share_token === token),
  );
  const canPreview = Boolean(
    preview &&
    tokenPlan &&
    activeUser &&
    (activeUser.role === "platform_admin" || activeUser.clinic_id === tokenPlan.clinic_id),
  );
  const plan =
    tokenPlan && (isTreatmentPlanPubliclyViewable(tokenPlan.status) || canPreview)
      ? tokenPlan
      : undefined;
  const clinic = useMockStore((s) =>
    plan ? s.clinics.find((x) => x.id === plan.clinic_id) : undefined,
  );
  const branding = useMockStore((s) =>
    plan ? s.branding.find((x) => x.clinic_id === plan.clinic_id) : undefined,
  );
  const patient = useMockStore((s) =>
    plan
      ? s.patients.find(
          (x) =>
            x.clinic_id === plan.clinic_id &&
            (x.id === plan.clinic_patient_id || x.user_id === plan.patient_user_id),
        )
      : undefined,
  );
  const markViewed = useMockStore((s) => s.markTreatmentPlanViewed);
  const markAccepted = useMockStore((s) => s.markTreatmentPlanAccepted);
  const markDeclined = useMockStore((s) => s.markTreatmentPlanDeclined);
  useEffect(() => {
    if (!preview && plan?.status === "sent") markViewed(plan.id, plan.clinic_id);
  }, [preview, plan?.status, plan?.id, plan?.clinic_id, markViewed]);
  const document = useMemo(
    () =>
      plan && clinic
        ? mapTreatmentPlanToPatientDocument(plan, clinic, patient, branding)
        : undefined,
    [plan, clinic, patient, branding],
  );
  const nav = useMemo(
    () =>
      document
        ? [
            { id: "treatment-plan", label: "Treatment Plan" },
            { id: "treatment-details", label: "Treatment Details" },
            { id: "journey", label: "Journey" },
            ...(document.travel ? [{ id: "travel", label: "Travel" }] : []),
            { id: "payment", label: "Payment" },
            ...(document.patient_notes.length
              ? [{ id: "important-information", label: "Important Information" }]
              : []),
            { id: "next-steps", label: "Next Steps" },
          ]
        : [],
    [document],
  );
  if (!hydrated || (preview && !authHydrated)) return null;
  if (!plan || !document) return <SafeNotFound />;
  const accent = document.clinic?.accent_color ?? "#0f766e";
  return (
    <div
      className="shared-plan min-h-screen bg-slate-50 text-slate-900"
      style={{ "--shared-accent": accent } as React.CSSProperties}
    >
      <style>{`@media print{.no-print{display:none!important}.shared-plan{background:#fff!important}.print-card,.print-row{break-inside:avoid;box-shadow:none!important}.shared-section{scroll-margin-top:0!important}}`}</style>
      <Header document={document} />
      <SectionNavigation items={nav} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <section id="treatment-plan" className="shared-section scroll-mt-24">
          <Card className="print-card overflow-hidden">
            <div className="h-1.5" style={{ background: accent }} />
            <CardContent className="p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row">
                <div>
                  <p className="text-sm text-muted-foreground">Prepared for</p>
                  <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">
                    {document.patient_name ?? "Patient"}
                  </h2>
                  <h3 className="mt-4 text-lg font-medium">{document.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{document.summary}</p>
                </div>
                <div className="sm:text-right">
                  <Badge style={{ background: accent }}>{document.status_label}</Badge>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Prepared {new Date(document.prepared_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Plan reference {document.reference}
                  </p>
                  {document.price.valid_until && (
                    <p className="text-xs text-muted-foreground">
                      Valid until {new Date(document.price.valid_until).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        <section id="treatment-details" className="shared-section scroll-mt-24">
          <Section
            title="Your Treatment Plan"
            description="Dentist-confirmed treatments are grouped to make the plan easier to review."
          >
            {document.treatment_groups.length ? (
              <div className="divide-y rounded-xl border">
                {document.treatment_groups.map((group) => (
                  <TreatmentRow
                    key={group.id}
                    group={group}
                    currency={document.price.currency}
                    diagrams={document.diagrams}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                The clinic has not added confirmed treatment items yet.
              </p>
            )}
          </Section>
          <Section title="Understanding Your Treatments" className="mt-6">
            <Accordion type="single" collapsible>
              {document.treatment_explanations.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger>{item.title}</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        What it is
                      </p>
                      <p className="mt-1 text-sm">{item.what_it_is}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        What this means for your plan
                      </p>
                      <p className="mt-1 text-sm">{item.plan_context}</p>
                    </div>
                    {item.journey_note && (
                      <Badge variant="outline">Planned during {item.journey_note}</Badge>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Section>
        </section>
        <section id="journey" className="shared-section scroll-mt-24">
          <Section
            title="Treatment Journey"
            description="The expected sequence of your confirmed clinic Treatment Plan."
          >
            <div className="relative space-y-4 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-border">
              {document.journey.map((step, index) => (
                <div key={step.id} className="print-row relative pl-11">
                  <span
                    className="absolute left-0 top-0 grid size-8 place-items-center rounded-full text-xs font-semibold text-white"
                    style={{ background: accent }}
                  >
                    {index + 1}
                  </span>
                  <div className="rounded-lg border bg-white p-4">
                    <h3 className="font-semibold">{step.title}</h3>
                    {step.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {step.stay && <Badge variant="outline">Stay: {step.stay}</Badge>}
                      {step.healing && <Badge variant="outline">Healing: {step.healing}</Badge>}
                    </div>
                    {step.instructions && <p className="mt-2 text-sm">{step.instructions}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </section>
        {document.travel && (
          <section id="travel" className="shared-section scroll-mt-24">
            <Section title="Travel & Accommodation">
              {document.travel.hotel && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold">{document.travel.hotel.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[
                      document.travel.hotel.room_type,
                      document.travel.hotel.board_type,
                      document.travel.nights ? `${document.travel.nights} nights` : undefined,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {document.travel.hotel.website && (
                    <Button className="no-print mt-3" size="sm" variant="outline" asChild>
                      <a href={document.travel.hotel.website} target="_blank" rel="noreferrer">
                        Hotel information <ExternalLink />
                      </a>
                    </Button>
                  )}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {document.travel.services.map((service) => (
                  <Badge key={service} variant="secondary">
                    <Check className="mr-1 size-3" />
                    {service}
                  </Badge>
                ))}
              </div>
            </Section>
          </section>
        )}
        <section id="payment" className="shared-section scroll-mt-24">
          <Section
            title="Payment"
            description="Treatment, travel services and the validated payment schedule in one place."
          >
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
                  {document.price.items?.map((item) => (
                    <TableRow key={item.label}>
                      <TableCell>{item.label}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatQuoteMoney(item.unit_price, document.price.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatQuoteMoney(item.total, document.price.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {((document.price.hotel_total ?? 0) > 0 ||
              (document.price.transfer_total ?? 0) > 0 ||
              (document.price.optional_service_total ?? 0) > 0) && (
              <div className="mt-5 space-y-2 border-t pt-4">
                <h3 className="font-medium">Travel and additional costs</h3>
                {(document.price.hotel_total ?? 0) > 0 && (
                  <PriceRow
                    label="Hotel"
                    value={formatQuoteMoney(
                      document.price.hotel_total ?? 0,
                      document.price.currency,
                    )}
                  />
                )}{" "}
                {(document.price.transfer_total ?? 0) > 0 && (
                  <PriceRow
                    label="Transfers"
                    value={formatQuoteMoney(
                      document.price.transfer_total ?? 0,
                      document.price.currency,
                    )}
                  />
                )}{" "}
                {(document.price.optional_service_total ?? 0) > 0 && (
                  <PriceRow
                    label="Additional services"
                    value={formatQuoteMoney(
                      document.price.optional_service_total ?? 0,
                      document.price.currency,
                    )}
                  />
                )}
              </div>
            )}
            {document.included_services.length > 0 && (
              <div className="mt-5 border-t pt-4">
                <h3 className="font-medium">Included in your plan</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {document.included_services.map((service) => (
                    <p key={service} className="flex gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
                      {service}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5 rounded-xl bg-slate-100 p-4 sm:ml-auto sm:max-w-md">
              <PriceRow
                label="Subtotal"
                value={formatQuoteMoney(document.price.subtotal ?? 0, document.price.currency)}
              />
              {(document.price.discount ?? 0) > 0 && (
                <PriceRow
                  label="Discount"
                  value={`− ${formatQuoteMoney(document.price.discount ?? 0, document.price.currency)}`}
                />
              )}
              <Separator className="my-3" />
              <div className="text-lg font-semibold">
                <PriceRow
                  label="Final total"
                  value={formatQuoteMoney(document.price.total ?? 0, document.price.currency)}
                />
              </div>
            </div>
            {document.price.payment_schedule?.length ? (
              <div className="mt-6 border-t pt-5">
                <h3 className="font-semibold">Payment schedule</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {document.price.payment_schedule.map((payment) => (
                    <div
                      key={`${payment.label}-${payment.due}`}
                      className="print-row rounded-lg border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{payment.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{payment.due}</p>
                        </div>
                        <p className="font-semibold">
                          {formatQuoteMoney(payment.amount, document.price.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : document.price.payment_schedule_valid === false ? (
              <p className="mt-5 rounded-lg bg-slate-100 p-3 text-sm text-muted-foreground">
                The clinic will confirm the visit payment schedule before treatment begins.
              </p>
            ) : null}
          </Section>
        </section>
        {document.patient_notes.length > 0 && (
          <section id="important-information" className="shared-section scroll-mt-24">
            <Alert>
              <AlertTitle>Important Information</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-2">
                  {document.patient_notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </section>
        )}
        <section id="next-steps" className="shared-section scroll-mt-24">
          <Card className="print-card">
            <CardContent className="p-6 text-center sm:p-8">
              {plan.status === "accepted" ? (
                <>
                  <CheckCircle2 className="mx-auto size-10" style={{ color: accent }} />
                  <h2 className="mt-3 text-xl font-semibold">Treatment Plan accepted</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The clinic can now help arrange your appointments, travel and treatment dates.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold">Next Steps</h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                    Review your Treatment Plan, contact the clinic with any questions, and confirm
                    whether you would like to proceed.
                  </p>
                  <div className="no-print mt-5 flex flex-wrap justify-center gap-2">
                    {document.clinic?.phone && (
                      <Button asChild style={{ background: accent }}>
                        <a href={`tel:${document.clinic.phone.replace(/\s/g, "")}`}>
                          <Phone />
                          Contact Clinic
                        </a>
                      </Button>
                    )}
                    {document.clinic?.email && (
                      <Button asChild variant="outline">
                        <a
                          href={`mailto:${document.clinic.email}?subject=Question about my Treatment Plan`}
                        >
                          <Mail />
                          Ask a Question
                        </a>
                      </Button>
                    )}
                    {!preview && plan.status === "viewed" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => markDeclined(plan.id, plan.clinic_id)}
                        >
                          Decline
                        </Button>
                        <Button onClick={() => markAccepted(plan.id, plan.clinic_id)}>
                          Accept Treatment Plan
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer document={document} />
    </div>
  );
}

function Header({ document }: { document: ReturnType<typeof mapTreatmentPlanToPatientDocument> }) {
  const clinic = document.clinic!;
  return (
    <header className="relative overflow-hidden text-white">
      <div className="absolute inset-0">
        {clinic.banner_url && (
          <img src={clinic.banner_url} alt="" className="size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-slate-950/70" />
      </div>
      <div className="relative mx-auto flex min-h-52 max-w-5xl flex-col justify-end gap-5 px-4 py-7 sm:flex-row sm:items-end sm:px-6">
        <img
          src={clinic.logo_url ?? clinic.banner_url}
          alt={`${clinic.name} logo`}
          className="size-16 rounded-xl border border-white/30 bg-white object-cover"
        />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">
            Treatment Plan & Cost Estimate
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{clinic.name}</h1>
          <p className="mt-1 text-sm text-white/80">
            {clinic.tagline ?? `${clinic.city}, ${clinic.country}`}
          </p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
          {clinic.website && (
            <Button variant="secondary" asChild>
              <a href={clinic.website} target="_blank" rel="noreferrer">
                <ExternalLink />
                Website
              </a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
function SectionNavigation({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-25% 0px -60%", threshold: [0.1, 0.5] },
    );
    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [items]);
  return (
    <nav
      aria-label="Treatment Plan sections"
      className="no-print sticky top-0 z-30 border-b bg-white/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {items.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={active === item.id ? "default" : "ghost"}
            aria-current={active === item.id ? "location" : undefined}
            onClick={() =>
              document
                .getElementById(item.id)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            {item.label}
          </Button>
        ))}
      </div>
    </nav>
  );
}
function TreatmentRow({
  group,
  currency,
  diagrams,
}: {
  group: PatientTreatmentGroup;
  currency: PlanCurrency;
  diagrams?: ReturnType<typeof mapTreatmentPlanToPatientDocument>["diagrams"];
}) {
  const [open, setOpen] = useState(false);
  const selected = group.teeth as ToothNumber[];
  return (
    <>
      <div className="print-row flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{group.label}</p>
          <p className="text-sm text-muted-foreground">
            {group.quantity} {group.quantity === 1 ? "unit" : "units"}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-medium">{formatQuoteMoney(group.total, currency)}</p>
          {group.unit_price > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatQuoteMoney(group.unit_price, currency)} per unit
            </p>
          )}
        </div>
        <Button className="no-print" variant="outline" size="sm" onClick={() => setOpen(true)}>
          View detail
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{group.label}</DialogTitle>
            <DialogDescription>
              {group.quantity} {group.quantity === 1 ? "unit" : "units"} included in this Treatment
              Plan.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-3">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Fact label="Quantity" value={String(group.quantity)} />
                <Fact label="Unit price" value={formatQuoteMoney(group.unit_price, currency)} />
                <Fact label="Group total" value={formatQuoteMoney(group.total, currency)} />
              </div>
              {group.teeth.length > 0 && (
                <p className="text-sm">
                  <strong>Teeth included:</strong> {group.teeth.sort((a, b) => a - b).join(", ")}
                </p>
              )}
              {diagrams && (
                <Tabs defaultValue="proposed">
                  <TabsList>
                    <TabsTrigger value="current">Current Condition</TabsTrigger>
                    <TabsTrigger value="proposed">Proposed Treatment</TabsTrigger>
                  </TabsList>
                  <TabsContent value="current">
                    <DentalChart
                      title="Current dental condition"
                      mode="current"
                      currentConditions={diagrams.currentConditions}
                      proposedTreatments={diagrams.proposedTreatments}
                      selected={selected}
                      readOnly
                      onSelect={() => undefined}
                    />
                  </TabsContent>
                  <TabsContent value="proposed">
                    <DentalChart
                      title="Proposed Treatment"
                      mode="proposed"
                      currentConditions={diagrams.currentConditions}
                      proposedTreatments={diagrams.proposedTreatments}
                      selected={selected}
                      readOnly
                      onSelect={() => undefined}
                    />
                  </TabsContent>
                </Tabs>
              )}
              {group.patient_notes.map((note) => (
                <p key={note} className="rounded-lg bg-slate-100 p-3 text-sm">
                  {note}
                </p>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`print-card ${className ?? ""}`}>
      <CardContent className="p-5 sm:p-7">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-5">{children}</div>
      </CardContent>
    </Card>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
function Footer({ document }: { document: ReturnType<typeof mapTreatmentPlanToPatientDocument> }) {
  const clinic = document.clinic!;
  return (
    <footer className="mx-auto max-w-5xl border-t px-4 py-8 text-xs text-muted-foreground sm:px-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div>
          <p className="font-medium text-slate-900">{clinic.name}</p>
          <p>
            {clinic.city}, {clinic.country}
          </p>
          <p>{[clinic.phone, clinic.email].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="sm:text-right">
          <p>Prepared {new Date(document.prepared_at).toLocaleDateString()}</p>
          <p>Plan reference {document.reference}</p>
        </div>
      </div>
      <p className="mt-5 flex gap-2">
        <ShieldCheck className="size-4 shrink-0" />
        {document.disclaimer}
      </p>
    </footer>
  );
}
function SafeNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <ShieldCheck className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Shared plan not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link is invalid, expired, or the Treatment Plan is not currently available for
          viewing.
        </p>
      </div>
    </main>
  );
}
