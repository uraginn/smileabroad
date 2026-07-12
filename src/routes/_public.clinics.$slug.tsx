import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Car, CheckCircle2, ExternalLink, Hotel, Languages, MapPin, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ClinicRoadmapSummary } from "@/components/clinic-roadmap-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  clinicMatchReasons,
  readActiveJourney,
  resolveJourneyContext,
  saveApplicationContext,
} from "@/lib/clinic-directory";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { PageLoading } from "@/components/ui-bits";

export const Route = createFileRoute("/_public/clinics/$slug")({
  validateSearch: (): { roadmap?: string } => ({}),
  component: ClinicDetail,
});

function ClinicDetail() {
  const hydrated = useMockStoreHydrated();
  const navigate = useNavigate();
  const { slug } = Route.useParams();
  const clinics = useMockStore((state) => state.clinics);
  const roadmaps = useMockStore((state) => state.roadmaps);
  const assessments = useMockStore((state) => state.assessments);
  const branding = useMockStore((state) => state.branding);
  const [journey, setJourney] = useState<ReturnType<typeof readActiveJourney>>();
  useEffect(() => setJourney(readActiveJourney()), []);
  const clinic = clinics.find((item) => item.slug === slug);
  const context = useMemo(
    () => resolveJourneyContext(journey, roadmaps, assessments),
    [journey, roadmaps, assessments],
  );
  const reasons = clinic ? clinicMatchReasons(clinic, context.assessment, context.roadmap) : [];
  const clinicBranding =
    clinic?.directory_source === "platform"
      ? branding.find((item) => item.clinic_id === clinic.id)
      : undefined;
  if (!hydrated) return <PageLoading label="Loading clinic" />;
  if (!clinic) throw notFound();
  const continueToApply = () => {
    if (!context.roadmap || !context.assessment || !journey) {
      void navigate({ to: "/assessment" });
      return;
    }
    saveApplicationContext({
      assessmentId: context.assessment.id,
      roadmapId: context.roadmap.id,
      clinicId: clinic.id,
      submissionId: journey.submissionId,
    });
    void navigate({ to: "/apply" });
  };
  return (
    <div>
      <div className="relative h-72 overflow-hidden md:h-96">
        <img src={clinic.cover_image} alt={clinic.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
        <div className="container-app absolute inset-x-0 bottom-8 text-white">
          <Badge variant="secondary" className="mb-3">
            {clinic.directory_source === "platform" && clinic.platform_tier === "pro"
              ? "SmileAbroad Pro"
              : "Public clinic listing"}
          </Badge>
          <h1 className="font-display text-4xl font-semibold md:text-5xl">{clinic.name}</h1>
          <p className="mt-1 opacity-90">
            {clinic.city}, {clinic.country}
          </p>
        </div>
      </div>
      <div className="container-app grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="space-y-6">
          <Card>
            <CardContent className="space-y-5 p-6">
              <div>
                <h2 className="font-display text-2xl font-semibold">About the clinic</h2>
                <p className="mt-3 text-muted-foreground">{clinic.short_description}</p>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info icon={MapPin}>
                  {clinic.city}, {clinic.country}
                </Info>
                <Info icon={Star}>
                  {clinic.google_rating} ({clinic.google_reviews} public reviews)
                </Info>
                {clinic.languages.length > 0 && (
                  <Info icon={Languages}>{clinic.languages.join(", ")}</Info>
                )}
                <Info icon={Hotel}>
                  {clinic.hotel_included ? "Hotel included" : "Hotel available on request"}
                </Info>
                <Info icon={Car}>
                  {clinic.transfers_included
                    ? "Transfers included"
                    : "Transfers available on request"}
                </Info>
              </div>
            </CardContent>
          </Card>
          {(clinic.supported_treatments ?? []).length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-semibold">Supported treatments</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {clinic.supported_treatments?.map((item) => (
                    <Badge key={item} variant="outline">
                      {treatmentLabel(item)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {reasons.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-semibold">Why this clinic appears</h2>
                <ul className="mt-4 space-y-2">
                  {reasons.map((reason) => (
                    <li key={reason} className="flex gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      {reason}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  This is a directory match, not a medical recommendation. The clinic must confirm
                  suitability and pricing.
                </p>
              </CardContent>
            </Card>
          )}
          {clinicBranding?.doctors?.length ? (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-semibold">Clinic team</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {clinicBranding.doctors.map((doctor) => (
                    <div key={doctor.name} className="rounded-lg bg-muted p-4">
                      <p className="font-medium">{doctor.name}</p>
                      <p className="text-sm text-muted-foreground">{doctor.title}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="font-medium">
                  {clinic.source_label ??
                    (clinic.directory_source === "platform"
                      ? "Registered clinic profile"
                      : "Public clinic listing")}
                </p>
                {clinic.last_reviewed_at && (
                  <p className="text-sm text-muted-foreground">
                    Information last reviewed{" "}
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                      new Date(clinic.last_reviewed_at),
                    )}
                  </p>
                )}
              </div>
              {clinic.website && (
                <Button asChild variant="outline">
                  <a href={clinic.website} target="_blank" rel="noreferrer">
                    Clinic website <ExternalLink className="size-4" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {context.roadmap && context.assessment && (
            <ClinicRoadmapSummary roadmap={context.roadmap} assessment={context.assessment} />
          )}
          <Card>
            <CardContent className="p-6">
              <Button className="w-full" size="lg" onClick={continueToApply}>
                {context.roadmap ? "Continue with this clinic" : "Start assessment"}
              </Button>
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link
                  to="/clinics"
                  search={{
                    country: undefined,
                    city: undefined,
                    treatments: undefined,
                    sort: "recommended",
                  }}
                >
                  Back to clinics
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Info({ icon: Icon, children }: { icon: typeof Star; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      {children}
    </div>
  );
}
const treatmentLabel = (key: string) =>
  key
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
