import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BedDouble,
  Building2,
  Bone,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Crown,
  Car,
  ExternalLink,
  HeartHandshake,
  Link2,
  Mail,
  Phone,
  Plane,
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
import { resolveSharedViewColors } from "@/lib/shared-view-colors";
import { DentalChart } from "@/features/dentalplan/components/DentalChart";
import { conditionByType } from "@/features/dentalplan/data/conditionDefinitions";
import { treatmentByType } from "@/features/dentalplan/data/treatmentDefinitions";
import {
  usePlannerAssetUrl,
  usePlannerAssetUrlMap,
} from "@/features/dentalplan/adapters/plannerAssetStorage";
import type {
  ConditionType,
  ToothNumber,
  ToothTreatment as PlannerToothTreatment,
} from "@/features/dentalplan";
import type { ClinicHotel, ToothTreatment as LegacyToothTreatment } from "@/types/models";
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
  const bundledClinicLogo = clinic?.id === "clinic_istanbul" ? "/dtkurt-logo.svg?v=2" : undefined;
  const configuredClinicLogo = branding?.logo_url ?? branding?.shared_view_logo_url;
  const clinicLogoFallback =
    configuredClinicLogo === "/dtkurt-logo.svg"
      ? bundledClinicLogo
      : (configuredClinicLogo ?? bundledClinicLogo);
  const brandingLogoUrl = usePlannerAssetUrl(branding?.logo_asset_id, clinicLogoFallback);
  const resolvedBranding = useMemo(
    () =>
      branding
        ? { ...branding, logo_url: brandingLogoUrl ?? branding.logo_url ?? bundledClinicLogo }
        : undefined,
    [branding, brandingLogoUrl, bundledClinicLogo],
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
  const users = useMockStore((s) => s.users);
  const assignedDentists = useMemo(() => {
    if (!plan) return [];
    const ids = [...(plan.dentist_ids ?? []), ...(plan.dentist_id ? [plan.dentist_id] : [])].filter(
      (id, index, values) => values.indexOf(id) === index,
    );
    return ids
      .map((id) => users.find((member) => member.id === id && member.clinic_id === plan.clinic_id))
      .filter((member): member is NonNullable<typeof member> => Boolean(member));
  }, [plan, users]);
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
            assignedDentists,
          )
        : undefined,
    [plan, clinic, patient, resolvedBranding, coordinator, treatmentDefinitions, assignedDentists],
  );
  const faqs = useMemo(
    () => (document ? buildTreatmentFaq(document.treatment_groups) : []),
    [document],
  );
  const nav = useMemo(
    () =>
      document
        ? [
            { id: "treatment-plan", label: "Your plan" },
            { id: "journey", label: "Your journey" },
            ...(document.travel || document.included_services.length
              ? [{ id: "visit-package", label: "Your visit" }]
              : []),
            { id: "investment", label: "Investment" },
            { id: "your-clinic", label: "Your clinic" },
            ...(faqs.length || document.patient_notes.length
              ? [{ id: "questions", label: "Good to know" }]
              : []),
            { id: "next-steps", label: "Next step" },
          ]
        : [],
    [document, faqs.length],
  );
  if (!hydrated || (preview && !authHydrated))
    return <PageLoading label="Loading Treatment Plan" />;
  if (!plan || !document) return <SafeNotFound />;
  const { primary, accent } = resolveSharedViewColors(
    document.clinic?.primary_color,
    document.clinic?.accent_color,
  );
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
          "--shared-accent": accent,
          "--palette-premium-gold": accent,
          "--primary": primary,
          "--primary-foreground": "#FFFFFF",
          "--secondary": "#E7ECF2",
          "--secondary-foreground": "#1A2332",
          "--accent": accent,
          "--accent-foreground": "#0A1626",
          "--warning": accent,
          "--ring": accent,
          "--sidebar-primary": primary,
        } as React.CSSProperties
      }
    >
      <style>{`.shared-plan [role="tab"][data-state="active"]{box-shadow:inset 0 -2px 0 var(--shared-accent)}@media print{@page{margin:14mm}.no-print,.journey-face{display:none!important}.shared-plan,.shared-section,.print-cta{background:#fff!important;color:#0f172a!important}.print-cta *{color:#0f172a!important}.print-card,.print-row,.payment-summary,.dental-preview{break-inside:avoid;box-shadow:none!important}.print-grid{display:block!important}.payment-summary{position:static!important;margin-bottom:1rem}.shared-section{scroll-margin-top:0!important;margin-block:1rem!important;padding-block:1rem!important}.shared-section>h2,.shared-section>div>h2{break-after:avoid}.shared-hero{min-height:10rem!important}.shared-hero img{max-height:9rem}.print-expand [data-state="closed"]+div{display:block!important;height:auto!important}.journey-card{height:auto!important}.journey-detail{position:relative!important;transform:none!important}.dental-preview{max-width:100%!important;overflow:hidden!important}.shared-plan a{text-decoration:none!important}}`}</style>
      <Header document={document} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section
          id="introduction"
          className="shared-section -mx-4 scroll-mt-24 border-b border-slate-200/80 bg-white px-4 py-3 sm:-mx-6 sm:px-6 sm:py-4"
        >
          <PatientWelcome document={document} primary={primary} />
        </section>
      </div>
      <SectionNavigation items={nav} />
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section id="treatment-plan" className="shared-section scroll-mt-24 py-10 sm:py-16">
          <SectionHeading
            title="Understand your treatment"
            description="See the treatment we have prepared for you and which teeth are involved."
          />
          <TreatmentExperience document={document} />
        </section>
        <section
          id="journey"
          className="shared-section -mx-4 scroll-mt-24 bg-white px-4 py-10 sm:-mx-6 sm:px-6 sm:py-16"
        >
          <SectionHeading
            title="A clear journey, step by step"
            description="Follow how we plan each stage of your care, including stays and healing where needed."
          />
          <div className="relative mt-6 space-y-3 before:absolute before:bottom-6 before:left-4 before:top-6 before:w-px before:bg-slate-200 sm:before:left-5 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 lg:before:hidden">
            {document.journey.map((step, index) => (
              <TreatmentJourneyCard key={step.id} step={step} index={index} primary={primary} />
            ))}
          </div>
        </section>
        {(document.travel || document.included_services.length > 0) && (
          <section
            id="visit-package"
            className="shared-section -mx-4 scroll-mt-24 bg-slate-100/70 px-4 py-10 sm:-mx-6 sm:px-6 sm:py-16"
          >
            <SectionHeading title="Your stay and support from our team" />
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)] lg:items-start">
              {document.travel?.hotel ? (
                <PatientHotelCard
                  hotel={document.travel.hotel}
                  nights={document.travel.nights}
                  configuredHotel={configuredHotel}
                  airportTransfer={plan.transfers_included === true}
                  hotelTransfer={Boolean(
                    plan.included_services?.some((service) =>
                      service.toLowerCase().includes("hotel transfer"),
                    ),
                  )}
                  accent={accent}
                />
              ) : (
                <VisitSupportCard />
              )}
              {document.included_services.length > 0 && (
                <IncludedServicesPanel
                  services={document.included_services}
                  accent={accent}
                  image={document.clinic?.patient_image_url ?? document.clinic?.logo_url}
                />
              )}
            </div>
          </section>
        )}
        <section
          id="investment"
          className="shared-section -mx-4 scroll-mt-24 bg-white px-4 py-10 sm:-mx-6 sm:px-6 sm:py-16"
        >
          <SectionHeading
            title="Your treatment cost"
            description="Review the estimate we have prepared and when each payment is expected."
          />
          <div
            className={`print-grid mt-8 grid gap-4 rounded-3xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-6 lg:items-stretch ${hasAdditionalCosts ? "lg:grid-cols-[minmax(0,1fr)_minmax(20rem,1fr)]" : "max-w-xl"}`}
          >
            {hasAdditionalCosts && (
              <div className="order-2 min-w-0 rounded-2xl bg-white p-5 ring-1 ring-slate-200/80 lg:order-1">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Additional costs
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">Travel and additional services</h3>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
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
            <aside className="payment-summary order-1 overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.7)] sm:p-6 lg:order-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                  <WalletCards className="size-5" aria-hidden="true" />
                </div>
              </div>
              <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                Final total
              </h3>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {formatQuoteMoney(document.price.total ?? 0, document.price.currency)}
              </p>
              <div className="mt-4 border-t border-white/15 pt-3 [&_span:first-child]:text-white/60">
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
          {document.price.payment_schedule?.length ? (
            <div className="mt-6 rounded-3xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Payment schedule
              </p>
              <h3 className="mt-2 text-xl font-semibold">Payment milestones</h3>
              <div className="relative mt-4 grid gap-3 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-slate-200 sm:grid-cols-2 sm:before:hidden">
                {document.price.payment_schedule.map((payment, index) => {
                  return (
                    <div
                      key={`${payment.label}-${payment.due}`}
                      className="print-row relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <span className="z-10 grid size-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-xs font-semibold text-white shadow-sm">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {payment.label}
                          </p>
                          <p className="mt-2 text-lg font-semibold">
                            {formatQuoteMoney(payment.amount, document.price.currency)}
                          </p>
                          <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
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
        <PatientClinicCard document={document} />
        {(faqs.length > 0 || document.patient_notes.length > 0) && (
          <section
            id="questions"
            className="shared-section -mx-4 scroll-mt-24 bg-slate-100/70 px-4 py-10 sm:-mx-6 sm:px-6 sm:py-16"
          >
            <div className="mx-auto max-w-4xl">
              <SectionHeading
                title="Answers before your next step"
                description="Treatment-specific guidance and important information from our clinical team."
              />
              {faqs.length > 0 && (
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
              )}
              {document.patient_notes.length > 0 && (
                <Alert className="mt-5 rounded-2xl border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm">
                  <ShieldCheck className="size-4" />
                  <AlertTitle className="font-medium">Important for your plan</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                      {document.patient_notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
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
                        style={{ background: primary }}
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
    <header className="shared-hero relative overflow-hidden bg-white text-slate-950">
      <div
        className="absolute inset-x-0 top-0 z-20 h-1"
        style={{
          background: "var(--shared-primary)",
        }}
      />
      <div className="absolute inset-0">
        {clinic.banner_url && (
          <img src={clinic.banner_url} alt="" className="size-full object-cover opacity-55" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/95 to-white/75" />
      </div>
      <div className="relative mx-auto flex min-h-[76svh] max-w-6xl flex-col items-center justify-center px-4 py-12 text-center sm:min-h-[70svh] sm:px-6 lg:min-h-[26rem] lg:py-12">
        {clinic.logo_url ? (
          <img
            src={clinic.logo_url}
            alt={`${clinic.name} logo`}
            className="h-auto max-h-44 w-[min(85vw,13.75rem)] object-contain sm:max-h-56 sm:w-[21.25rem] lg:max-h-80 lg:w-[42.5rem]"
          />
        ) : (
          <span
            className="grid size-14 place-items-center rounded-full text-xl font-semibold text-white sm:size-16"
            style={{ background: "var(--shared-primary)" }}
            aria-label={`${clinic.name} logo fallback`}
          >
            {clinic.name.charAt(0)}
          </span>
        )}
        <h1 className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-700 sm:text-base">
          {clinic.name}
        </h1>
      </div>
    </header>
  );
}

function PatientWelcome({
  document,
  primary,
}: {
  document: ReturnType<typeof mapTreatmentPlanToPatientDocument>;
  primary: string;
}) {
  const coordinator = document.coordinator;
  return (
    <article className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.5)] ring-1 ring-slate-200/80">
      <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <h2 className="text-base font-normal tracking-normal text-slate-800 sm:text-lg">
            {document.patient_name
              ? `Treatment plan for ${document.patient_name}`
              : "Your treatment plan"}
          </h2>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 pr-4 ring-1 ring-slate-200/70">
          {coordinator?.avatar_url ? (
            <img
              alt={coordinator.name}
              src={coordinator.avatar_url}
              className="size-10 rounded-full object-cover"
            />
          ) : document.clinic?.logo_url ? (
            <img
              alt=""
              src={document.clinic.logo_url}
              className="size-10 rounded-full bg-white object-contain p-1"
            />
          ) : (
            <span
              className="grid size-10 place-items-center rounded-full text-sm font-semibold text-white"
              style={{ background: primary }}
              aria-hidden="true"
            >
              {coordinator?.name.charAt(0) ?? document.clinic?.name.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Prepared by
            </p>
            <p className="truncate text-sm font-semibold text-slate-950">
              {coordinator?.name ?? document.clinic?.name}
            </p>
            <p className="truncate text-xs text-slate-500">
              {coordinator?.title ?? "Patient coordinator"}
            </p>
          </div>
        </div>
      </div>
    </article>
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
  const [toothMode, setToothMode] = useState<"current" | "proposed">("proposed");
  const [viewerMode, setViewerMode] = useState<"treatment" | "tooth">("treatment");
  const viewerRef = useRef<HTMLElement | null>(null);
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
    setViewerMode("treatment");
    if (moveToViewer) focusViewer();
  };
  const selectTooth = (tooth: ToothNumber, mode: "current" | "proposed") => {
    setActiveTooth(tooth);
    setToothMode(mode);
    setViewerMode("tooth");
    focusViewer();
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
      {((viewerMode === "treatment" && activeGroup && explanation) ||
        (viewerMode === "tooth" && activeTooth && document.diagrams)) && (
        <section
          id="treatment-viewer"
          ref={viewerRef}
          tabIndex={-1}
          aria-labelledby="active-treatment-title"
          className="mt-8 scroll-mt-24 outline-none"
        >
          {viewerMode === "tooth" && activeTooth && document.diagrams ? (
            <ToothEncyclopedia
              tooth={activeTooth}
              mode={toothMode}
              currentConditions={document.diagrams.currentConditions[activeTooth]?.conditions ?? []}
              proposedTreatments={document.diagrams.proposedTreatments.filter((treatment) =>
                treatment.toothNumbers.includes(activeTooth),
              )}
              relatedGroups={document.treatment_groups.filter((group) =>
                group.teeth.includes(activeTooth),
              )}
              explanations={document.treatment_explanations}
            />
          ) : activeGroup && explanation ? (
            <TreatmentEncyclopedia group={activeGroup} explanation={explanation} />
          ) : null}
        </section>
      )}
      {document.diagrams && (
        <section id="treatment-diagram" className="shared-section scroll-mt-24 py-10 sm:py-12">
          <Accordion type="single" collapsible>
            <AccordionItem
              value="treatment-diagram"
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white px-0 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.5)]"
            >
              <AccordionTrigger className="gap-4 px-5 py-5 text-left hover:no-underline sm:px-7 sm:py-6">
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
                  style={{ background: "var(--shared-primary)" }}
                  aria-hidden="true"
                >
                  <Stethoscope className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-slate-950 sm:text-lg">
                    Explore your treatment diagram
                  </span>
                  <span className="mt-1 block text-sm font-normal leading-5 text-slate-500">
                    Open the diagram and select a tooth to see its condition and planned care.
                  </span>
                </span>
                <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                  Interactive
                </Badge>
              </AccordionTrigger>
              <AccordionContent className="border-t border-slate-100 px-3 pb-4 pt-4 sm:px-6 sm:pb-6">
                <div className="space-y-5">
                  <PatientDentalDiagram
                    title="Current Condition"
                    mode="current"
                    diagrams={document.diagrams}
                    selected={
                      activeTooth ? [activeTooth] : ((activeGroup?.teeth ?? []) as ToothNumber[])
                    }
                    onSelect={(tooth) => selectTooth(tooth, "current")}
                  />
                  <PatientDentalDiagram
                    title="Proposed Treatment"
                    mode="proposed"
                    diagrams={document.diagrams}
                    selected={
                      activeTooth ? [activeTooth] : ((activeGroup?.teeth ?? []) as ToothNumber[])
                    }
                    onSelect={(tooth) => selectTooth(tooth, "proposed")}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
                    <p className="font-semibold">{treatmentQuantityLabel(group)}</p>
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
    <ToothdexShell
      icon={Icon}
      title={group.label}
      summary={explanation.short_summary}
      facts={[
        { label: "Category", value: group.category },
        { label: "Visits", value: explanation.visits },
        { label: "Healing", value: explanation.healing },
        { label: "Your treatment", value: treatmentQuantityLabel(group) },
      ]}
      sectionLabel="Learn about this treatment"
    >
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
    </ToothdexShell>
  );
}

function ToothEncyclopedia({
  tooth,
  mode,
  currentConditions,
  proposedTreatments,
  relatedGroups,
  explanations,
}: {
  tooth: ToothNumber;
  mode: "current" | "proposed";
  currentConditions: ConditionType[];
  proposedTreatments: PlannerToothTreatment[];
  relatedGroups: PatientTreatmentGroup[];
  explanations: ReturnType<typeof mapTreatmentPlanToPatientDocument>["treatment_explanations"];
}) {
  const anatomy = toothAnatomy(tooth);
  const conditionLabels = currentConditions.map((condition) => conditionByType(condition).label);
  const treatmentLabels = proposedTreatments.map(plannerTreatmentLabel);
  const relatedExplanations = explanations.filter((item) =>
    relatedGroups.some((group) => group.id === item.id),
  );
  const isCurrent = mode === "current";
  return (
    <ToothdexShell
      icon={CircleDot}
      title={`Tooth ${tooth}`}
      summary={`${anatomy.fullLabel}. ${isCurrent ? "Review the condition recorded by your clinic." : "Review every treatment layer planned for this tooth."}`}
      facts={[
        { label: "Tooth number", value: String(tooth) },
        { label: "Tooth type", value: anatomy.type },
        {
          label: "Current condition",
          value: conditionLabels.length ? conditionLabels.join(", ") : "No condition recorded",
        },
        {
          label: "Proposed care",
          value: treatmentLabels.length
            ? `${treatmentLabels.length} treatment${treatmentLabels.length === 1 ? "" : "s"}`
            : "No treatment recorded",
        },
      ]}
      sectionLabel={isCurrent ? "Understand this tooth" : "Understand the proposed care"}
    >
      {isCurrent ? (
        <>
          <TreatmentInfoItem value="recorded" title="What is recorded on this tooth?">
            {currentConditions.length ? (
              <ToothdexList
                items={currentConditions.map((condition) => ({
                  title: conditionByType(condition).label,
                  description: CONDITION_GUIDANCE[condition].meaning,
                }))}
              />
            ) : (
              "No specific current condition has been recorded for this tooth. Your clinic will confirm it during the clinical examination."
            )}
          </TreatmentInfoItem>
          <TreatmentInfoItem value="meaning" title="What does this mean?">
            {currentConditions.length
              ? currentConditions
                  .map((condition) => CONDITION_GUIDANCE[condition].patient)
                  .join(" ")
              : `${anatomy.type} teeth support normal biting and appearance in this area. The clinical examination confirms whether any care is needed.`}
          </TreatmentInfoItem>
          <TreatmentInfoItem value="planning" title="How can it affect treatment planning?">
            {currentConditions.length
              ? currentConditions
                  .map((condition) => CONDITION_GUIDANCE[condition].planning)
                  .join(" ")
              : "With no condition recorded, this tooth is not currently driving a specific treatment decision in the plan."}
          </TreatmentInfoItem>
          <TreatmentInfoItem value="next" title="What is planned next?">
            {treatmentLabels.length
              ? `Your clinic has linked ${formatNaturalList(treatmentLabels)} to tooth ${tooth}. Open the Proposed Treatment diagram to review these layers in Toothdex.`
              : "No proposed treatment is currently linked to this tooth. Your clinic will reassess it during the final examination."}
          </TreatmentInfoItem>
        </>
      ) : (
        <>
          <TreatmentInfoItem value="planned" title="What is planned for this tooth?">
            {proposedTreatments.length ? (
              <ToothdexList
                items={proposedTreatments.map((treatment) => ({
                  title: plannerTreatmentLabel(treatment),
                  description: plannerTreatmentDetail(treatment),
                }))}
              />
            ) : (
              "No proposed treatment is currently linked to this tooth."
            )}
          </TreatmentInfoItem>
          <TreatmentInfoItem value="reason" title="What is the clinical purpose?">
            {relatedExplanations.length
              ? relatedExplanations.map((item) => item.plan_context).join(" ")
              : conditionLabels.length
                ? `The planned care is considered alongside the recorded ${formatNaturalList(conditionLabels).toLowerCase()} on this tooth.`
                : "Your clinic will confirm the clinical purpose and final indication before treatment begins."}
          </TreatmentInfoItem>
          <TreatmentInfoItem value="layers" title="How do the treatment layers work together?">
            {proposedTreatments.length > 1
              ? `This tooth combines ${formatNaturalList(treatmentLabels)}. The clinic sequences these layers from preparation and support through to the final restoration.`
              : proposedTreatments.length === 1
                ? `${treatmentLabels[0]} is the only treatment layer currently assigned to tooth ${tooth}.`
                : "There are no treatment layers to sequence for this tooth."}
          </TreatmentInfoItem>
          <TreatmentInfoItem value="aftercare" title="Visits, healing & aftercare">
            {relatedExplanations.length
              ? relatedExplanations.map((item) => (
                  <div key={item.id} className="not-last:mb-3">
                    <p className="font-medium text-slate-800">{item.title}</p>
                    <p>{item.healing_and_visits}</p>
                    <p className="mt-1">{item.important_to_know}</p>
                  </div>
                ))
              : "The clinic will confirm visit timing, healing expectations and aftercare for this tooth after the final clinical examination."}
          </TreatmentInfoItem>
        </>
      )}
    </ToothdexShell>
  );
}

function ToothdexShell({
  icon: Icon,
  title,
  summary,
  facts,
  sectionLabel,
  children,
}: {
  icon: LucideIcon;
  title: string;
  summary: string;
  facts: Array<{ label: string; value: string }>;
  sectionLabel: string;
  children: React.ReactNode;
}) {
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
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base">{summary}</p>
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <dl className="grid grid-cols-2 gap-x-6 border-b border-slate-200 pb-3">
          {facts.map((fact) => (
            <TreatmentFact key={fact.label} {...fact} />
          ))}
        </dl>
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {sectionLabel}
          </p>
          <Accordion type="single" collapsible className="mt-1">
            {children}
          </Accordion>
        </div>
      </div>
    </div>
  );
}

function ToothdexList({ items }: { items: Array<{ title: string; description: string }> }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`}>
          <p className="font-medium text-slate-800">{item.title}</p>
          <p className="mt-0.5">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}

function TreatmentFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 py-2">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900" title={value}>
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

const CONDITION_GUIDANCE: Record<
  ConditionType,
  { meaning: string; patient: string; planning: string }
> = {
  healthy: {
    meaning: "The tooth is recorded without a specific active problem.",
    patient: "A healthy record means no condition currently needs to be highlighted on this tooth.",
    planning: "The clinic still verifies the tooth and surrounding gum before treatment begins.",
  },
  missing: {
    meaning: "There is no natural tooth present at this position.",
    patient: "A missing tooth can affect appearance, chewing and the stability of nearby teeth.",
    planning:
      "The space, bone and neighbouring teeth guide whether an implant, bridge or another replacement is suitable.",
  },
  "extraction-required": {
    meaning: "The clinic has recorded that this tooth may not be predictably retained.",
    patient:
      "Removal may be recommended when keeping the tooth would not provide a stable long-term result.",
    planning:
      "Extraction timing is coordinated with healing, grafting and any replacement treatment planned for this site.",
  },
  "existing-crown": {
    meaning: "This tooth already has a crown restoration.",
    patient: "The existing crown covers and protects the prepared tooth beneath it.",
    planning:
      "The clinic checks its fit, condition, colour and relationship with the new treatment plan.",
  },
  "existing-implant": {
    meaning: "An implant is already present at this tooth position.",
    patient: "The implant acts as an artificial root supporting a restoration.",
    planning:
      "Its stability, position and compatibility must be confirmed before reusing or restoring it.",
  },
  "existing-bridge": {
    meaning: "This position forms part of an existing fixed bridge.",
    patient: "A bridge connects multiple tooth positions as one restoration.",
    planning: "The whole bridge span and its supporting teeth or implants are assessed together.",
  },
  "existing-filling": {
    meaning: "This tooth contains an existing filling.",
    patient: "The filling replaces a previously damaged or decayed part of the tooth.",
    planning:
      "Its size, seal and remaining tooth structure influence whether it can stay or needs replacement.",
  },
  "root-canal-treated": {
    meaning: "The inside of this tooth has previously received root canal treatment.",
    patient: "The nerve space has been cleaned and sealed to preserve the tooth.",
    planning:
      "The clinic checks healing, remaining tooth strength and whether additional protection is required.",
  },
  decay: {
    meaning: "An area of dental decay or caries is recorded.",
    patient: "Decay weakens tooth structure and can progress toward the nerve if untreated.",
    planning:
      "Its depth and extent determine whether a filling, root canal treatment or stronger restoration is needed.",
  },
  fractured: {
    meaning: "A crack or fracture is recorded in the tooth.",
    patient: "A fracture can weaken the tooth and may cause sensitivity or pain when biting.",
    planning:
      "The fracture depth and restorability determine whether the tooth can be repaired or needs another approach.",
  },
  mobility: {
    meaning: "The tooth has been recorded as mobile.",
    patient: "Mobility means the tooth moves more than expected within its supporting tissues.",
    planning:
      "Gum health, bone support and bite forces must be assessed before definitive treatment.",
  },
  impacted: {
    meaning: "The tooth has not fully erupted into its normal position.",
    patient: "An impacted tooth may remain partly or fully within the gum or bone.",
    planning:
      "Imaging and its relationship to neighbouring structures guide monitoring or surgical treatment.",
  },
  "periodontal-problem": {
    meaning: "A gum or supporting-bone concern is recorded around this tooth.",
    patient: "Periodontal health affects the foundation that keeps the tooth stable.",
    planning:
      "Inflammation and bone support should be stabilized before or alongside restorative treatment.",
  },
  other: {
    meaning: "The clinic has recorded an additional finding for this tooth.",
    patient: "The exact finding is specific to your clinical examination and imaging.",
    planning: "Your dentist will explain how the finding influences the final treatment sequence.",
  },
};

function toothAnatomy(tooth: ToothNumber) {
  const quadrant = Math.floor(tooth / 10);
  const position = tooth % 10;
  const location =
    quadrant === 1
      ? "Upper right"
      : quadrant === 2
        ? "Upper left"
        : quadrant === 3
          ? "Lower left"
          : "Lower right";
  const types: Record<number, string> = {
    1: "Central incisor",
    2: "Lateral incisor",
    3: "Canine",
    4: "First premolar",
    5: "Second premolar",
    6: "First molar",
    7: "Second molar",
    8: "Third molar",
  };
  const type = types[position] ?? "Tooth";
  return { type, fullLabel: `${location} ${type.toLowerCase()}` };
}

function plannerTreatmentLabel(treatment: PlannerToothTreatment) {
  return treatment.displayName?.trim() || treatmentByType(treatment.treatmentType).label;
}

function plannerTreatmentDetail(treatment: PlannerToothTreatment) {
  const details = [
    treatment.implantBrand,
    treatment.material ? humanizeClinicalValue(treatment.material) : undefined,
    treatment.layer ? `${humanizeClinicalValue(treatment.layer)} layer` : undefined,
    treatment.stage ? humanizeClinicalValue(treatment.stage) : undefined,
  ].filter((value): value is string => Boolean(value));
  return details.length
    ? details.join(" · ")
    : `${treatmentByType(treatment.treatmentType).category} treatment assigned to this tooth.`;
}

function humanizeClinicalValue(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatNaturalList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
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
        patientView
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
  eyebrow?: string;
  title: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "max-w-2xl" : "max-w-3xl"}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {eyebrow}
        </p>
      )}
      <h2
        className={`${eyebrow ? "mt-3 " : ""}font-semibold tracking-[-0.03em] ${compact ? "text-2xl" : "text-2xl sm:text-4xl"}`}
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

function TreatmentJourneyCard({
  step,
  index,
  primary,
}: {
  step: ReturnType<typeof mapTreatmentPlanToPatientDocument>["journey"][number];
  index: number;
  primary: string;
}) {
  return (
    <article className="print-row relative ml-8 rounded-2xl bg-white p-4 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.38)] ring-1 ring-slate-200/80 sm:ml-10 lg:ml-0 lg:grid lg:grid-cols-[auto_1fr] lg:gap-x-3">
      <span
        className="absolute -left-[2.5rem] top-4 grid size-8 place-items-center rounded-full text-xs font-semibold text-white shadow-md sm:-left-[3rem] lg:static lg:row-span-3"
        style={{ background: primary }}
        aria-label={`Step ${index + 1}`}
      >
        {index + 1}
      </span>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Stage {index + 1}
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-slate-950">
            {step.title}
          </h3>
        </div>
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"
          aria-hidden="true"
        >
          <Activity className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-sm leading-5 text-slate-600 lg:col-start-2">
        {step.description ?? "Your clinic will guide you through this confirmed stage."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 lg:col-start-2">
        {step.stay && <Badge variant="secondary">Stay: {step.stay}</Badge>}
        {step.healing && <Badge variant="secondary">Healing: {step.healing}</Badge>}
      </div>
    </article>
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
              loading="lazy"
              decoding="async"
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

function PatientClinicCard({
  document,
}: {
  document: ReturnType<typeof mapTreatmentPlanToPatientDocument>;
}) {
  const clinic = document.clinic!;
  const clinicImage = clinic.name.toLowerCase().includes("dtkurt")
    ? "/shared-plan/dtkurt-clinic-front.jpg"
    : clinic.patient_image_url;
  return (
    <section
      id="your-clinic"
      className="shared-section -mx-4 scroll-mt-24 bg-white px-4 py-10 sm:-mx-6 sm:px-6 sm:py-16"
    >
      <article className="print-card grid overflow-hidden rounded-3xl bg-slate-950 text-white shadow-[0_30px_70px_-40px_rgba(15,23,42,0.8)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="min-h-64 lg:min-h-[26rem]">
          {clinicImage ? (
            <img
              alt={`${clinic.name} clinic`}
              src={clinicImage}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full min-h-64 place-items-center bg-gradient-to-br from-slate-800 to-slate-950">
              {clinic.logo_url ? (
                <img src={clinic.logo_url} alt="" className="max-h-32 max-w-[70%] object-contain" />
              ) : (
                <Building2 className="size-12 text-slate-400" aria-hidden="true" />
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center p-7 sm:p-10">
          <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{clinic.name}</h2>
          {clinic.patient_description && (
            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-white/70 sm:text-base">
              {clinic.patient_description}
            </p>
          )}
          <div className="no-print mt-7 flex flex-wrap gap-3 text-sm">
            {clinic.website && (
              <Button size="sm" variant="secondary" asChild>
                <a href={clinic.website} target="_blank" rel="noreferrer">
                  Website <ExternalLink className="size-4" />
                </a>
              </Button>
            )}
            {clinic.phone && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <a href={`tel:${clinic.phone.replace(/\s/g, "")}`}>
                  <Phone className="size-4" /> {clinic.phone}
                </a>
              </Button>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

function PatientHotelCard({
  hotel,
  nights,
  configuredHotel,
  airportTransfer,
  hotelTransfer,
  accent,
}: {
  hotel: NonNullable<ReturnType<typeof mapTreatmentPlanToPatientDocument>["travel"]>["hotel"];
  nights?: number;
  configuredHotel?: ClinicHotel;
  airportTransfer: boolean;
  hotelTransfer: boolean;
  accent: string;
}) {
  if (!hotel) return null;
  return (
    <article className="print-card overflow-hidden rounded-3xl bg-white shadow-[0_22px_60px_-42px_rgba(15,23,42,0.5)] ring-1 ring-slate-200/80">
      {configuredHotel?.images.length ? (
        <div className="overflow-hidden [&_img]:h-64 [&_img]:w-full [&_img]:object-cover sm:[&_img]:h-72">
          <HotelCarousel images={configuredHotel.images} hotelName={hotel.name} />
        </div>
      ) : (
        <div className="grid h-64 w-full place-items-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 sm:h-72">
          <BedDouble className="size-12" aria-hidden="true" />
        </div>
      )}
      <div className="p-5 sm:p-7">
        <dl>
          <div>
            <dt className="sr-only">Hotel category</dt>
            <dd className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {configuredHotel?.categories[0] ?? hotel.board_type ?? "Selected accommodation"}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Hotel name</dt>
            <dd className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {hotel.name}
            </dd>
          </div>
        </dl>
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 text-xs sm:grid-cols-3">
          <HotelFact
            icon={BedDouble}
            label="Stay"
            value={nights ? `${nights} nights` : "To be confirmed"}
            accent={accent}
          />
          <HotelFact
            icon={Plane}
            label="Airport transfer"
            value={airportTransfer ? "Included" : "Not included"}
            accent={accent}
          />
          <HotelFact
            icon={Car}
            label="Hotel transfer"
            value={hotelTransfer ? "Included" : "Not included"}
            accent={accent}
          />
        </div>
        {(configuredHotel?.website ?? hotel.website) && (
          <Button className="no-print mt-6" size="sm" variant="outline" asChild>
            <a href={configuredHotel?.website ?? hotel.website} target="_blank" rel="noreferrer">
              Hotel website <ExternalLink className="size-4" />
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}

function HotelFact({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-2">
      <Icon className="size-4" style={{ color: accent }} aria-hidden="true" />
      <div>
        <p className="text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function IncludedServicesPanel({
  services,
  accent,
  image,
}: {
  services: string[];
  accent: string;
  image?: string;
}) {
  const groups = groupIncludedServices(services);
  return (
    <article className="print-card rounded-3xl bg-white p-5 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.5)] ring-1 ring-slate-200/80 sm:p-7">
      <div className="flex items-center gap-4">
        {image ? (
          <img
            alt=""
            src={image}
            loading="lazy"
            decoding="async"
            className="size-12 rounded-xl bg-slate-50 object-contain p-1.5 ring-1 ring-slate-200"
          />
        ) : (
          <span className="grid size-12 place-items-center rounded-xl bg-slate-950 text-white">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
        )}
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Included in your visit</h3>
        </div>
      </div>
      <Accordion type="single" collapsible className="mt-5">
        {groups.map((group) => (
          <AccordionItem key={group.label} value={group.label}>
            <AccordionTrigger className="py-4 text-sm hover:no-underline">
              <span className="flex items-center gap-3">
                <span className="text-[var(--shared-accent)]">
                  <ServiceGroupIcon label={group.label} />
                </span>
                {group.label}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 pb-2">
                {group.services.map((service) => (
                  <li
                    key={service}
                    className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: accent }}
                      aria-hidden="true"
                    />
                    <span>{service}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </article>
  );
}

function VisitSupportCard() {
  return (
    <article className="print-card grid min-h-64 place-items-center rounded-3xl bg-white p-7 text-center shadow-[0_22px_60px_-42px_rgba(15,23,42,0.5)] ring-1 ring-slate-200/80">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-600">
          <Plane className="size-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-slate-950">Travel arranged around you</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your coordinator will confirm accommodation and travel details with you before your visit.
        </p>
      </div>
    </article>
  );
}

type TreatmentFaq = { id: string; question: string; answer: string };
const FAQ_BY_TREATMENT: Partial<Record<LegacyToothTreatment, Array<Omit<TreatmentFaq, "id">>>> = {
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
const TREATMENT_ICONS: Partial<Record<LegacyToothTreatment, LucideIcon>> = {
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
function treatmentIcon(treatment?: LegacyToothTreatment): LucideIcon {
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

function treatmentQuantityLabel(group: PatientTreatmentGroup) {
  return `${group.quantity} × ${group.label}`;
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
