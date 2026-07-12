import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assessment, Roadmap } from "@/types/models";

export function ClinicRoadmapSummary({
  roadmap,
  assessment,
}: {
  roadmap: Roadmap;
  assessment: Assessment;
}) {
  const estimates = roadmap.treatment_estimates ?? [];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your preliminary Roadmap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">Preliminary</Badge>
          {assessment.travel.destination_country && (
            <Badge variant="outline">{assessment.travel.destination_country}</Badge>
          )}
        </div>
        <p className="text-muted-foreground">Reference {roadmap.id.slice(-8).toUpperCase()}</p>
        <ul className="space-y-1">
          {estimates.slice(0, 4).map((item) => (
            <li key={item.treatment_key}>
              {item.label}
              {item.estimated_quantity ? ` × ${item.estimated_quantity}` : ""}
            </li>
          ))}
        </ul>
        {roadmap.price_max > 0 && (
          <p className="font-medium">
            Estimated range:{" "}
            {new Intl.NumberFormat("en", {
              style: "currency",
              currency: roadmap.currency,
              maximumFractionDigits: 0,
            }).format(roadmap.price_min)}
            –
            {new Intl.NumberFormat("en", {
              style: "currency",
              currency: roadmap.currency,
              maximumFractionDigits: 0,
            }).format(roadmap.price_max)}
          </p>
        )}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/roadmap/$id" params={{ id: roadmap.id }}>
            View full Roadmap
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
