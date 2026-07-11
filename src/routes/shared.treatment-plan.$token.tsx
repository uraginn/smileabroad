import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { DentalDiagram } from "@/components/dental-diagram";
import { TREATMENT_OPTIONS } from "@/lib/dental";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateQuoteTotals, formatQuoteMoney } from "@/lib/quote";
import { CheckCircle2, ExternalLink, Mail, Phone, Printer, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/shared/treatment-plan/$token")({ component: SharedPlan });
const PUBLIC_STATUSES = ["approved", "sent", "viewed", "accepted"] as const;

function SharedPlan() {
  const { token } = Route.useParams();
  const hydrated = useMockStoreHydrated();
  const tokenQuote = useMockStore((s) => s.quotes.find((quote) => quote.share_token === token));
  const quote = tokenQuote && PUBLIC_STATUSES.includes((tokenQuote.status ?? "draft") as typeof PUBLIC_STATUSES[number]) ? tokenQuote : undefined;
  const plan = useMockStore((s) => quote ? s.treatmentPlans.find((item) => item.id === quote.treatment_plan_id && item.clinic_id === quote.clinic_id) : undefined);
  const clinic = useMockStore((s) => quote ? s.clinics.find((item) => item.id === quote.clinic_id) : undefined);
  const branding = useMockStore((s) => quote ? s.branding.find((item) => item.clinic_id === quote.clinic_id) : undefined);
  const patient = useMockStore((s) => quote ? s.patients.find((item) => item.clinic_id === quote.clinic_id && (item.id === quote.clinic_patient_id || item.user_id === quote.patient_user_id)) : undefined);
  const dentist = useMockStore((s) => plan?.dentist_id ? s.users.find((user) => user.id === plan.dentist_id && user.clinic_id === quote?.clinic_id) : undefined);
  const updateQuote = useMockStore((s) => s.updateQuote);

  useEffect(() => {
    if (quote?.status === "sent") updateQuote(quote.id, { status: "viewed" }, "patient_shared");
  }, [quote?.id, quote?.status, updateQuote]);

  if (!hydrated) return null;
  if (!quote || !plan || !clinic) return <SafeNotFound />;

  const primary = branding?.primary_color || "#0f766e";
  const secondary = branding?.secondary_color || "#f97316";
  const { subtotal, total } = calculateQuoteTotals(quote);
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : "Patient";
  const contactHref = branding?.phone ? `tel:${branding.phone.replace(/\s/g, "")}` : branding?.email ? `mailto:${branding.email}` : branding?.website;

  return <div className="shared-plan min-h-screen bg-slate-50 text-slate-900" style={{ "--clinic-primary": primary, "--clinic-secondary": secondary } as React.CSSProperties}>
    <style>{`@media print { .shared-plan .no-print { display:none!important } .shared-plan { background:white!important } .shared-plan .print-card { break-inside:avoid; box-shadow:none!important } }`}</style>
    <header className="text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center gap-4">
        <img src={branding?.logo_url || clinic.cover_image} alt={`${clinic.name} logo`} className="size-14 rounded-xl object-cover bg-white/90" />
        <div className="flex-1 min-w-48"><h1 className="text-2xl font-semibold">{clinic.name}</h1><p className="text-sm text-white/85">{clinic.city}, {clinic.country}</p></div>
        <div className="no-print flex flex-wrap gap-2"><Button variant="secondary" onClick={() => window.print()}><Printer className="size-4 mr-1" /> Print Plan</Button>{branding?.website && <Button asChild variant="secondary"><a href={branding.website} target="_blank" rel="noreferrer"><ExternalLink className="size-4 mr-1" /> Website</a></Button>}</div>
      </div>
    </header>

    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <Card className="print-card overflow-hidden"><div className="h-1.5" style={{ background: primary }} /><CardContent className="p-5 sm:p-7">
        <div className="flex flex-wrap justify-between gap-5"><div><p className="text-sm text-muted-foreground">Prepared for</p><h2 className="text-2xl sm:text-3xl font-semibold mt-1">{patientName}</h2><h3 className="text-lg mt-3">{plan.title}</h3><p className="text-sm text-muted-foreground mt-2 max-w-2xl">{plan.summary}</p></div><div className="text-left sm:text-right"><Badge className="capitalize" style={{ background: primary }}>{quote.status}</Badge><p className="text-xs text-muted-foreground mt-2">Quote {quote.id.slice(0, 8)}</p></div></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6"><Summary label="Visits" value={String(plan.visits)} /><Summary label="Healing period" value={`${plan.healing_weeks} weeks`} /><Summary label="Dentist" value={dentist?.name ?? "Clinic dental team"} /><Summary label="Currency" value={quote.currency} /></div>
      </CardContent></Card>

      <Card className="print-card"><CardContent className="p-5 sm:p-7"><h3 className="text-lg font-semibold mb-5">Your treatment plan</h3><div className="pointer-events-none" aria-label="Read-only dental diagram"><DentalDiagram items={plan.items} /></div><div className="mt-5 pt-4 border-t flex flex-wrap gap-3">{TREATMENT_OPTIONS.map((option) => <span key={option.value} className="inline-flex items-center gap-1.5 text-xs"><span className="size-3 rounded" style={{ background: option.color }} />{option.label}</span>)}</div></CardContent></Card>

      <Card className="print-card"><CardContent className="p-5 sm:p-7 space-y-5"><h3 className="text-lg font-semibold">Treatment and quote</h3><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Treatment</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{quote.items.map((item) => <TableRow key={item.id}><TableCell>{item.label}</TableCell><TableCell className="text-right">{item.qty}</TableCell><TableCell className="text-right whitespace-nowrap">{formatQuoteMoney(item.unit_price, quote.currency)}</TableCell><TableCell className="text-right font-medium whitespace-nowrap">{formatQuoteMoney(item.qty * item.unit_price, quote.currency)}</TableCell></TableRow>)}</TableBody></Table></div>
        <div className="sm:ml-auto sm:max-w-sm space-y-1 text-sm"><PriceRow label="Subtotal" value={formatQuoteMoney(subtotal, quote.currency)} /><PriceRow label="Hotel" value={formatQuoteMoney(quote.hotel_total, quote.currency)} /><PriceRow label="Transfers" value={formatQuoteMoney(quote.transfer_total, quote.currency)} />{quote.discount > 0 && <PriceRow label="Discount" value={`- ${formatQuoteMoney(quote.discount, quote.currency)}`} />}<div className="border-t mt-2 pt-2 text-lg font-semibold"><PriceRow label="Total" value={formatQuoteMoney(total, quote.currency)} /></div></div>
      </CardContent></Card>

      {quote.payment_schedule.length > 0 && <Card className="print-card"><CardContent className="p-5 sm:p-7"><h3 className="text-lg font-semibold mb-4">Payment schedule</h3><div className="space-y-2">{quote.payment_schedule.map((payment, index) => <div key={index} className="grid sm:grid-cols-[1fr_1fr_auto] gap-1 sm:gap-4 rounded-lg bg-slate-100 p-3 text-sm"><span className="font-medium">{payment.label}</span><span className="text-muted-foreground">{payment.due}</span><span className="font-medium">{formatQuoteMoney(payment.amount, quote.currency)}</span></div>)}</div></CardContent></Card>}

      {(branding?.hotel_info || branding?.transfer_info || branding?.guarantees?.length) && <div className="grid md:grid-cols-2 gap-4"><InfoCard title="Travel and services">{branding?.hotel_info && <p>{branding.hotel_info}</p>}{branding?.transfer_info && <p>{branding.transfer_info}</p>}</InfoCard><InfoCard title="Clinic guarantees">{branding?.guarantees?.map((guarantee) => <p key={guarantee} className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 mt-0.5" style={{ color: primary }} />{guarantee}</p>)}</InfoCard></div>}

      {(branding?.doctors?.length ?? 0) > 0 && <Card className="print-card"><CardContent className="p-5 sm:p-7"><h3 className="text-lg font-semibold mb-4">Your clinic team</h3><div className="grid sm:grid-cols-2 gap-3">{branding?.doctors.map((doctor) => <div key={doctor.name} className="flex items-center gap-3 rounded-lg border p-3">{doctor.photo ? <img src={doctor.photo} alt="" className="size-11 rounded-full object-cover" /> : <div className="size-11 rounded-full grid place-items-center text-white font-semibold" style={{ background: secondary }}>{doctor.name.charAt(0)}</div>}<div><p className="font-medium text-sm">{doctor.name}</p><p className="text-xs text-muted-foreground">{doctor.title}</p></div></div>)}</div></CardContent></Card>}

      {branding?.terms && <div className="print-card rounded-xl border bg-white p-5 flex gap-3"><ShieldCheck className="size-5 shrink-0" style={{ color: primary }} /><p className="text-xs text-muted-foreground">{branding.terms}</p></div>}

      <Card className="no-print"><CardContent className="p-5 sm:p-7 text-center space-y-4">{quote.status === "accepted" ? <div><CheckCircle2 className="size-10 mx-auto mb-2" style={{ color: primary }} /><h3 className="text-xl font-semibold">Plan accepted</h3><p className="text-sm text-muted-foreground">The clinic has been notified of your decision.</p></div> : <><h3 className="text-xl font-semibold">Ready for your next step?</h3><div className="flex flex-wrap justify-center gap-2">{contactHref && <Button asChild style={{ background: primary }}><a href={contactHref}><Phone className="size-4 mr-1" /> Contact Clinic</a></Button>}{branding?.email && <Button asChild variant="outline"><a href={`mailto:${branding.email}?subject=Question about quote ${quote.id.slice(0, 8)}`}><Mail className="size-4 mr-1" /> Ask a Question</a></Button>}<Button variant="outline" onClick={() => updateQuote(quote.id, { status: "accepted" }, "patient_shared")}>Accept Plan</Button></div></>}</CardContent></Card>
    </main>

    <footer className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center text-xs text-muted-foreground"><p>{branding?.phone || ""}{branding?.phone && branding?.email ? " · " : ""}{branding?.email || ""}</p><p className="mt-2">Delivered securely by SmileAbroad</p></footer>
  </div>;
}

function SafeNotFound() { return <main className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="max-w-md text-center"><ShieldCheck className="size-10 mx-auto text-muted-foreground" /><h1 className="text-2xl font-semibold mt-4">Shared plan not available</h1><p className="text-sm text-muted-foreground mt-2">This link is invalid, expired, or the plan is not currently available for viewing.</p></div></main>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-100 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium mt-1">{value}</p></div>; }
function PriceRow({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>; }
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) { return <Card className="print-card"><CardContent className="p-5 sm:p-7"><h3 className="text-lg font-semibold mb-3">{title}</h3><div className="space-y-2 text-sm text-muted-foreground">{children}</div></CardContent></Card>; }
