import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Plane,
  Printer,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
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
            ...(document.treatment_explanations.length
              ? [{ id: "treatment-guide", label: "Treatment Guide" }]
              : []),
            { id: "journey", label: "Journey" },
            ...(document.travel ? [{ id: "travel", label: "Travel" }] : []),
            { id: "payment", label: "Payment" },
            ...(document.included_services.length
              ? [{ id: "included-services", label: "Included Services" }]
              : []),
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
      <style>{`@media print{.no-print{display:none!important}.shared-plan,.shared-section,.print-cta{background:#fff!important;color:#0f172a!important}.print-cta *{color:#0f172a!important}.print-card,.print-row,.payment-summary{break-inside:avoid;box-shadow:none!important}.print-grid{display:block!important}.payment-summary{position:static!important;margin-bottom:1rem}.shared-section{scroll-margin-top:0!important;margin-block:1.5rem!important;padding-block:1rem!important}.shared-hero{min-height:11rem!important}.shared-hero img{max-height:11rem}.print-expand [data-state="closed"]+div{display:block!important;height:auto!important}.dental-preview{max-width:100%!important;overflow:hidden!important}}`}</style>
      <Header document={document} />
      <SectionNavigation items={nav} />
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section
          id="treatment-plan"
          className="shared-section -mx-4 scroll-mt-24 rounded-3xl bg-stone-100/70 px-4 py-10 sm:-mx-6 sm:px-6 sm:py-12"
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Hi {document.patient_name?.split(" ")[0] ?? "there"},
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Your clinic has prepared this personalized Treatment Plan following your clinical
                review. It brings together your proposed treatment, treatment journey, travel
                arrangements and payment information in one clear document.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground md:max-w-xs md:justify-end">
              <span className="flex items-center gap-2">
                <MapPin className="size-4" aria-hidden="true" />
                {document.clinic?.city}, {document.clinic?.country}
              </span>
              {document.price.valid_until && (
                <span>Valid until {new Date(document.price.valid_until).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </section>
        <section id="treatment-details" className="shared-section scroll-mt-24 py-10 sm:py-16">
          <SectionHeading
            eyebrow="Your plan"
            title="Your Treatment Plan"
            description="Your dentist-confirmed treatments, grouped into a simple overview."
          />
          <div
            className={`mt-8 grid gap-10 ${document.diagrams ? "lg:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.18fr)]" : ""}`}
          >
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
              {document.treatment_groups.length ? (
                <div className="divide-y">
                  {document.treatment_groups.map((group) => (
                    <TreatmentRow
                      key={group.id}
                      group={group}
                      currency={document.price.currency}
                      diagrams={document.diagrams}
                      explanation={document.treatment_explanations.find(
                        (item) => item.id === group.id,
                      )}
                    />
                  ))}
                </div>
              ) : (
                <p className="p-6 text-sm text-muted-foreground">
                  The clinic has not added confirmed treatment items yet.
                </p>
              )}
            </div>
            {document.diagrams && <DentalPlanPreview diagrams={document.diagrams} />}
          </div>
        </section>
        {document.treatment_explanations.length > 0 && (
          <section
            id="treatment-guide"
            className="shared-section -mx-4 scroll-mt-24 bg-slate-100/70 px-4 py-10 sm:-mx-6 sm:px-6 sm:py-12"
          >
            <div className="print-expand max-w-4xl rounded-3xl bg-white px-5 py-2 ring-1 ring-slate-200/70 sm:px-7">
              <SectionHeading
                eyebrow="Treatment guide"
                title="Understanding Your Treatments"
                description="Concise guidance personalized to the treatments included in your plan."
                compact
              />
              <Accordion type="single" collapsible className="mt-3">
                {document.treatment_explanations.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger className="gap-4 text-left text-base hover:no-underline">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100">
                          <CircleHelp className="size-4" aria-hidden="true" />
                        </span>
                        <span>
                          <span className="block font-medium">{item.title}</span>
                          <span className="mt-0.5 line-clamp-1 block text-xs font-normal text-muted-foreground">
                            {item.what_it_is}
                          </span>
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-5 text-sm leading-6">
                      <div>
                        <p className="font-medium">What it is</p>
                        <p className="mt-1 text-muted-foreground">{item.what_it_is}</p>
                      </div>
                      <div>
                        <p className="font-medium">What this means for your plan</p>
                        <p className="mt-1 text-muted-foreground">{item.plan_context}</p>
                      </div>
                      {item.journey_note && (
                        <Badge variant="outline">Planned during {item.journey_note}</Badge>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}
        <section
          id="journey"
          className="shared-section -mx-4 scroll-mt-24 bg-white px-4 py-10 sm:-mx-6 sm:px-6 sm:py-16"
        >
          <SectionHeading
            eyebrow="How it works"
            title="Treatment Journey"
            description="The expected sequence of your confirmed clinic Treatment Plan."
          />
          <div className="relative mt-8 space-y-0 before:absolute before:bottom-5 before:left-4 before:top-5 before:w-px before:bg-slate-300 md:flex md:gap-0 md:before:bottom-auto md:before:left-8 md:before:right-8 md:before:top-4 md:before:h-px md:before:w-auto">
            {document.journey.map((step, index) => (
              <div
                key={step.id}
                className="print-row relative pb-8 pl-12 last:pb-0 md:min-w-0 md:flex-1 md:px-4 md:pb-0 md:pt-12 first:md:pl-0 last:md:pr-0"
              >
                <span
                  className="absolute left-0 top-0 z-10 grid size-8 place-items-center rounded-full text-xs font-semibold text-white md:left-4 md:top-0 first:md:left-0"
                  style={{ background: accent }}
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  {step.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {step.stay && <Badge variant="outline">Stay: {step.stay}</Badge>}
                    {step.healing && <Badge variant="outline">Healing: {step.healing}</Badge>}
                  </div>
                  {step.instructions && <p className="mt-3 text-sm">{step.instructions}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
        {document.travel && (
          <section
            id="travel"
            className="shared-section -mx-4 scroll-mt-24 bg-stone-100/70 px-4 py-10 sm:-mx-6 sm:px-6 sm:py-16"
          >
            <SectionHeading
              eyebrow="Your stay"
              title="Travel & Accommodation"
              description="The practical arrangements currently included with your Treatment Plan."
            />
            <div
              className={`mt-7 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 ${document.travel.hotel ? "md:grid md:grid-cols-[1.2fr_0.8fr]" : "max-w-xl"}`}
            >
              {document.travel.hotel ? (
                <div className="p-6 sm:p-8">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100">
                    <BedDouble className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{document.travel.hotel.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
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
              ) : null}
              <div
                className={`bg-slate-50 p-6 sm:p-8 ${document.travel.hotel ? "border-t md:border-l md:border-t-0" : ""}`}
              >
                <p className="text-sm font-medium">Travel services</p>
                <div className="mt-4 space-y-3">
                  {document.travel.services.map((service) => (
                    <p key={service} className="flex items-center gap-3 text-sm">
                      {service.toLowerCase().includes("flight") ? (
                        <Plane className="size-4" aria-hidden="true" />
                      ) : (
                        <Check className="size-4" style={{ color: accent }} aria-hidden="true" />
                      )}
                      <span>{service}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        <section
          id="payment"
          className="shared-section -mx-4 scroll-mt-24 bg-white px-4 py-10 sm:-mx-6 sm:px-6 sm:py-16"
        >
          <SectionHeading
            eyebrow="Clear pricing"
            title="Your Treatment Investment"
            description="A transparent breakdown of treatment, services and payment stages."
          />
          <div className="print-grid mt-7 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)] lg:items-start">
            <div className="order-2 min-w-0 space-y-8 lg:order-1">
              <div className="overflow-x-auto rounded-2xl border bg-white">
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
            </div>
            <aside className="payment-summary order-1 rounded-2xl bg-slate-900 p-6 text-white shadow-lg lg:order-2 lg:sticky lg:top-20">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
                <WalletCards className="size-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-sm font-medium text-white/60">Final total</h3>
              <p className="mt-1 text-4xl font-semibold tracking-tight">
                {formatQuoteMoney(document.price.total ?? 0, document.price.currency)}
              </p>
              <div className="mt-6 border-t border-white/15 pt-4 [&_span:first-child]:text-white/60">
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
                {document.price.valid_until && (
                  <PriceRow
                    label="Valid until"
                    value={new Date(document.price.valid_until).toLocaleDateString()}
                  />
                )}
              </div>
            </aside>
          </div>
          {document.price.payment_schedule?.length ? (
            <div className="mt-10 border-t pt-8">
              <h3 className="text-xl font-semibold">Payment milestones</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Payments are organized around your confirmed clinic visits.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {document.price.payment_schedule.map((payment) => (
                  <div
                    key={`${payment.label}-${payment.due}`}
                    className="print-row rounded-2xl border bg-white p-5 shadow-sm"
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
        </section>
        {document.included_services.length > 0 && (
          <section
            id="included-services"
            className="shared-section -mx-4 scroll-mt-24 bg-slate-100/70 px-4 py-10 sm:-mx-6 sm:px-6 sm:py-12"
          >
            <SectionHeading
              eyebrow="Your package"
              title="Included in Your Plan"
              description="Services already included in your Treatment Plan, grouped for easy review."
            />
            <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {groupIncludedServices(document.included_services).map((group) => (
                <div key={group.label} className="min-w-0">
                  <h3 className="font-medium">{group.label}</h3>
                  <div className="mt-3 space-y-3">
                    {group.services.map((service) => (
                      <p key={service} className="flex gap-2 text-sm leading-5">
                        <Check
                          className="mt-0.5 size-4 shrink-0"
                          style={{ color: accent }}
                          aria-hidden="true"
                        />
                        {service}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {document.patient_notes.length > 0 && (
          <section id="important-information" className="shared-section py-10 sm:py-12">
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
        <section id="next-steps" className="shared-section scroll-mt-24 py-10 sm:py-16">
          <Card className="print-card print-cta overflow-hidden border-0 bg-slate-900 text-white shadow-xl">
            <CardContent className="p-7 text-center sm:p-12">
              {plan.status === "accepted" ? (
                <>
                  <CheckCircle2 className="mx-auto size-10" style={{ color: accent }} />
                  <h2 className="mt-3 text-xl font-semibold">Treatment Plan accepted</h2>
                  <p className="mt-2 text-sm text-white/70">
                    The clinic can now help arrange your appointments, travel and treatment dates.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-white/60">Next steps</p>
                  <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Ready to continue?</h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/70">
                    Review your Treatment Plan, contact the clinic with any questions, and confirm
                    whether you would like to proceed.
                  </p>
                  <div className="no-print mt-5 flex flex-wrap justify-center gap-2">
                    {!preview && plan.status === "viewed" && (
                      <Button
                        style={{ background: accent }}
                        onClick={() => markAccepted(plan.id, plan.clinic_id)}
                      >
                        Accept Treatment Plan
                      </Button>
                    )}
                    {document.clinic?.phone && (
                      <Button asChild variant="secondary">
                        <a href={`tel:${document.clinic.phone.replace(/\s/g, "")}`}>
                          <Phone /> Contact Clinic
                        </a>
                      </Button>
                    )}
                    {document.clinic?.email && (
                      <Button asChild variant="ghost" className="text-white hover:text-white">
                        <a
                          href={`mailto:${document.clinic.email}?subject=Question about my Treatment Plan`}
                        >
                          <Mail /> Ask a Question
                        </a>
                      </Button>
                    )}
                    {!preview && plan.status === "viewed" && (
                      <Button
                        variant="ghost"
                        className="text-white/70 hover:text-white"
                        onClick={() => markDeclined(plan.id, plan.clinic_id)}
                      >
                        Decline
                      </Button>
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
    <header className="shared-hero relative overflow-hidden text-white">
      <div className="absolute inset-0">
        {clinic.banner_url && (
          <img src={clinic.banner_url} alt="" className="size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/45" />
      </div>
      <div className="relative mx-auto flex min-h-64 max-w-6xl flex-col justify-end gap-6 px-4 py-8 sm:min-h-72 sm:flex-row sm:items-end sm:px-6 sm:py-10">
        <img
          src={clinic.logo_url ?? clinic.banner_url}
          alt={`${clinic.name} logo`}
          className="size-16 rounded-2xl border border-white/40 bg-white object-contain p-1 shadow-lg sm:size-20"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-white/90">{clinic.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Treatment Plan & Cost Estimate
          </h1>
          {clinic.tagline && <p className="mt-2 text-sm text-white/75">{clinic.tagline}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/75">
            <span>Prepared for {document.patient_name ?? "Patient"}</span>
            <span aria-hidden="true">•</span>
            <span>{new Date(document.prepared_at).toLocaleDateString()}</span>
            <span aria-hidden="true">•</span>
            <span>Ref. {document.reference}</span>
          </div>
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
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:justify-center sm:px-6">
        {items.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant="ghost"
            className={
              active === item.id
                ? "bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
                : ""
            }
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
  explanation,
}: {
  group: PatientTreatmentGroup;
  currency: PlanCurrency;
  diagrams?: ReturnType<typeof mapTreatmentPlanToPatientDocument>["diagrams"];
  explanation?: ReturnType<
    typeof mapTreatmentPlanToPatientDocument
  >["treatment_explanations"][number];
}) {
  const [open, setOpen] = useState(false);
  const selected = group.teeth as ToothNumber[];
  return (
    <>
      <div className="print-row group flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{group.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {group.quantity} {group.quantity === 1 ? "unit" : "units"}
            {group.teeth.length > 0 ? ` · ${group.teeth.length} teeth included` : ""}
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
        <Button
          className="no-print shrink-0"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
        >
          View details <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-4xl overflow-hidden rounded-2xl p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle>{group.label}</DialogTitle>
              <DialogDescription>
                {explanation?.what_it_is ??
                  `${group.quantity} ${group.quantity === 1 ? "unit" : "units"} included in this Treatment Plan.`}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[72vh] pr-3">
              <Tabs defaultValue="overview">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  {diagrams && <TabsTrigger value="dental-plan">Dental Plan</TabsTrigger>}
                  <TabsTrigger value="pricing">Pricing Details</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-5 pt-4">
                  {explanation && (
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="font-medium">What it is</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {explanation.what_it_is}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Why it is included</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {explanation.plan_context}
                        </p>
                      </div>
                    </div>
                  )}
                  {group.teeth.length > 0 && (
                    <p className="text-sm">
                      <strong>Teeth included:</strong>{" "}
                      {[...group.teeth].sort((a, b) => a - b).join(", ")}
                    </p>
                  )}
                  {group.patient_notes.map((note) => (
                    <Alert key={note}>
                      <AlertDescription>{note}</AlertDescription>
                    </Alert>
                  ))}
                </TabsContent>
                {diagrams && (
                  <TabsContent value="dental-plan" className="pt-4">
                    <DentalDiagramTabs diagrams={diagrams} selected={selected} />
                  </TabsContent>
                )}
                <TabsContent value="pricing" className="pt-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Fact label="Quantity" value={String(group.quantity)} />
                    <Fact label="Unit price" value={formatQuoteMoney(group.unit_price, currency)} />
                    <Fact label="Group total" value={formatQuoteMoney(group.total, currency)} />
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
function DentalPlanPreview({
  diagrams,
}: {
  diagrams: NonNullable<ReturnType<typeof mapTreatmentPlanToPatientDocument>["diagrams"]>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dental-preview min-w-0 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-base font-semibold">Your dental plan</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your current condition and dentist-confirmed proposed treatment.
          </p>
        </div>
        <Button
          className="no-print shrink-0"
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          View Dental Plan <ExternalLink className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <DentalDiagramTabs diagrams={diagrams} selected={[]} />
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-5xl overflow-hidden rounded-2xl p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle>Your Dental Plan</DialogTitle>
              <DialogDescription>
                Review your current condition and proposed treatment in a larger clinical view.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[76vh] pr-3">
              <DentalDiagramTabs diagrams={diagrams} selected={[]} />
            </ScrollArea>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
function DentalDiagramTabs({
  diagrams,
  selected,
}: {
  diagrams: NonNullable<ReturnType<typeof mapTreatmentPlanToPatientDocument>["diagrams"]>;
  selected: ToothNumber[];
}) {
  return (
    <Tabs defaultValue="proposed">
      <TabsList className="w-full grid grid-cols-2">
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
  );
}
function SectionHeading({
  eyebrow,
  title,
  description,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "max-w-2xl" : "max-w-3xl"}>
      <p className="text-sm font-medium text-slate-500">{eyebrow}</p>
      <h2
        className={`mt-2 font-semibold tracking-tight ${compact ? "text-2xl" : "text-2xl sm:text-3xl"}`}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
      )}
    </div>
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
function groupIncludedServices(services: string[]) {
  const groups = [
    { label: "Clinical", services: [] as string[] },
    { label: "Travel", services: [] as string[] },
    { label: "Support", services: [] as string[] },
  ];
  for (const service of services) {
    const normalized = service.toLowerCase();
    const group = /hotel|transfer|airport|flight|accommodation/.test(normalized)
      ? groups[1]
      : /x-ray|scan|medication|temporary|treatment|consultation/.test(normalized)
        ? groups[0]
        : groups[2];
    group.services.push(service);
  }
  return groups.filter((group) => group.services.length > 0);
}
function Footer({ document }: { document: ReturnType<typeof mapTreatmentPlanToPatientDocument> }) {
  const clinic = document.clinic!;
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-xs text-muted-foreground sm:grid-cols-2 sm:px-6">
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
      <p className="mx-auto flex max-w-6xl gap-2 border-t px-4 py-5 sm:px-6">
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
