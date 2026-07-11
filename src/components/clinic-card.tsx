import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Star, Hotel, Car, ShieldCheck, Languages } from "lucide-react";
import type { Clinic } from "@/types/models";

export function ClinicCard({
  clinic, onApply, roadmapId,
}: {
  clinic: Clinic; onApply?: (id: string) => void; roadmapId?: string;
}) {
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow p-0 gap-0">
      <div className="relative h-44 overflow-hidden">
        <img src={clinic.cover_image} alt={clinic.name}
          className="size-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        {clinic.verified && (
          <Badge className="absolute top-3 left-3 gap-1 bg-primary text-primary-foreground">
            <CheckCircle2 className="size-3" /> Verified
          </Badge>
        )}
      </div>
      <CardContent className="p-5 space-y-3">
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight">{clinic.name}</h3>
          <p className="text-sm text-muted-foreground">{clinic.city}, {clinic.country}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Star className="size-3.5 text-amber-500 fill-amber-500" />{clinic.google_rating} <span className="opacity-70">Google</span></span>
          <span className="inline-flex items-center gap-1"><Star className="size-3.5 text-emerald-500 fill-emerald-500" />{clinic.trustpilot_rating} <span className="opacity-70">Trustpilot</span></span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />~{clinic.response_time_hours}h reply</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {clinic.languages.slice(0, 3).map((l) => (
            <Badge key={l} variant="secondary" className="text-[10px] font-normal"><Languages className="size-3 mr-1" />{l}</Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-xs pt-1">
          {clinic.hotel_included && <span className="inline-flex items-center gap-1 text-success"><Hotel className="size-3.5" /> Hotel</span>}
          {clinic.transfers_included && <span className="inline-flex items-center gap-1 text-success"><Car className="size-3.5" /> Transfers</span>}
          <span className="inline-flex items-center gap-1 text-success"><ShieldCheck className="size-3.5" /> {clinic.guarantee_years}y guarantee</span>
        </div>
        <div className="pt-2 flex items-end justify-between border-t border-border">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">From</p>
            <p className="font-display text-lg font-semibold">{clinic.price_range.currency === "USD" ? "$" : "€"}{clinic.price_range.min}<span className="text-xs text-muted-foreground font-normal"> / unit</span></p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/clinics/$slug" params={{ slug: clinic.slug }} search={{ roadmap: roadmapId }}>View</Link></Button>
            {onApply && <Button size="sm" onClick={() => onApply(clinic.id)}>Apply</Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
