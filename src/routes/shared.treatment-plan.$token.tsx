import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import { DentalDiagram } from "@/components/dental-diagram";
import { TREATMENT_OPTIONS, treatmentLabel } from "@/lib/dental";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { calculateQuoteTotals } from "@/lib/quote";

export const Route = createFileRoute("/shared/treatment-plan/$token")({ component: SharedPlan });

function SharedPlan() {
  const { token } = Route.useParams();
  const hydrated = useMockStoreHydrated();
  const tokenQuote = useMockStore((s) => s.quotes.find((q) => q.share_token === token));
  const plan = useMockStore((s) =>
    s.treatmentPlans.find(
      (t) => t.share_token === token || t.id === tokenQuote?.treatment_plan_id,
    ),
  );
  const quote = useMockStore((s) =>
    tokenQuote ?? (plan && s.quotes.find((q) => q.treatment_plan_id === plan.id)),
  );
  const clinic = useMockStore((s) => plan && s.clinics.find((c) => c.id === plan.clinic_id));
  const branding = useMockStore((s) => plan && s.branding.find((b) => b.clinic_id === plan.clinic_id));
  if (!hydrated) return null;
  if (!plan || !clinic || !branding) throw notFound();

  const total = quote
    ? calculateQuoteTotals(quote).total
    : plan.items.reduce((s, i) => s + i.unit_price, 0);
  const c = quote?.currency === "USD" ? "$" : "€";

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b" style={{ background: branding.primary_color, color: "white" }}>
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center gap-4">
          <img src={clinic.cover_image} className="size-14 rounded-lg object-cover" alt="" />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-semibold">{clinic.name}</h1>
            <p className="text-sm opacity-90">{clinic.city}, {clinic.country}</p>
          </div>
          <div className="text-right text-sm hidden sm:block">
            <p>{branding.phone}</p><p>{branding.email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Personalised treatment plan</p>
          <h2 className="font-display text-3xl font-semibold mt-1">{plan.title}</h2>
          <p className="text-muted-foreground mt-2">{plan.summary}</p>
        </div>

        <Card><CardContent className="p-6">
          <h3 className="font-display font-semibold mb-4">Your dental chart</h3>
          <DentalDiagram items={plan.items} />
          <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t">
            {TREATMENT_OPTIONS.map((o) => (
              <span key={o.value} className="inline-flex items-center gap-1.5 text-xs">
                <span className="size-3 rounded" style={{ background: o.color }} />{o.label}
              </span>
            ))}
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h3 className="font-display font-semibold mb-4">Treatment breakdown</h3>
          <div className="divide-y">
            {plan.items.map((i) => (
              <div key={i.id} className="py-3 flex items-center gap-3">
                <Badge variant="secondary">{i.tooth}</Badge>
                <div className="flex-1"><p className="font-medium text-sm">{treatmentLabel(i.treatment)}</p>
                  {i.material && <p className="text-xs text-muted-foreground">{i.material}</p>}</div>
                <p className="font-medium">{c}{i.unit_price.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Visits</span><span>{plan.visits}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Healing period</span><span>{plan.healing_weeks} weeks</span></div>
          </div>
        </CardContent></Card>

        {quote && <Card><CardContent className="p-6">
          <h3 className="font-display font-semibold mb-4">Your quote</h3>
          <div className="space-y-1 text-sm">
            <Row k="Hotel package" v={`${c}${quote.hotel_total.toLocaleString()}`} />
            <Row k="Airport transfers" v={`${c}${quote.transfer_total.toLocaleString()}`} />
            {quote.discount > 0 && <Row k="Discount" v={`- ${c}${quote.discount.toLocaleString()}`} />}
            <div className="pt-3 mt-3 border-t flex justify-between text-lg font-display font-semibold" style={{ color: branding.primary_color }}>
              <span>Total</span><span>{c}{total.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t">
            <p className="font-medium text-sm mb-2">Payment schedule</p>
            <div className="space-y-1">{quote.payment_schedule.map((p, i) => (
              <div key={i} className="flex justify-between text-sm p-2 bg-surface rounded">
                <span>{p.label} <span className="text-muted-foreground">({p.due})</span></span><span>{c}{p.amount.toLocaleString()}</span>
              </div>
            ))}</div>
          </div>
        </CardContent></Card>}

        <Card><CardContent className="p-6 space-y-3">
          <h3 className="font-display font-semibold">Your stay</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{branding.hotel_info}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{branding.transfer_info}</p>
        </CardContent></Card>

        <div className="rounded-xl bg-primary/5 border p-5 flex items-start gap-3">
          <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">{branding.terms}</p>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-8 text-center text-xs text-muted-foreground">
        Delivered by <span className="font-semibold">SmileAbroad</span> · Trusted dental care abroad
      </footer>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) { return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>; }
