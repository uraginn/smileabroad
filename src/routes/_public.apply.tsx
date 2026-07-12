import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  APPLICATION_CONTEXT_KEY,
  readActiveJourney,
  resolveJourneyContext,
  type ClinicApplicationContext,
} from "@/lib/clinic-directory";
import { useMockStore } from "@/lib/mock/store";

export const Route = createFileRoute("/_public/apply")({ component: ApplyReady });

function ApplyReady() {
  const clinics = useMockStore((state) => state.clinics);
  const roadmaps = useMockStore((state) => state.roadmaps);
  const assessments = useMockStore((state) => state.assessments);
  const [application, setApplication] = useState<ClinicApplicationContext>();
  const [journey, setJourney] = useState<ReturnType<typeof readActiveJourney>>();
  useEffect(() => {
    setJourney(readActiveJourney());
    try {
      setApplication(
        JSON.parse(localStorage.getItem(APPLICATION_CONTEXT_KEY) ?? "null") ?? undefined,
      );
    } catch {
      setApplication(undefined);
    }
  }, []);
  const resolved = resolveJourneyContext(journey, roadmaps, assessments);
  const clinic = clinics.find((item) => item.id === application?.clinicId);
  const valid = Boolean(
    application &&
    clinic &&
    resolved.roadmap?.id === application.roadmapId &&
    resolved.assessment?.id === application.assessmentId &&
    journey?.submissionId === application.submissionId,
  );
  return (
    <div className="container-app max-w-2xl py-16">
      <Card>
        <CardHeader>
          <CardTitle>Review your clinic selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {valid ? (
            <>
              <p>
                You selected <strong>{clinic?.name}</strong> in {clinic?.city}, {clinic?.country}.
              </p>
              <Alert>
                <AlertTitle>Your application context is ready</AlertTitle>
                <AlertDescription>
                  No application, CRM patient or Lead has been created yet. Your Roadmap and clinic
                  references are stored safely for the next application step.
                </AlertDescription>
              </Alert>
              <Button asChild variant="outline">
                <Link to="/clinics/$slug" params={{ slug: clinic!.slug }}>
                  Return to clinic
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Alert>
                <AlertTitle>Selection unavailable</AlertTitle>
                <AlertDescription>
                  Your anonymous journey could not be verified. Browse clinics or restart the
                  assessment safely.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button asChild>
                  <Link
                    to="/clinics"
                    search={{
                      country: undefined,
                      city: undefined,
                      treatments: undefined,
                      sort: "recommended",
                    }}
                  >
                    Browse clinics
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/assessment">Start assessment</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
