import { Link } from "@tanstack/react-router";
import { Car, CheckCircle2, Clock, Hotel, Languages, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { Clinic } from "@/types/models";

const treatmentLabel = (key: string) =>
  key
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");

export function ClinicCard({
  clinic,
  selectedForCompare = false,
  onCompare,
}: {
  clinic: Clinic;
  selectedForCompare?: boolean;
  onCompare?: (clinic: Clinic) => void;
}) {
  const treatments = clinic.supported_treatments ?? [];
  return (
    <Card className="group gap-0 overflow-hidden p-0 transition-shadow hover:shadow-lg">
      <div className="relative h-44 overflow-hidden">
        <img
          src={clinic.cover_image}
          alt={clinic.name}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {clinic.directory_source === "platform" && clinic.platform_tier === "pro" ? (
          <Badge className="absolute left-3 top-3 gap-1">
            <CheckCircle2 className="size-3" /> SmileAbroad Pro
          </Badge>
        ) : (
          <Badge variant="secondary" className="absolute left-3 top-3">
            Public clinic listing
          </Badge>
        )}
      </div>
      <CardContent className="space-y-3 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight">{clinic.name}</h3>
          <p className="text-sm text-muted-foreground">
            {clinic.city}, {clinic.country}
          </p>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{clinic.short_description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5 fill-amber-500 text-amber-500" />
            {clinic.google_rating} ({clinic.google_reviews})
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />~{clinic.response_time_hours}h reply
          </span>
        </div>
        {treatments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {treatments.slice(0, 3).map((key) => (
              <Badge key={key} variant="outline" className="text-[10px] font-normal">
                {treatmentLabel(key)}
              </Badge>
            ))}
            {treatments.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{treatments.length - 3} more
              </Badge>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {clinic.hotel_included && (
            <span className="inline-flex items-center gap-1">
              <Hotel className="size-3.5" />
              Hotel
            </span>
          )}
          {clinic.transfers_included && (
            <span className="inline-flex items-center gap-1">
              <Car className="size-3.5" />
              Transfers
            </span>
          )}
          {clinic.languages.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Languages className="size-3.5" />
              {clinic.languages.slice(0, 2).join(", ")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          {onCompare && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={selectedForCompare}
                onCheckedChange={() => onCompare(clinic)}
                aria-label={`Compare ${clinic.name}`}
              />
              Compare
            </label>
          )}
          <Button asChild size="sm">
            <Link to="/clinics/$slug" params={{ slug: clinic.slug }}>
              View clinic
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
