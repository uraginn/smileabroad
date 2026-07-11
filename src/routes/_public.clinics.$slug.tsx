import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMockStore } from "@/lib/mock/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShieldCheck, Hotel, Car, Clock, CheckCircle2, Languages } from "lucide-react";

export const Route = createFileRoute("/_public/clinics/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({ roadmap: typeof search.roadmap === "string" ? search.roadmap : undefined }),
  component: ClinicDetail,
});

function ClinicDetail() {
  const { slug } = Route.useParams();
  const { roadmap: roadmapId } = Route.useSearch();
  const clinic = useMockStore((s) => s.clinics.find((c) => c.slug === slug));
  const roadmap = useMockStore((s) => roadmapId ? s.roadmaps.find((item) => item.id === roadmapId) : undefined);
  const assessment = useMockStore((s) => roadmap ? s.assessments.find((item) => item.id === roadmap.assessment_id) : undefined);
  const branding = useMockStore((s) => s.branding.find((b) => b.clinic_id === clinic?.id));
  if (!clinic) throw notFound();
  return (
    <div>
      <div className="h-72 md:h-96 relative overflow-hidden">
        <img src={clinic.cover_image} alt={clinic.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
        <div className="absolute bottom-8 left-0 right-0 container-app text-white">
          {clinic.verified && <Badge className="mb-3 gap-1"><CheckCircle2 className="size-3" /> Verified</Badge>}
          <h1 className="font-display text-4xl md:text-5xl font-semibold">{clinic.name}</h1>
          <p className="mt-1 opacity-80">{clinic.city}, {clinic.country}</p>
        </div>
      </div>
      <div className="container-app py-12 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card><CardContent className="p-6">
            <h2 className="font-display text-2xl font-semibold">About the clinic</h2>
            <p className="mt-3 text-muted-foreground">{clinic.short_description}</p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              <Row icon={Star} label={`${clinic.google_rating} Google (${clinic.google_reviews})`} />
              <Row icon={Star} label={`${clinic.trustpilot_rating} Trustpilot (${clinic.trustpilot_reviews})`} />
              <Row icon={Clock} label={`Replies in ~${clinic.response_time_hours}h`} />
              <Row icon={ShieldCheck} label={`${clinic.guarantee_years}-year guarantee`} />
              <Row icon={Hotel} label={clinic.hotel_included ? "Hotel included" : "Hotel available"} />
              <Row icon={Car} label={clinic.transfers_included ? "Transfers included" : "Transfers on request"} />
              <Row icon={Languages} label={clinic.languages.join(", ")} />
            </div>
          </CardContent></Card>
          {branding && branding.doctors.length > 0 && (
            <Card><CardContent className="p-6">
              <h2 className="font-display text-2xl font-semibold">Meet the team</h2>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                {branding.doctors.map((d) => (
                  <div key={d.name} className="p-4 rounded-lg bg-surface">
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-sm text-muted-foreground">{d.title}</p>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}
        </div>
        <div>
          <Card className="sticky top-20"><CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">From</p>
            <p className="font-display text-3xl font-semibold">{clinic.price_range.currency === "USD" ? "$" : "€"}{clinic.price_range.min}<span className="text-base text-muted-foreground font-normal"> / unit</span></p>
            {roadmap && assessment ? <Button asChild className="w-full mt-4" size="lg"><Link to="/roadmap/$id" params={{ id: roadmap.id }}>Return to clinic selection</Link></Button> : <Button asChild className="w-full mt-4" size="lg"><Link to="/assessment">Start assessment</Link></Button>}
            <Button asChild variant="outline" className="w-full mt-2"><Link to="/clinics">Compare clinics</Link></Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label }: { icon: any; label: string }) {
  return <div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4" /><span>{label}</span></div>;
}
