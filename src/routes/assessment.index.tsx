import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TREATMENTS, COUNTRIES, CITIES_BY_COUNTRY } from "@/lib/constants";
import { useMockStore } from "@/lib/mock/store";
import { generateRoadmap } from "@/lib/roadmap";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assessment/")({ component: Assessment });

const STEPS = ["Treatment", "Country", "Cities", "Dental", "Personal", "Medical", "Travel", "Upload"] as const;
const DRAFT_KEY = "smileabroad-assessment-draft-v1";
const JOURNEY_KEY = "smileabroad-active-journey-v1";

function Assessment() {
  const navigate = useNavigate();
  const store = useMockStore();
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  const [step, setStep] = useState(0);
  const [treatment, setTreatment] = useState("");
  const [country, setCountry] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [dental, setDental] = useState({ chief: "", missing: "", budget: "", timeline: "" });
  const [personal, setPersonal] = useState({ firstName: "", lastName: "", email: "", phone: "", dob: "" });
  const [medical, setMedical] = useState({ conditions: [] as string[], meds: "", allergies: "", smoker: false, pregnant: false, notes: "" });
  const [travel, setTravel] = useState({ from: "", earliest: "", latest: "", companions: 0, hotel: true, transfer: true });

  useEffect(() => {
    window.localStorage.removeItem("smileabroad-anonymous-submission");
    try {
      const saved = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null");
      if (saved) {
        setSubmissionId(saved.submissionId || `anonymous_${crypto.randomUUID()}`);
        setStep(Math.max(0, Math.min(saved.step ?? 0, STEPS.length - 1)));
        setTreatment(saved.treatment ?? ""); setCountry(saved.country ?? ""); setCities(saved.cities ?? []);
        setDental((current) => ({ ...current, ...saved.dental })); setPersonal((current) => ({ ...current, ...saved.personal }));
        setMedical((current) => ({ ...current, ...saved.medical })); setTravel((current) => ({ ...current, ...saved.travel }));
      } else setSubmissionId(`anonymous_${crypto.randomUUID()}`);
    } catch {
      setSubmissionId(`anonymous_${crypto.randomUUID()}`);
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated || !submissionId) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ submissionId, step, treatment, country, cities, dental, personal, medical, travel,
      uploads: { uploaded_panoramic: false, uploaded_smile_photo: false, uploaded_cbct: false, uploaded_dental_photos: false, uploaded_previous_plan: false, uploaded_previous_report: false },
    }));
  }, [cities, country, dental, draftHydrated, medical, personal, step, submissionId, treatment, travel]);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const canNext = () => {
    if (step === 0) return !!treatment;
    if (step === 1) return !!country;
    if (step === 2) return cities.length > 0;
    if (step === 4) return personal.firstName && personal.email;
    return true;
  };

  const submit = () => {
    if (!submissionId) return;
    const uid = submissionId;
    const assessment = store.addAssessment({
      patient_user_id: uid,
      dental: {
        treatment_interest: treatment,
        concerns: dental.chief,
        missing_teeth: dental.missing,
      },
      personal: {
        first_name: personal.firstName,
        last_name: personal.lastName,
        date_of_birth: personal.dob,
        email: personal.email,
        phone: personal.phone,
      },
      medical: {
        conditions: medical.conditions,
        medications: medical.meds,
        allergies: medical.allergies,
        smoking: medical.smoker,
        pregnancy: medical.pregnant,
        additional_notes: medical.notes,
      },
      travel: {
        destination_country: country,
        preferred_cities: cities,
        travel_from: travel.from,
        earliest_date: travel.earliest,
        latest_date: travel.latest,
        companions: travel.companions,
        needs_hotel: travel.hotel,
        needs_airport_transfer: travel.transfer,
        budget: dental.budget,
        treatment_timeline: dental.timeline,
      },
      uploads: {
        uploaded_panoramic: false,
        uploaded_smile_photo: false,
        uploaded_cbct: false,
        uploaded_dental_photos: false,
        uploaded_previous_plan: false,
        uploaded_previous_report: false,
      },
      status: "submitted",
    });
    const roadmap = store.addRoadmap({ ...generateRoadmap(assessment, uid), status: "ready" });
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.setItem(JOURNEY_KEY, JSON.stringify({ submissionId: uid, assessmentId: assessment.id, roadmapId: roadmap.id }));
    navigate({ to: "/roadmap/$id", params: { id: roadmap.id } });
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && step <= 2 && canNext()) { e.preventDefault(); next(); }
  };

  return (
    <div className="min-h-screen bg-surface" onKeyDown={onKey}>
      <div className="container-app py-10 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{STEPS[step]}</span>
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} className="mt-2" />
        </div>

        <Card><CardContent className="p-8 min-h-[420px] flex flex-col">
          {step === 0 && (
            <Single title="What treatment are you interested in?" hint="Press Enter to continue">
              <div className="flex flex-wrap gap-2">
                {TREATMENTS.map((t) => (
                  <button key={t} onClick={() => setTreatment(t)} className={cn("px-4 py-2 rounded-lg border text-sm transition-all", treatment === t ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:border-primary")}>{t}</button>
                ))}
              </div>
              <Input className="mt-4" placeholder="Or type it yourself…" value={treatment} onChange={(e) => setTreatment(e.target.value)} />
            </Single>
          )}
          {step === 1 && (
            <Single title="Which country would you consider?" hint="Press Enter to continue">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COUNTRIES.map((c) => (
                  <button key={c} onClick={() => { setCountry(c); setCities([]); }} className={cn("px-4 py-3 rounded-lg border text-sm transition-all", country === c ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:border-primary")}>{c}</button>
                ))}
              </div>
            </Single>
          )}
          {step === 2 && (
            <Single title={`Which cities in ${country || "…"} would you consider?`} hint="Select one or more, press Enter to continue">
              <div className="flex flex-wrap gap-2">
                {(CITIES_BY_COUNTRY[country] ?? []).map((c) => {
                  const active = cities.includes(c);
                  return (
                    <button key={c} onClick={() => setCities((cs) => active ? cs.filter((x) => x !== c) : [...cs, c])}
                      className={cn("px-4 py-2 rounded-lg border text-sm transition-all inline-flex items-center gap-1.5", active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:border-primary")}>
                      {active && <Check className="size-3.5" />} {c}
                    </button>
                  );
                })}
              </div>
            </Single>
          )}
          {step === 3 && (
            <Group title="Dental information">
              <Field label="What brings you here?"><Textarea rows={3} value={dental.chief} onChange={(e) => setDental({ ...dental, chief: e.target.value })} placeholder="Chief complaint or goal" /></Field>
              <Field label="Missing or damaged teeth"><Input value={dental.missing} onChange={(e) => setDental({ ...dental, missing: e.target.value })} placeholder="e.g. molars on upper right" /></Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Budget range"><Input value={dental.budget} onChange={(e) => setDental({ ...dental, budget: e.target.value })} placeholder="e.g. €3,000–€6,000" /></Field>
                <Field label="Preferred timeline"><Input value={dental.timeline} onChange={(e) => setDental({ ...dental, timeline: e.target.value })} placeholder="e.g. within 2 months" /></Field>
              </div>
            </Group>
          )}
          {step === 4 && (
            <Group title="Personal information">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="First name"><Input value={personal.firstName} onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })} /></Field>
                <Field label="Last name"><Input value={personal.lastName} onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })} /></Field>
              </div>
              <Field label="Email"><Input type="email" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} /></Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Phone"><Input value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} /></Field>
                <Field label="Date of birth"><Input type="date" value={personal.dob} onChange={(e) => setPersonal({ ...personal, dob: e.target.value })} /></Field>
              </div>
            </Group>
          )}
          {step === 5 && (
            <Group title="Medical information">
              <Field label="Existing conditions">
                <div className="flex flex-wrap gap-2">
                  {["Diabetes","Heart disease","High blood pressure","Osteoporosis","None"].map((c) => {
                    const active = medical.conditions.includes(c);
                    return <Badge key={c} variant={active ? "default" : "outline"} className="cursor-pointer" onClick={() => setMedical((m) => ({ ...m, conditions: active ? m.conditions.filter((x) => x !== c) : [...m.conditions, c] }))}>{c}</Badge>;
                  })}
                </div>
              </Field>
              <Field label="Medications"><Textarea rows={2} value={medical.meds} onChange={(e) => setMedical({ ...medical, meds: e.target.value })} /></Field>
              <Field label="Allergies"><Textarea rows={2} value={medical.allergies} onChange={(e) => setMedical({ ...medical, allergies: e.target.value })} /></Field>
              <div className="flex gap-6"><label className="flex items-center gap-2"><Checkbox checked={medical.smoker} onCheckedChange={(v) => setMedical({ ...medical, smoker: !!v })} /> Smoker</label><label className="flex items-center gap-2"><Checkbox checked={medical.pregnant} onCheckedChange={(v) => setMedical({ ...medical, pregnant: !!v })} /> Pregnant</label></div>
            </Group>
          )}
          {step === 6 && (
            <Group title="Travel information">
              <Field label="Travelling from"><Input value={travel.from} onChange={(e) => setTravel({ ...travel, from: e.target.value })} placeholder="City, country" /></Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Earliest date"><Input type="date" value={travel.earliest} onChange={(e) => setTravel({ ...travel, earliest: e.target.value })} /></Field>
                <Field label="Latest date"><Input type="date" value={travel.latest} onChange={(e) => setTravel({ ...travel, latest: e.target.value })} /></Field>
              </div>
              <Field label="Travel companions"><Input type="number" min={0} value={travel.companions} onChange={(e) => setTravel({ ...travel, companions: +e.target.value })} /></Field>
              <div className="flex gap-6"><label className="flex items-center gap-2"><Checkbox checked={travel.hotel} onCheckedChange={(v) => setTravel({ ...travel, hotel: !!v })} /> I need hotel</label><label className="flex items-center gap-2"><Checkbox checked={travel.transfer} onCheckedChange={(v) => setTravel({ ...travel, transfer: !!v })} /> I need transfers</label></div>
            </Group>
          )}
          {step === 7 && (
            <Group title="Almost done — anything to upload?">
              <p className="text-sm text-muted-foreground -mt-2">Optional. You can upload photos or X-rays now, or later from your dashboard.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {["Dental photos","Panoramic X-ray","CBCT","Previous plan","Previous report"].map((k) => (
                  <div key={k} className="border border-dashed rounded-lg p-4 text-sm text-muted-foreground hover:border-primary transition">📎 {k} <span className="text-xs">(optional)</span></div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Uploads are mocked in this preview.</p>
            </Group>
          )}

          <div className="mt-auto pt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 0}><ArrowLeft className="size-4 mr-1" /> Back</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next} disabled={!canNext()}>Continue <ArrowRight className="size-4 ml-1" /></Button>
            ) : (
              <Button onClick={submit} disabled={!draftHydrated || !submissionId}>Generate roadmap <ArrowRight className="size-4 ml-1" /></Button>
            )}
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}

function Single({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <h2 className="font-display text-3xl font-semibold">{title}</h2>
      {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 space-y-4">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
