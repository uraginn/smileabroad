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
import {
  usePlannerAssetUrl,
  usePlannerAssetUrlMap,
} from "@/features/dentalplan/adapters/plannerAssetStorage";
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { PageLoading } from "@/components/ui-bits";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const brandingLogoUrl = usePlannerAssetUrl(
    branding?.logo_asset_id,
    branding?.logo_url ?? branding?.shared_view_logo_url,
  );
  const resolvedBranding = useMemo(
    () => (branding ? { ...branding, logo_url: brandingLogoUrl ?? branding.logo_url } : undefined),
    [branding, brandingLogoUrl],
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
            resolvedBranding,
            coordinator,
            treatmentDefinitions,
          )
        : undefined,
    [plan, clinic, patient, resolvedBranding, coordinator, treatmentDefinitions],
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
            ...(document.diagrams ? [{ id: "treatment-diagram", label: "Treatment Diagram" }] : []),
            { id: "journey", label: "Journey" },
            ...(document.travel ? [{ id: "travel", label: "Travel" }] : []),
            { id: "investment", label: "Investment" },
            ...(faqs.length ? [{ id: "faq", label: "FAQ" }] : []),
            ...(document.patient_notes.length
              ? [{ id: "important-information", label: "Important Information" }]
              : []),
            { id: "next-steps", label: "Next Steps" },
          ]
        : [],
    [document, faqs.length],
  );
  if (!hydrated || (preview && !authHydrated))
    return <PageLoading label="Loading Treatment Plan" />;
  if (!plan || !document) return <SafeNotFound />;
  const accent = document.clinic?.accent_color ?? "#C8A46A";
  const primary = document.clinic?.primary_color ?? accent;
  const secondary = document.clinic?.secondary_color ?? "#415469";
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
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
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
                A personal note for you
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Prepared specifically for {document.patient_name?.split(" ")[0] ?? "you"}
              </h2>
              <p className="mt-4 whitespace-pre-line text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {document.clinic?.introduction ??
                  "This personalized Treatment Plan brings together the information you need to understand your proposed care and decide on your next step."}
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
      </div>
      <SectionNavigation items={nav} />
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
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
          id="investment"
          className="shared-section -mx-4 scroll-mt-24 bg-white px-4 py-10 sm:-mx-6 sm:px-6 sm:py-16"
        >
          <SectionHeading
            eyebrow="Your investment"
            title="Your Treatment Investment"
            description="Your total, included services and payment schedule in one place."
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
                Payment schedule
              </p>
              <h3 className="mt-2 text-xl font-semibold">Payment milestones</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Payments are organized around your confirmed clinic visits.
              </p>
              <div className="relative mt-6 grid gap-4 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-slate-200 sm:grid-cols-2 sm:before:hidden">
                {document.price.payment_schedule.map((payment, index) => {
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
        <div className="absolute inset-x-0 top-0 h-[72%] bg-gradient-to-b from-white via-white/95 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/70" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/55 to-transparent" />
      </div>
      <div className="relative mx-auto flex min-h-80 max-w-6xl flex-col items-center justify-end px-4 py-10 text-center sm:min-h-96 sm:px-6 sm:py-14">
        <div className="no-print absolute right-4 top-7 flex gap-2 sm:right-6">
          <Button
            size="sm"
            className="border-slate-900/10 bg-slate-950/70 text-white shadow-lg backdrop-blur-md hover:bg-slate-950/85"
            onClick={() => window.print()}
          >
            <Printer />
            Print
          </Button>
          {clinic.website && (
            <Button
              size="sm"
              className="border-slate-900/10 bg-slate-950/70 text-white shadow-lg backdrop-blur-md hover:bg-slate-950/85"
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
            className="mb-8 h-auto max-h-48 w-auto max-w-[min(100%,33rem)] object-contain sm:max-h-60 sm:max-w-[42rem]"
            style={{ filter: "drop-shadow(0 2px 3px rgba(15,23,42,0.45))" }}
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
  const [activeGroupId, setActiveGroupId] = useState(document.treatment_groups[0]?.id);
  const [activeTooth, setActiveTooth] = useState<ToothNumber>();
  const [toothChoices, setToothChoices] = useState<PatientTreatmentGroup[]>([]);
  const [toothSelectorOpen, setToothSelectorOpen] = useState(false);
  const viewerRef = useRef<HTMLElement | null>(null);
  const toothAnchorRef = useRef<HTMLButtonElement | null>(null);
  const activeGroup =
    document.treatment_groups.find((group) => group.id === activeGroupId) ??
    document.treatment_groups[0];
  const explanation = document.treatment_explanations.find((item) => item.id === activeGroup?.id);
  const focusViewer = () =>
    requestAnimationFrame(() => {
      viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      viewerRef.current?.focus({ preventScroll: true });
    });
  const selectTreatment = (group: PatientTreatmentGroup, moveToViewer = false) => {
    setActiveGroupId(group.id);
    setActiveTooth(undefined);
    setToothChoices([]);
    setToothSelectorOpen(false);
    toothAnchorRef.current = null;
    if (moveToViewer) focusViewer();
  };
  const selectTooth = (tooth: ToothNumber, anchor?: HTMLButtonElement) => {
    setActiveTooth(tooth);
    toothAnchorRef.current = anchor ?? null;
    const matches = document.treatment_groups.filter((group) => group.teeth.includes(tooth));
    if (matches.length === 1) {
      const changedTreatment = matches[0].id !== activeGroup?.id;
      setActiveGroupId(matches[0].id);
      setToothChoices([]);
      setToothSelectorOpen(false);
      if (changedTreatment) focusViewer();
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
            activeGroupId={activeGroup?.id}
            onSelect={(group) => selectTreatment(group, true)}
          />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">
            The clinic has not added confirmed treatment items yet.
          </p>
        )}
      </div>
      {activeGroup && explanation && (
        <section
          id="treatment-viewer"
          ref={viewerRef}
          tabIndex={-1}
          aria-labelledby="active-treatment-title"
          className="mt-8 scroll-mt-24 outline-none"
        >
          <TreatmentEncyclopedia group={activeGroup} explanation={explanation} />
        </section>
      )}
      {document.diagrams && activeGroup && (
        <section id="treatment-diagram" className="shared-section scroll-mt-24 py-10 sm:py-12">
          <SectionHeading
            eyebrow="Explore your plan"
            title="Treatment Diagram"
            description="Select a treated tooth to explore the treatment planned for that area."
          />
          <div className="mt-8 space-y-6">
            <PatientDentalDiagram
              title="Current Condition"
              mode="current"
              diagrams={document.diagrams}
              selected={activeTooth ? [activeTooth] : (activeGroup.teeth as ToothNumber[])}
              onSelect={selectTooth}
            />
            <PatientDentalDiagram
              title="Proposed Treatment"
              mode="proposed"
              diagrams={document.diagrams}
              selected={activeTooth ? [activeTooth] : (activeGroup.teeth as ToothNumber[])}
              onSelect={selectTooth}
            />
          </div>
          {toothChoices.length > 1 && (
            <Popover open={toothSelectorOpen} onOpenChange={setToothSelectorOpen}>
              <PopoverAnchor virtualRef={toothAnchorRef as React.RefObject<HTMLButtonElement>} />
              <PopoverContent
                side="top"
                align="center"
                sideOffset={8}
                className="w-auto max-w-[calc(100vw-2rem)] rounded-full p-1.5"
              >
                <div
                  className="flex max-w-full flex-wrap items-center justify-center gap-1"
                  role="group"
                  aria-label={`Treatments for tooth ${activeTooth ?? "selected"}`}
                >
                  {toothChoices.map((group) => (
                    <Button
                      key={group.id}
                      type="button"
                      size="sm"
                      variant={group.id === activeGroup.id ? "secondary" : "ghost"}
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={() => {
                        setActiveGroupId(group.id);
                        setToothChoices([]);
                        setToothSelectorOpen(false);
                        focusViewer();
                      }}
                    >
                      {group.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </section>
      )}
    </>
  );
}

function PatientTreatmentTable({
  groups,
  currency,
  activeGroupId,
  onSelect,
}: {
  groups: PatientTreatmentGroup[];
  currency: ReturnType<typeof mapTreatmentPlanToPatientDocument>["price"]["currency"];
  activeGroupId?: string;
  onSelect: (group: PatientTreatmentGroup) => void;
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
                activeGroupId={activeGroupId}
                onSelect={onSelect}
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
                <div
                  key={group.id}
                  className={`print-row p-5 ${group.id === activeGroupId ? "bg-slate-50" : ""}`}
                  aria-current={group.id === activeGroupId ? "true" : undefined}
                >
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
                    onClick={() => onSelect(group)}
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
  activeGroupId,
  onSelect,
}: {
  category: string;
  groups: PatientTreatmentGroup[];
  currency: ReturnType<typeof mapTreatmentPlanToPatientDocument>["price"]["currency"];
  activeGroupId?: string;
  onSelect: (group: PatientTreatmentGroup) => void;
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
        <TableRow
          key={group.id}
          className={`print-row hover:bg-slate-50/60 ${group.id === activeGroupId ? "bg-slate-50" : ""}`}
          aria-current={group.id === activeGroupId ? "true" : undefined}
        >
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
              onClick={() => onSelect(group)}
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

function TreatmentEncyclopedia({
  group,
  explanation,
}: {
  group: PatientTreatmentGroup;
  explanation: ReturnType<
    typeof mapTreatmentPlanToPatientDocument
  >["treatment_explanations"][number];
}) {
  const Icon = treatmentIcon(group.treatment);
  return (
    <div className="grid overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.55)] ring-1 ring-slate-200/80 lg:min-h-[320px] lg:grid-cols-[0.85fr_1.35fr]">
      <div className="relative flex overflow-hidden bg-slate-950 px-6 py-7 text-white sm:px-8 lg:flex-col lg:justify-center">
        <div
          className="absolute -right-16 -top-20 size-56 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--shared-accent)" }}
          aria-hidden="true"
        />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-start">
          <span
            className="grid size-20 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur"
            aria-hidden="true"
          >
            <Icon className="size-10" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 max-w-md">
            <h2
              id="active-treatment-title"
              aria-live="polite"
              className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
            >
              {group.label}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300 sm:text-base">
              {explanation.short_summary}
            </p>
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <dl className="grid grid-cols-2 gap-x-6 border-b border-slate-200 pb-3">
          <TreatmentFact label="Category" value={group.category} />
          <TreatmentFact label="Visits" value={explanation.visits} />
          <TreatmentFact label="Healing" value={explanation.healing} />
          <TreatmentFact
            label="Included"
            value={`${group.quantity} planned ${group.quantity === 1 ? "unit" : "units"}`}
          />
        </dl>
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Learn about this treatment
          </p>
          <Accordion type="single" collapsible className="mt-1">
            <TreatmentInfoItem value="what" title="What is it?">
              {explanation.what_it_is}
            </TreatmentInfoItem>
            <TreatmentInfoItem value="why" title="Why is it included?">
              {explanation.plan_context}
            </TreatmentInfoItem>
            <TreatmentInfoItem value="how" title="How is it performed?">
              {explanation.how_performed}
            </TreatmentInfoItem>
            <TreatmentInfoItem value="healing" title="Healing & Aftercare">
              <p>{explanation.healing_and_visits}</p>
              <p className="mt-3">{explanation.important_to_know}</p>
            </TreatmentInfoItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}

function TreatmentFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 py-2">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold leading-5 text-slate-900" title={value}>
        {value}
      </dd>
    </div>
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
      <AccordionTrigger className="min-h-10 py-2 text-left text-sm font-medium hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="pb-4 text-sm leading-6 text-muted-foreground">
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
function PatientDentalDiagram({
  title,
  mode,
  diagrams,
  selected,
  onSelect,
}: {
  title: string;
  mode: "current" | "proposed";
  diagrams: NonNullable<ReturnType<typeof mapTreatmentPlanToPatientDocument>["diagrams"]>;
  selected: ToothNumber[];
  onSelect: (tooth: ToothNumber, anchor?: HTMLButtonElement) => void;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
      <DentalChart
        title={title}
        mode={mode}
        currentConditions={diagrams.currentConditions}
        proposedTreatments={diagrams.proposedTreatments}
        selected={selected}
        readOnly
        allowReadOnlySelection
        onSelect={(tooth, _additive, anchor) => onSelect(tooth, anchor)}
      />
    </div>
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
  images: Array<{ id: string; name: string; storage_key?: string; data_url?: string }>;
  hotelName: string;
}) {
  const assetUrls = usePlannerAssetUrlMap(images);
  const visibleImages = images
    .map((image) => ({ ...image, url: image.data_url ?? assetUrls[image.id] }))
    .filter((image): image is typeof image & { url: string } => Boolean(image.url));
  if (!visibleImages.length) return null;
  return (
    <Carousel opts={{ loop: visibleImages.length > 1 }} aria-label={`${hotelName} photos`}>
      <CarouselContent className="ml-0">
        {visibleImages.map((image, index) => (
          <CarouselItem key={image.id} className="pl-0">
            <img
              src={image.url}
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
      <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground sm:px-6 sm:py-10">
        <p className="flex max-w-3xl gap-2 leading-5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-500" />
          {document.disclaimer}
        </p>
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
