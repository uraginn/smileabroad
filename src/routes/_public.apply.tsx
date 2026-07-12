import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileCheck2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPLICATION_CONTEXT_KEY,
  readActiveJourney,
  resolveJourneyContext,
  type ClinicApplicationContext,
} from "@/lib/clinic-directory";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";

export const Route = createFileRoute("/_public/apply")({ component: ApplyToClinic });

type ContactDraft = {
  first_name: string;
  last_name: string;
  email: string;
  whatsapp: string;
  preferred_contact_method: string;
};

const uploadLabels = {
  uploaded_panoramic: "Panoramic X-ray",
  uploaded_smile_photo: "Smile photo",
  uploaded_cbct: "CBCT",
  uploaded_dental_photos: "Dental photos",
  uploaded_previous_plan: "Previous plan",
  uploaded_previous_report: "Previous report",
} as const;

function ApplyToClinic() {
  const hydrated = useMockStoreHydrated();
  const navigate = useNavigate();
  const clinics = useMockStore((state) => state.clinics);
  const roadmaps = useMockStore((state) => state.roadmaps);
  const assessments = useMockStore((state) => state.assessments);
  const applyToClinic = useMockStore((state) => state.applyToClinic);
  const [application, setApplication] = useState<ClinicApplicationContext>();
  const [journey, setJourney] = useState<ReturnType<typeof readActiveJourney>>();
  const [draft, setDraft] = useState<ContactDraft>({
    first_name: "",
    last_name: "",
    email: "",
    whatsapp: "",
    preferred_contact_method: "",
  });

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
  if (!hydrated)
    return (
      <div className="container-app py-16 text-sm text-muted-foreground">Loading application…</div>
    );

  if (!valid || !clinic || !resolved.roadmap || !resolved.assessment || !journey) {
    return (
      <div className="container-app max-w-2xl py-16">
        <Alert>
          <AlertTitle>Application context unavailable</AlertTitle>
          <AlertDescription>
            Your anonymous journey could not be verified. No clinic information was shared.
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/clinics">Browse clinics</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/assessment">Start assessment</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { roadmap, assessment } = resolved;
  const personal = assessment.personal;
  const uploaded = Object.entries(assessment.uploads).filter(([, present]) => present) as Array<
    [keyof typeof uploadLabels, boolean]
  >;
  const value = (key: keyof ContactDraft) => personal[key]?.toString().trim() || draft[key].trim();
  const missing = (key: keyof ContactDraft) => !personal[key]?.toString().trim();
  const setField = (key: keyof ContactDraft, next: string) =>
    setDraft((current) => ({ ...current, [key]: next }));

  const submit = () => {
    const required: Array<keyof ContactDraft> = [
      "first_name",
      "last_name",
      "email",
      "whatsapp",
      "preferred_contact_method",
    ];
    if (required.some((key) => !value(key))) {
      toast.error("Please complete the missing contact details.");
      return;
    }
    const created = applyToClinic({
      clinic_id: clinic.id,
      patient_user_id: journey.submissionId,
      assessment_id: assessment.id,
      roadmap_id: roadmap.id,
      patient_name: `${value("first_name")} ${value("last_name")}`.trim(),
      patient_country: assessment.personal.country || assessment.travel.travel_from || "Unknown",
      treatment: assessment.dental.treatment_interest || roadmap.estimated_treatment,
      contact: {
        first_name: value("first_name"),
        last_name: value("last_name"),
        email: value("email"),
        whatsapp: value("whatsapp"),
        preferred_contact_method: value("preferred_contact_method"),
      },
    });
    localStorage.removeItem(APPLICATION_CONTEXT_KEY);
    void navigate({ to: "/confirmation/$id", params: { id: created.id } });
  };

  return (
    <div className="container-app max-w-3xl py-10 md:py-14">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Apply to {clinic.name}</h1>
        <p className="mt-2 text-muted-foreground">
          Review your preliminary information and complete only the missing contact details.
        </p>
      </div>
      <div className="space-y-5">
        {(missing("first_name") ||
          missing("last_name") ||
          missing("email") ||
          missing("whatsapp") ||
          missing("preferred_contact_method")) && (
          <Card>
            <CardHeader>
              <CardTitle>Contact details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {missing("first_name") && (
                <ContactField
                  label="First name"
                  value={draft.first_name}
                  onChange={(next) => setField("first_name", next)}
                />
              )}
              {missing("last_name") && (
                <ContactField
                  label="Last name"
                  value={draft.last_name}
                  onChange={(next) => setField("last_name", next)}
                />
              )}
              {missing("email") && (
                <ContactField
                  label="Email"
                  type="email"
                  value={draft.email}
                  onChange={(next) => setField("email", next)}
                />
              )}
              {missing("whatsapp") && (
                <ContactField
                  label="WhatsApp"
                  type="tel"
                  value={draft.whatsapp}
                  onChange={(next) => setField("whatsapp", next)}
                />
              )}
              {missing("preferred_contact_method") && (
                <div className="space-y-2">
                  <Label>Preferred contact method</Label>
                  <Select
                    value={draft.preferred_contact_method}
                    onValueChange={(next) => setField("preferred_contact_method", next)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Application summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <SummaryItem label="Clinic" value={clinic.name} />
              <SummaryItem
                label="Destination"
                value={[
                  assessment.travel.destination_country,
                  ...assessment.travel.preferred_cities,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <SummaryItem
                label="Estimated price range"
                value={
                  roadmap.price_max > 0
                    ? `${formatMoney(roadmap.price_min, roadmap.currency)}–${formatMoney(roadmap.price_max, roadmap.currency)}`
                    : "To be confirmed by clinic"
                }
              />
              <SummaryItem label="Roadmap reference" value={roadmap.id.slice(-8).toUpperCase()} />
            </dl>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Estimated treatments
              </p>
              <div className="flex flex-wrap gap-2">
                {(roadmap.treatment_estimates ?? []).map((item) => (
                  <Badge key={item.treatment_key} variant="secondary">
                    {item.label}
                    {item.estimated_quantity ? ` × ${item.estimated_quantity}` : ""}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Uploaded files
              </p>
              {uploaded.length ? (
                <div className="flex flex-wrap gap-2">
                  {uploaded.map(([key]) => (
                    <Badge key={key} variant="outline">
                      <FileCheck2 className="mr-1 size-3" />
                      {uploadLabels[key]}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No uploads provided</p>
              )}
            </div>
            <Badge variant="outline">
              Medical information {assessment.medical ? "available" : "not available"}
            </Badge>
            <Alert>
              <AlertTitle>Preliminary information</AlertTitle>
              <AlertDescription>
                The clinic will review your Assessment, uploaded-file metadata and Roadmap before
                preparing a detailed Treatment Plan and Quote.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="outline">
            <Link to="/clinics/$slug" params={{ slug: clinic.slug }}>
              Back to clinic
            </Link>
          </Button>
          <Button onClick={submit}>Submit application</Button>
        </div>
      </div>
    </div>
  );
}

function ContactField({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </div>
  );
}
function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "Not provided"}</dd>
    </div>
  );
}
const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount,
  );
