import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BedDouble,
  Bone,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Crown,
  ExternalLink,
  HeartHandshake,
  Link2,
  Mail,
  Phone,
  Plane,
  Printer,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { useAuth, useAuthHydrated } from "@/lib/auth/mock-auth";
import { isTreatmentPlanPubliclyViewable } from "@/lib/treatment-plan-status";
import { mapTreatmentPlanToPatientDocument, type PatientTreatmentGroup } from "@/lib/care-plan";
import { formatQuoteMoney } from "@/lib/quote";
import { DentalChart } from "@/features/dentalplan/components/DentalChart";
import type { ToothNumber } from "@/features/dentalplan";
import type { ToothTreatment } from "@/types/models";
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
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const coordinator = useMockStore((s) =>
    plan
      ? s.users.find(
          (user) =>
            user.clinic_id === plan.clinic_id &&
            user.id === (plan.coordinator_id ?? patient?.coordinator_id),
        )
      : undefined,
  );
  const configuredHotel = useMockStore((s) =>
    plan
      ? s.clinicHotels.find(
          (hotel) =>
            hotel.clinic_id === plan.clinic_id &&
            (hotel.id === plan.selected_hotel_id || hotel.id === plan.hotel_snapshot?.hotel_id),
        )
      : undefined,
  );
  const allTreatmentDefinitions = useMockStore((s) => s.clinicTreatmentDefinitions);
  const treatmentDefinitions = useMemo(
    () =>
      plan
        ? allTreatmentDefinitions.filter((definition) => definition.clinic_id === plan.clinic_id)
        : [],
    [allTreatmentDefinitions, plan],
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
        ? mapTreatmentPlanToPatientDocument(
            plan,
            clinic,
            patient,
            branding,
            coordinator,
            treatmentDefinitions,
          )
        : undefined,
    [plan, clinic, patient, branding, coordinator, treatmentDefinitions],
  );
  const faqs = useMemo(
    () => (document ? buildTreatmentFaq(document.treatment_groups) : []),
    [document],
  );
  const nav = useMemo(
    () =>
      document
        ? [
            { id: "treatment-plan", label: "Treatment Plan" },
            { id: "journey", label: "Journey" },
            ...(document.travel ? [{ id: "travel", label: "Travel" }] : []),
            { id: "payment", label: "Payment" },
            ...(document.patient_notes.length
              ? [{ id: "important-information", label: "Important Information" }]
              : []),
            ...(faqs.length ? [{ id: "faq", label: "FAQ" }] : []),
            { id: "next-steps", label: "Next Steps" },
          ]
        : [],
    [document, faqs.length],
  );
  if (!hydrated || (preview && !authHydrated)) return null;
  if (!plan || !document) return <SafeNotFound />;
  const accent = document.clinic?.accent_color ?? "#0f766e";
  const primary = document.clinic?.primary_color ?? accent;
  const secondary = document.clinic?.secondary_color ?? "#334155";
  const hasAdditionalCosts =
    (document.price.hotel_total ?? 0) > 0 ||
    (document.price.transfer_total ?? 0) > 0 ||
    (document.price.optional_service_total ?? 0) > 0;
  return (
    <div
      className="shared-plan min-h-screen bg-slate-50 text-slate-900"
      style={
        {
          "--shared-primary": primary,
          "--shared-secondary": secondary,
          "--shared-accent": accent,
        } as React.CSSProperties
      }
    >
      <style>{`.shared-plan [role="tab"][data-state="active"]{box-shadow:inset 0 -2px 0 var(--shared-accent)}@media print{@page{margin:14mm}.no-print{display:none!important}.shared-plan,.shared-section,.print-cta{background:#fff!important;color:#0f172a!important}.print-cta *{color:#0f172a!important}.print-card,.print-row,.payment-summary,.dental-preview{break-inside:avoid;box-shadow:none!important}.print-grid{display:block!important}.payment-summary{position:static!important;margin-bottom:1rem}.shared-section{scroll-margin-top:0!important;margin-block:1rem!important;padding-block:1rem!important}.shared-section>h2,.shared-section>div>h2{break-after:avoid}.shared-hero{min-height:10rem!important}.shared-hero img{max-height:9rem}.print-expand [data-state="closed"]+div{display:block!important;height:auto!important}.dental-preview{max-width:100%!important;overflow:hidden!important}.shared-plan a{text-decoration:none!important}}`}</style>
      <Header document={document} />
      <SectionNavigation items={nav} />
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section
          id="introduction"
          className="shared-section -mx-4 scroll-mt-24 rounded-b-[2rem] bg-stone-100/70 px-4 py-12 sm:-mx-6 sm:px-6 sm:py-16"
        >
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left">
            {document.coordinator?.avatar_url || document.clinic?.logo_url ? (
              <img
                src={document.coordinator?.avatar_url ?? document.clinic?.logo_url}
                alt={
                  document.coordinator
                    ? `${document.coordinator.name}, your clinic coordinator`
                    : `${document.clinic?.name} logo`
                }
                className="size-24 shrink-0 rounded-full bg-white object-cover p-1 shadow-lg ring-4 ring-white sm:size-28"
                style={{ outline: `2px solid ${accent}` }}
              />
            ) : (
              <span
                className="grid size-24 shrink-0 place-items-center rounded-full text-3xl font-semibold text-white shadow-lg sm:size-28"
                style={{ background: primary }}
                aria-hidden="true"
              >
                {document.clinic?.name.charAt(0)}
              </span>
            )}
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                A personal welcome from {document.clinic?.name}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Prepared specifically for {document.patient_name?.split(" ")[0] ?? "you"}
              </h2>
              <p className="mt-4 whitespace-pre-line text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {document.clinic?.introduction ??
                  "Your clinic has prepared this personalized Treatment Plan following your clinical review. It brings together the information you need to understand your proposed care and next steps."}
              </p>
              {document.coordinator && (
                <p className="mt-5 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{document.coordinator.name}</span>
                  {document.coordinator.title ? ` · ${document.coordinator.title}` : ""}
                  <span className="block text-muted-foreground">Your clinic contact</span>
                </p>
              )}
            </div>
          </div>
        </section>
        <section id="treatment-plan" className="shared-section scroll-mt-24 py-10 sm:py-16">
          <SectionHeading
            eyebrow="Your plan"
            title="Your Treatment Plan"
            description="A concise overview of the treatments your clinic has prepared for you."
          />
          <TreatmentExperience document={document} />
        </section>
        <section
          id="journey"
          className="shared-section -mx-4 scroll-mt-24 bg-white px-4 py-10 sm:-mx-6 sm:px-6 sm:py-16"
        >
          <SectionHeading
            eyebrow="How it works"
            title="Treatment Journey"
            description="The expected sequence of your confirmed clinic Treatment Plan."
          />
          <div className="relative mt-10 space-y-0 before:absolute before:bottom-7 before:left-5 before:top-6 before:w-px before:bg-gradient-to-b before:from-slate-400 before:to-slate-200 md:flex md:gap-5 md:before:bottom-auto md:before:left-8 md:before:right-8 md:before:top-5 md:before:h-px md:before:w-auto">
            {document.journey.map((step, index) => (
              <div
                key={step.id}
                className="print-row relative pb-6 pl-14 last:pb-0 md:min-w-0 md:flex-1 md:p-0 md:pt-14"
              >
                <span
                  className="absolute left-0 top-0 z-10 grid size-10 place-items-center rounded-full border-4 border-white text-xs font-semibold text-white shadow-sm md:left-1/2 md:top-0 md:-translate-x-1/2"
                  style={{ background: accent }}
                >
                  {index + 1}
                </span>
                <div className="rounded-2xl bg-slate-50/80 p-5 ring-1 ring-slate-200/70 transition-colors hover:bg-white md:h-full">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-2 font-semibold tracking-tight">{step.title}</h3>
                  {step.description && (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {step.stay && <Badge variant="outline">Stay: {step.stay}</Badge>}
                    {step.healing && <Badge variant="outline">Healing: {step.healing}</Badge>}
                  </div>
                  {step.instructions && (
                    <p className="mt-4 border-t pt-3 text-sm leading-6 text-slate-600">
                      {step.instructions}
                    </p>
                  )}
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
            <div className="mt-8 max-w-5xl overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.4)] ring-1 ring-slate-200/80">
              {document.travel.hotel && configuredHotel?.images.length ? (
                <HotelCarousel
                  images={configuredHotel.images}
                  hotelName={document.travel.hotel.name}
                />
              ) : null}
              <div
                className={
                  document.travel.hotel && document.travel.services.length
                    ? "md:grid md:grid-cols-[1.1fr_0.9fr]"
                    : ""
                }
              >
                {document.travel.hotel ? (
                  <div className="p-6 sm:p-8">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <BedDouble className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold">{document.travel.hotel.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {[
                        configuredHotel?.categories[0],
                        document.travel.hotel.room_type,
                        document.travel.hotel.board_type,
                        document.travel.nights ? `${document.travel.nights} nights` : undefined,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {(configuredHotel?.website ?? document.travel.hotel.website) && (
                      <Button className="no-print mt-3" size="sm" variant="outline" asChild>
                        <a
                          href={configuredHotel?.website ?? document.travel.hotel.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Hotel information <ExternalLink />
                        </a>
                      </Button>
                    )}
                  </div>
                ) : null}
                {document.travel.services.length > 0 && (
                  <div
                    className={`bg-slate-50/80 p-6 sm:p-8 ${document.travel.hotel ? "border-t md:border-l md:border-t-0" : ""}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Travel support
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">Arrangements for your stay</h3>
                    <div className="mt-4 space-y-3">
                      {document.travel.services.map((service) => (
                        <p
                          key={service}
                          className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-slate-200/60"
                        >
                          {service.toLowerCase().includes("flight") ? (
                            <Plane className="size-4" aria-hidden="true" />
                          ) : (
                            <Check
                              className="size-4"
                              style={{ color: accent }}
                              aria-hidden="true"
                            />
                          )}
                          <span>{service}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
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
            title="Your Treatment Cost"
            description="A transparent breakdown of treatment, services and payment stages."
          />
          <div
            className={`print-grid mt-8 grid gap-8 lg:items-start ${hasAdditionalCosts ? "lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]" : "max-w-xl"}`}
          >
            {hasAdditionalCosts && (
              <div className="order-2 min-w-0 space-y-8 lg:order-1">
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Additional costs
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">Travel and selected services</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Additional items included in the final estimate.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 shadow-sm sm:p-6">
                  {(document.price.hotel_total ?? 0) > 0 && (
                    <PriceRow
                      label="Hotel"
                      value={formatQuoteMoney(
                        document.price.hotel_total ?? 0,
                        document.price.currency,
                      )}
                    />
                  )}
                  {(document.price.transfer_total ?? 0) > 0 && (
                    <PriceRow
                      label="Transfers"
                      value={formatQuoteMoney(
                        document.price.transfer_total ?? 0,
                        document.price.currency,
                      )}
                    />
                  )}
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
              </div>
            )}
            <aside className="payment-summary order-1 overflow-hidden rounded-3xl bg-slate-900 p-7 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.7)] lg:order-2 lg:sticky lg:top-20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                  <WalletCards className="size-5" aria-hidden="true" />
                </div>
                <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                  Transparent pricing
                </Badge>
              </div>
              <h3 className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                Final total
              </h3>
              <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-4xl">
                {formatQuoteMoney(document.price.total ?? 0, document.price.currency)}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Your confirmed treatment and selected services, presented as one clear estimate.
              </p>
              <div className="mt-6 border-t border-white/15 pt-4 [&_span:first-child]:text-white/60">
                <PriceRow
                  label="Subtotal"
                  value={formatQuoteMoney(document.price.subtotal ?? 0, document.price.currency)}
                />
                {(document.price.discount ?? 0) > 0 && (
                  <PriceRow
                    label="Savings"
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
          {document.included_services.length > 0 && (
            <IncludedServicesPanel services={document.included_services} accent={accent} />
          )}
          {document.price.payment_schedule?.length ? (
            <div className="mt-12 border-t border-slate-200/80 pt-10">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Your payment journey
              </p>
              <h3 className="mt-2 text-xl font-semibold">Payment milestones</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Payments are organized around your confirmed clinic visits.
              </p>
              <div className="relative mt-6 grid gap-4 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-slate-200 sm:grid-cols-2 sm:before:hidden">
                {document.price.payment_schedule.map((payment, index) => {
                  const journeyStep = document.journey[index];
                  return (
                    <div
                      key={`${payment.label}-${payment.due}`}
                      className="print-row relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <span className="z-10 grid size-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {payment.label}
                          </p>
                          <p className="mt-1 font-medium text-slate-700">
                            {journeyStep?.title ?? "Planned treatment stage"}
                          </p>
                          <p className="mt-3 text-xl font-semibold">
                            {formatQuoteMoney(payment.amount, document.price.currency)}
                          </p>
                          <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                            <CalendarCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            This payment is scheduled {payment.due.toLowerCase()}.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : document.price.payment_schedule_valid === false ? (
            <p className="mt-5 rounded-lg bg-slate-100 p-3 text-sm text-muted-foreground">
              The clinic will confirm the visit payment schedule before treatment begins.
            </p>
          ) : null}
        </section>
        {document.patient_notes.length > 0 && (
          <section id="important-information" className="shared-section py-8 sm:py-10">
            <Alert className="rounded-2xl border-slate-200 bg-slate-50/70 px-5 py-4 text-slate-700">
              <ShieldCheck className="size-4" />
              <AlertTitle className="font-medium">Important Information</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                  {document.patient_notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </section>
        )}
        {faqs.length > 0 && (
          <section
            id="faq"
            className="shared-section -mx-4 scroll-mt-24 bg-slate-100/70 px-4 py-10 sm:-mx-6 sm:px-6 sm:py-16"
          >
            <div className="mx-auto max-w-4xl">
              <SectionHeading
                eyebrow="Your questions"
                title="Frequently Asked Questions"
                description="Answers selected for the confirmed treatments in your plan."
              />
              <Accordion
                type="single"
                collapsible
                className="mt-7 rounded-3xl bg-white px-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 sm:px-7"
              >
                {faqs.map((faq) => (
                  <AccordionItem key={faq.question} value={faq.id}>
                    <AccordionTrigger className="text-left text-base hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="max-w-3xl pb-5 text-sm leading-6 text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}
        <section id="next-steps" className="shared-section scroll-mt-24 py-10 sm:py-16">
          <Card className="print-card print-cta overflow-hidden rounded-3xl border-0 bg-slate-900 text-white shadow-[0_30px_70px_-36px_rgba(15,23,42,0.8)]">
            <CardContent className="relative p-7 text-center sm:p-14">
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
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                    Your next step
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">
                    Ready to move forward with confidence?
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
                    Accepting confirms that you would like the clinic to continue. Your coordinator
                    will then contact you to confirm dates, final checks and the next practical
                    steps.
                  </p>
                  <div className="no-print mx-auto mt-7 flex max-w-2xl flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                    {!preview && plan.status === "viewed" && (
                      <Button
                        className="min-h-11 px-6 shadow-lg sm:min-w-52"
                        style={{ background: accent }}
                        onClick={() => markAccepted(plan.id, plan.clinic_id)}
                      >
                        Accept & Continue
                      </Button>
                    )}
                    {document.clinic?.phone && (
                      <Button asChild variant="secondary" className="min-h-11 px-6 sm:min-w-44">
                        <a href={`tel:${document.clinic.phone.replace(/\s/g, "")}`}>
                          <Phone /> Contact Clinic
                        </a>
                      </Button>
                    )}
                    {document.clinic?.email && (
                      <Button
                        asChild
                        variant="ghost"
                        className="min-h-11 text-white/80 hover:bg-white/10 hover:text-white"
                      >
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
                  <p className="mt-6 flex items-center justify-center gap-2 text-xs text-white/60">
                    <HeartHandshake className="size-4" aria-hidden="true" />
                    Your decision is recorded here; no payment is taken on this page.
                  </p>
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
    <header className="shared-hero relative overflow-hidden bg-slate-950 text-white">
      <div
        className="absolute inset-x-0 top-0 z-20 h-1"
        style={{
          background:
            "linear-gradient(90deg, var(--shared-primary), var(--shared-secondary), var(--shared-accent))",
        }}
      />
      <div className="absolute inset-0">
        {clinic.banner_url && (
          <img src={clinic.banner_url} alt="" className="size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-slate-950/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/35 to-slate-950/85" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/45 to-transparent" />
      </div>
      <div className="relative mx-auto flex min-h-80 max-w-6xl flex-col items-center justify-end px-4 py-10 text-center sm:min-h-96 sm:px-6 sm:py-14">
        <div className="no-print absolute right-4 top-7 flex gap-2 sm:right-6">
          <Button
            size="sm"
            className="border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
            onClick={() => window.print()}
          >
            <Printer />
            Print
          </Button>
          {clinic.website && (
            <Button
              size="sm"
              className="border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
              asChild
            >
              <a href={clinic.website} target="_blank" rel="noreferrer">
                <ExternalLink />
                Website
              </a>
            </Button>
          )}
        </div>
        {clinic.logo_url ? (
          <img
            src={clinic.logo_url}
            alt={`${clinic.name} logo`}
            className="mb-6 h-auto max-h-16 w-auto max-w-44 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)] sm:max-h-20 sm:max-w-56"
          />
        ) : (
          <span
            className="mb-6 grid size-16 place-items-center rounded-full border border-white/25 text-2xl font-semibold text-white shadow-xl backdrop-blur-md sm:size-20"
            style={{ background: "color-mix(in srgb, var(--shared-primary) 80%, transparent)" }}
            aria-label={`${clinic.name} logo fallback`}
          >
            {clinic.name.charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">
            {clinic.name}
          </p>
          {clinic.tagline && (
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              {clinic.tagline}
            </p>
          )}
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Treatment Plan & Cost Estimate
          </h1>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-white/70 sm:text-sm">
            <span className="font-medium text-white">
              Prepared for {document.patient_name ?? "Patient"}
            </span>
            <span aria-hidden="true">•</span>
            <span>{new Date(document.prepared_at).toLocaleDateString()}</span>
            <span aria-hidden="true">•</span>
            <span>Ref. {document.reference}</span>
          </div>
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
      className="no-print sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2.5 sm:justify-center sm:px-6">
        {items.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant="ghost"
            className={
              active === item.id
                ? "text-white shadow-sm hover:text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }
            style={active === item.id ? { background: "var(--shared-primary)" } : undefined}
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
function TreatmentExperience({
  document,
}: {
  document: ReturnType<typeof mapTreatmentPlanToPatientDocument>;
}) {
  const [open, setOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(document.treatment_groups[0]?.id);
  const [activeTooth, setActiveTooth] = useState<ToothNumber>();
  const [toothChoices, setToothChoices] = useState<PatientTreatmentGroup[]>([]);
  const [toothSelectorOpen, setToothSelectorOpen] = useState(false);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const activeGroup =
    document.treatment_groups.find((group) => group.id === activeGroupId) ??
    document.treatment_groups[0];
  const explanation = document.treatment_explanations.find((item) => item.id === activeGroup?.id);
  const openTreatment = (group: PatientTreatmentGroup, trigger?: HTMLElement) => {
    lastTrigger.current = trigger ?? null;
    setActiveGroupId(group.id);
    setActiveTooth(undefined);
    setToothChoices([]);
    setToothSelectorOpen(false);
    setOpen(true);
  };
  const selectTooth = (tooth: ToothNumber) => {
    setActiveTooth(tooth);
    const matches = document.treatment_groups.filter((group) => group.teeth.includes(tooth));
    if (matches.length === 1) {
      setActiveGroupId(matches[0].id);
      setToothChoices([]);
      setToothSelectorOpen(false);
    } else if (matches.length > 1) {
      setToothChoices(matches);
      setToothSelectorOpen(true);
    }
  };
  return (
    <>
      <div className="mt-8">
        {document.treatment_groups.length ? (
          <PatientTreatmentTable
            groups={document.treatment_groups}
            currency={document.price.currency}
            onOpen={openTreatment}
          />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">
            The clinic has not added confirmed treatment items yet.
          </p>
        )}
      </div>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) requestAnimationFrame(() => lastTrigger.current?.focus());
        }}
      >
        {open && activeGroup && (
          <DialogContent className="max-h-[94vh] w-[calc(100%-1rem)] max-w-5xl overflow-hidden rounded-3xl border-slate-200/80 p-4 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.5)] sm:p-8">
            <DialogHeader className="border-b border-slate-200/80 pb-6 pr-8">
              <div className="mb-4 text-slate-700">
                <span
                  className="grid size-14 place-items-center rounded-2xl bg-slate-100 ring-1 ring-slate-200/70"
                  style={{ color: "var(--shared-accent)" }}
                >
                  {(() => {
                    const Icon = treatmentIcon(activeGroup.treatment);
                    return <Icon className="size-6" aria-hidden="true" />;
                  })()}
                </span>
              </div>
              <DialogTitle aria-live="polite" className="text-2xl tracking-[-0.03em] sm:text-3xl">
                {activeGroup.label}
              </DialogTitle>
              <DialogDescription className="max-w-2xl leading-6">
                Your plan includes {activeGroup.quantity} {activeGroup.label.toLowerCase()}
                {activeGroup.quantity === 1 ? " treatment" : " treatments"}
                {activeGroup.teeth.length
                  ? ` across ${activeGroup.teeth.length} treated ${activeGroup.teeth.length === 1 ? "area" : "areas"}`
                  : ""}
                . Use the diagram to explore where this treatment applies.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[68vh] pr-2 sm:pr-3">
              <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-start">
                {explanation && (
                  <div className="order-1 lg:col-start-2 lg:row-start-1">
                    <Accordion
                      type="single"
                      collapsible
                      defaultValue="what"
                      className="rounded-2xl border border-slate-200/80 bg-white px-5"
                    >
                      <TreatmentInfoItem value="what" title="What is it?">
                        {explanation.what_it_is}
                      </TreatmentInfoItem>
                      <TreatmentInfoItem value="why" title="Why is it included?">
                        {explanation.plan_context}
                      </TreatmentInfoItem>
                      <TreatmentInfoItem value="how" title="How will it be done?">
                        <p>{explanation.how_performed}</p>
                        <p className="mt-3 border-t pt-3">{explanation.important_to_know}</p>
                      </TreatmentInfoItem>
                      <TreatmentInfoItem value="timing" title="Healing & Visits">
                        {explanation.healing_and_visits}
                      </TreatmentInfoItem>
                    </Accordion>
                  </div>
                )}
                {document.diagrams && (
                  <div className="order-2 min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
                    <DialogSection label="Where this treatment applies">
                      <p className="mb-4 text-sm text-muted-foreground">
                        Select a treated tooth to view the care planned for that area.
                      </p>
                      <DentalDiagramTabs
                        diagrams={document.diagrams}
                        selected={
                          activeTooth ? [activeTooth] : (activeGroup.teeth as ToothNumber[])
                        }
                        onSelect={selectTooth}
                      />
                      {toothChoices.length > 1 && (
                        <Popover open={toothSelectorOpen} onOpenChange={setToothSelectorOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="mt-4 min-h-11">
                              Treatments on this tooth
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-72 p-0">
                            <Command>
                              <CommandList>
                                <CommandGroup
                                  heading={
                                    activeTooth
                                      ? `Treatments on tooth ${activeTooth}`
                                      : "Choose treatment"
                                  }
                                >
                                  {toothChoices.map((group) => (
                                    <CommandItem
                                      key={group.id}
                                      value={group.label}
                                      onSelect={() => {
                                        setActiveGroupId(group.id);
                                        setToothChoices([]);
                                        setToothSelectorOpen(false);
                                      }}
                                    >
                                      <span className="flex-1">{group.label}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {group.quantity} units
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </DialogSection>
                  </div>
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="border-t border-slate-200/80 pt-5">
              <DialogClose asChild>
                <Button variant="outline" className="min-w-44">
                  Back to Treatment Plan
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function PatientTreatmentTable({
  groups,
  currency,
  onOpen,
}: {
  groups: PatientTreatmentGroup[];
  currency: ReturnType<typeof mapTreatmentPlanToPatientDocument>["price"]["currency"];
  onOpen: (group: PatientTreatmentGroup, trigger?: HTMLElement) => void;
}) {
  const categories = useMemo(() => {
    const grouped = new Map<string, PatientTreatmentGroup[]>();
    groups.forEach((group) => {
      grouped.set(group.category, [...(grouped.get(group.category) ?? []), group]);
    });
    return [...grouped.entries()];
  }, [groups]);
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/80">
      <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12 px-6">Treatment</TableHead>
              <TableHead className="h-12 text-center">Units</TableHead>
              <TableHead className="h-12 text-right">Unit Price</TableHead>
              <TableHead className="h-12 text-right">Total</TableHead>
              <TableHead className="h-12 px-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(([category, categoryGroups]) => (
              <TreatmentCategoryRows
                key={category}
                category={category}
                groups={categoryGroups}
                currency={currency}
                onOpen={onOpen}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="divide-y md:hidden">
        {categories.map(([category, categoryGroups]) => (
          <section key={category} aria-labelledby={`category-${normalizeDomId(category)}`}>
            <h3
              id={`category-${normalizeDomId(category)}`}
              className="border-l-4 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600"
              style={{ borderColor: "var(--shared-accent)", background: "#f8fafc" }}
            >
              {category}
            </h3>
            <div className="divide-y">
              {categoryGroups.map((group) => (
                <div key={group.id} className="print-row p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{group.label}</p>
                    <Badge variant="secondary">{group.quantity} units</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <PriceFact
                      label="Per unit"
                      value={formatQuoteMoney(group.unit_price, currency)}
                    />
                    <PriceFact
                      label="Total"
                      value={formatQuoteMoney(group.total, currency)}
                      strong
                    />
                  </div>
                  <Button
                    className="no-print mt-4 min-h-11 w-full justify-between"
                    variant="outline"
                    aria-label={`View details for ${group.label}`}
                    onClick={(event) => onOpen(group, event.currentTarget)}
                  >
                    View details <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function TreatmentCategoryRows({
  category,
  groups,
  currency,
  onOpen,
}: {
  category: string;
  groups: PatientTreatmentGroup[];
  currency: ReturnType<typeof mapTreatmentPlanToPatientDocument>["price"]["currency"];
  onOpen: (group: PatientTreatmentGroup, trigger?: HTMLElement) => void;
}) {
  return (
    <>
      <TableRow
        className="border-l-4 bg-slate-50/80 hover:bg-slate-50/80"
        style={{ borderLeftColor: "var(--shared-accent)" }}
      >
        <TableCell
          colSpan={5}
          className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600"
        >
          {category}
        </TableCell>
      </TableRow>
      {groups.map((group) => (
        <TableRow key={group.id} className="print-row hover:bg-slate-50/60">
          <TableCell className="px-6 py-4 font-medium">{group.label}</TableCell>
          <TableCell className="py-4 text-center">{group.quantity}</TableCell>
          <TableCell className="py-4 text-right text-slate-600">
            {formatQuoteMoney(group.unit_price, currency)}
          </TableCell>
          <TableCell className="py-4 text-right font-semibold">
            {formatQuoteMoney(group.total, currency)}
          </TableCell>
          <TableCell className="px-6 py-4 text-right">
            <Button
              className="no-print"
              variant="ghost"
              size="sm"
              aria-label={`View details for ${group.label}`}
              onClick={(event) => onOpen(group, event.currentTarget)}
            >
              View details <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function normalizeDomId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function DialogSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      {children}
    </section>
  );
}

function TreatmentInfoItem({
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
      <AccordionTrigger className="min-h-12 text-left font-medium hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="pb-5 text-sm leading-6 text-muted-foreground">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

function PriceFact({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 ${strong ? "text-lg font-semibold" : "font-medium"}`}>{value}</p>
    </div>
  );
}
function DentalDiagramTabs({
  diagrams,
  selected,
  onSelect,
}: {
  diagrams: NonNullable<ReturnType<typeof mapTreatmentPlanToPatientDocument>["diagrams"]>;
  selected: ToothNumber[];
  onSelect: (tooth: ToothNumber) => void;
}) {
  return (
    <Tabs defaultValue="proposed">
      <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/60">
        <TabsTrigger value="current">Current Condition</TabsTrigger>
        <TabsTrigger value="proposed">Proposed Treatment</TabsTrigger>
      </TabsList>
      <TabsContent
        value="current"
        className="mt-5 rounded-2xl bg-white p-2 ring-1 ring-slate-200/70 sm:p-4"
      >
        <DentalChart
          title="Current dental condition"
          mode="current"
          currentConditions={diagrams.currentConditions}
          proposedTreatments={diagrams.proposedTreatments}
          selected={selected}
          readOnly
          allowReadOnlySelection
          onSelect={(tooth) => onSelect(tooth)}
        />
      </TabsContent>
      <TabsContent
        value="proposed"
        className="mt-5 rounded-2xl bg-white p-2 ring-1 ring-slate-200/70 sm:p-4"
      >
        <DentalChart
          title="Proposed Treatment"
          mode="proposed"
          currentConditions={diagrams.currentConditions}
          proposedTreatments={diagrams.proposedTreatments}
          selected={selected}
          readOnly
          allowReadOnlySelection
          onSelect={(tooth) => onSelect(tooth)}
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
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
      <h2
        className={`mt-3 font-semibold tracking-[-0.03em] ${compact ? "text-2xl" : "text-2xl sm:text-4xl"}`}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          {description}
        </p>
      )}
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

function HotelCarousel({
  images,
  hotelName,
}: {
  images: Array<{ id: string; name: string; data_url?: string }>;
  hotelName: string;
}) {
  const visibleImages = images.filter(
    (image): image is { id: string; name: string; data_url: string } => Boolean(image.data_url),
  );
  if (!visibleImages.length) return null;
  return (
    <Carousel opts={{ loop: visibleImages.length > 1 }} aria-label={`${hotelName} photos`}>
      <CarouselContent className="ml-0">
        {visibleImages.map((image, index) => (
          <CarouselItem key={image.id} className="pl-0">
            <img
              src={image.data_url}
              alt={`${hotelName}, photo ${index + 1}`}
              className="aspect-[4/3] w-full object-cover sm:aspect-[16/7]"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      {visibleImages.length > 1 && (
        <>
          <CarouselPrevious className="no-print left-4 border-white/30 bg-slate-950/60 text-white hover:bg-slate-950/80 hover:text-white" />
          <CarouselNext className="no-print right-4 border-white/30 bg-slate-950/60 text-white hover:bg-slate-950/80 hover:text-white" />
        </>
      )}
    </Carousel>
  );
}

function IncludedServicesPanel({ services, accent }: { services: string[]; accent: string }) {
  return (
    <div className="mt-12 border-t border-slate-200/80 pt-10">
      <SectionHeading
        eyebrow="Included services"
        title="What Your Plan Includes"
        description="Your confirmed services, grouped so you can see what is covered at a glance."
        compact
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groupIncludedServices(services).map((group) => (
          <div
            key={group.label}
            className="print-row min-w-0 rounded-2xl bg-slate-50/70 p-5 ring-1 ring-slate-200/70 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
                <ServiceGroupIcon label={group.label} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Included
                </p>
                <h3 className="mt-0.5 font-semibold">{group.label}</h3>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {group.services.map((service) => (
                <p key={service} className="flex gap-2.5 text-sm leading-6 text-slate-700">
                  <span
                    className="mt-2.5 size-1.5 shrink-0 rounded-full"
                    style={{ background: accent }}
                    aria-hidden="true"
                  />
                  {service}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type TreatmentFaq = { id: string; question: string; answer: string };
const FAQ_BY_TREATMENT: Partial<Record<ToothTreatment, Array<Omit<TreatmentFaq, "id">>>> = {
  implant: [
    {
      question: "How painful is implant treatment?",
      answer:
        "Implant placement is normally performed with local anaesthetic. Some temporary tenderness or swelling can occur afterwards, and your clinic will provide medication and aftercare guidance appropriate to your case.",
    },
    {
      question: "How long does implant healing take?",
      answer:
        "Healing time varies with bone quality, general health and the procedure performed. Follow the healing period shown in your Treatment Journey; your dentist will confirm readiness before the final restoration.",
    },
    {
      question: "Will I have temporary teeth while implants heal?",
      answer:
        "Temporary teeth depend on your clinical situation and the treatment sequence. Your clinic will confirm the temporary solution included in your plan before treatment begins.",
    },
  ],
  crown: [
    {
      question: "Will my teeth need to be prepared for crowns?",
      answer:
        "A crown usually requires controlled preparation so it can fit securely and protect the tooth. The amount varies by tooth condition, material and clinical objective.",
    },
    {
      question: "How long can dental crowns last?",
      answer:
        "Longevity varies with oral hygiene, bite forces, habits and regular dental care. Your clinic will explain how to protect the restorations planned for you.",
    },
  ],
  veneer: [
    {
      question: "Will veneers stain?",
      answer:
        "Ceramic veneers are generally resistant to staining, although natural teeth and the surrounding margins can still be affected by diet, smoking and oral hygiene.",
    },
    {
      question: "How should I care for veneers?",
      answer:
        "Use normal brushing, interdental cleaning and regular dental reviews. Avoid using your teeth to open objects and follow any bite-protection advice from your dentist.",
    },
  ],
  extraction: [
    {
      question: "What should I expect after an extraction?",
      answer:
        "Temporary soreness and swelling are common. Your clinic will explain how to protect the area, what to eat and which symptoms require contact during healing.",
    },
  ],
  root_canal: [
    {
      question: "Is root canal treatment painful?",
      answer:
        "Treatment is normally carried out with local anaesthetic. The tooth may feel tender afterwards, but the aim is to remove the source of infection or inflammation and preserve the tooth.",
    },
  ],
  bridge: [
    {
      question: "How do I clean around a dental bridge?",
      answer:
        "A bridge needs daily cleaning around and underneath the replacement tooth. Your clinic can demonstrate suitable floss or interdental aids for the bridge planned for you.",
    },
  ],
  pontic: [
    {
      question: "How do I clean underneath a replacement tooth?",
      answer:
        "The space underneath a fixed replacement tooth needs daily cleaning. Your clinic can demonstrate suitable floss or interdental aids for your restoration.",
    },
  ],
  composite: [
    {
      question: "How should I care for composite restorations?",
      answer:
        "Brush and clean between the teeth normally, and avoid biting very hard objects. Composite can wear or stain over time, so regular dental reviews remain important.",
    },
  ],
  filling: [
    {
      question: "How long can a filling last?",
      answer:
        "Longevity varies with the size and position of the filling, bite forces, oral hygiene and diet. Your dentist will explain how to protect the restored tooth.",
    },
  ],
  bone_graft: [
    {
      question: "Why might a bone graft be needed?",
      answer:
        "A graft may be used when additional bone support is needed for predictable implant placement. Your dentist will confirm the graft area and expected healing period.",
    },
  ],
  sinus_lift: [
    {
      question: "What is the purpose of a sinus lift?",
      answer:
        "A sinus lift creates additional bone support in the upper back jaw when the existing height is not sufficient for the planned implant treatment.",
    },
  ],
  whitening: [
    {
      question: "Can whitening cause sensitivity?",
      answer:
        "Temporary sensitivity can occur. Use the products exactly as directed and tell your clinic if sensitivity is strong or continues longer than expected.",
    },
  ],
  denture: [
    {
      question: "Will a new denture need an adjustment period?",
      answer:
        "Most patients need time to adapt to speaking and eating with a new denture. Small adjustments may be required as your mouth settles.",
    },
  ],
};

function buildTreatmentFaq(groups: PatientTreatmentGroup[]): TreatmentFaq[] {
  const result: TreatmentFaq[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    if (!group.treatment) continue;
    const entries = FAQ_BY_TREATMENT[group.treatment] ?? [];
    for (const [index, entry] of entries.entries()) {
      if (seen.has(entry.question)) continue;
      seen.add(entry.question);
      result.push({ id: `${group.treatment}-${index}`, ...entry });
      if (result.length === 5) return result;
    }
  }
  return result;
}
const TREATMENT_ICONS: Partial<Record<ToothTreatment, LucideIcon>> = {
  implant: CircleDot,
  crown: Crown,
  extraction: Activity,
  bridge: Link2,
  pontic: Link2,
  veneer: Sparkles,
  composite: Sparkles,
  filling: CircleDot,
  root_canal: Activity,
  bone_graft: Bone,
  sinus_lift: Bone,
  whitening: Sparkles,
  denture: Crown,
};
function treatmentIcon(treatment?: ToothTreatment): LucideIcon {
  return (treatment && TREATMENT_ICONS[treatment]) || Stethoscope;
}
function ServiceGroupIcon({ label }: { label: string }) {
  const Icon = label === "Clinical" ? Stethoscope : label === "Travel" ? Plane : HeartHandshake;
  return <Icon className="size-5" aria-hidden="true" />;
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
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-10">
        <p className="flex max-w-3xl gap-2 leading-5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-500" />
          {document.disclaimer}
        </p>
        <p className="shrink-0 sm:text-right">Plan reference {document.reference}</p>
      </div>
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
