import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/mock-auth";
import { selectPatientQuotes, useMockStore } from "@/lib/mock/store";
import { calculateQuoteTotals } from "@/lib/quote";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useShallow } from "zustand/react/shallow";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/patient/offers")({ component: Offers });

function Offers() {
  const patientUserId = useAuth((s) => (s.user?.role === "patient" ? s.user.id : undefined));
  const quotes = useMockStore(useShallow(selectPatientQuotes(patientUserId)));
  const clinics = useMockStore((s) => s.clinics);
  const plans = useMockStore((s) => s.treatmentPlans);

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="Offers" description="Treatment offers and quotes from clinics." />
      {!patientUserId ? (
        <EmptyState title="Sign in to view offers" description="Your clinic offers will appear here after you sign in as a patient." />
      ) : quotes.length === 0 ? (
        <EmptyState title="No offers yet" description="Once a clinic reviews your application, their quote appears here." />
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => {
            const clinic = clinics.find((item) => item.id === quote.clinic_id);
            const plan = plans.find((item) => item.id === quote.treatment_plan_id);
            const { total } = calculateQuoteTotals(quote);
            const currency = quote.currency === "USD" ? "$" : "€";
            return (
              <Card key={quote.id}>
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <img src={clinic?.cover_image} alt="" className="size-14 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{clinic?.name ?? "Clinic offer"}</p>
                      <Badge variant="secondary" className="capitalize">{quote.status ?? "offer"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{plan?.title ?? "Treatment plan"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {quote.items.length} items · {format(new Date(quote.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <p className="font-display text-xl font-semibold">{currency}{total.toLocaleString()}</p>
                    {quote.share_token && (
                      <Button asChild size="sm" className="mt-2">
                        <Link to="/shared/treatment-plan/$token" params={{ token: quote.share_token }}>
                          View offer <ExternalLink className="size-3.5 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
