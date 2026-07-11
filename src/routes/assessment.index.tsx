import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type KeyboardEvent } from "react";
import { TREATMENTS, COUNTRIES, CITIES_BY_COUNTRY } from "@/lib/constants";
import { useMockStore } from "@/lib/mock/store";
import { generateRoadmap } from "@/lib/roadmap";
import {
  AssessmentInput,
  AssessmentNavigation,
  AssessmentOption,
  AssessmentQuestion,
  AssessmentSelectionList,
  QuickAssessmentShell,
  UploadCard,
} from "@/components/quick-assessment/assessment-ui";

export const Route = createFileRoute("/assessment/")({ component: Assessment });

const STEPS = [
  "Treatment",
  "Country",
  "Cities",
  "Timeline",
  "Basic details",
  "Medical safety",
  "Uploads",
] as const;
const DRAFT_KEY = "smileabroad-assessment-draft-v1";
const JOURNEY_KEY = "smileabroad-active-journey-v1";
const TIMELINES = [
  "As soon as possible",
  "Within 1–3 months",
  "Within 3–6 months",
  "More than 6 months",
  "I’m not sure yet",
];
const CONDITIONS = [
  "Uncontrolled diabetes",
  "Bleeding or clotting disorder",
  "Osteoporosis",
  "Autoimmune condition",
  "Active cancer treatment",
  "Previous radiotherapy to the head or neck",
  "Severe heart condition",
  "None of these",
  "Other",
];
const MEDICATIONS = [
  "Blood thinners",
  "Bisphosphonates or osteoporosis medication",
  "Steroids",
  "Immunosuppressive medication",
  "Chemotherapy medication",
  "None of these",
  "Other",
];
const ALLERGIES = [
  "Penicillin or antibiotics",
  "Local anaesthetic",
  "Latex",
  "Metal allergy",
  "None of these",
  "Other",
];
type MedicalGroup = { selected: string[]; other: string };

function Assessment() {
  const navigate = useNavigate();
  const store = useMockStore();
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  const [step, setStep] = useState(0);
  const [treatment, setTreatment] = useState("");
  const [customTreatmentOpen, setCustomTreatmentOpen] = useState(false);
  const [country, setCountry] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [timeline, setTimeline] = useState("");
  const [personal, setPersonal] = useState({ firstName: "", lastName: "", age: "" });
  const [conditions, setConditions] = useState<MedicalGroup>({ selected: [], other: "" });
  const [medications, setMedications] = useState<MedicalGroup>({ selected: [], other: "" });
  const [allergies, setAllergies] = useState<MedicalGroup>({ selected: [], other: "" });
  const [openMedicalGroup, setOpenMedicalGroup] = useState("");
  const [uploads, setUploads] = useState({ dentalPhotos: false, panoramic: false });

  useEffect(() => {
    window.localStorage.removeItem("smileabroad-anonymous-submission");
    try {
      const saved = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null");
      if (saved) {
        setSubmissionId(saved.submissionId || `anonymous_${crypto.randomUUID()}`);
        setStep(Math.max(0, Math.min(saved.step ?? 0, STEPS.length - 1)));
        setTreatment(saved.treatment ?? "");
        setCustomTreatmentOpen(!!saved.treatment && !TREATMENTS.includes(saved.treatment));
        setCountry(saved.country ?? "");
        setCities(Array.isArray(saved.cities) ? saved.cities : []);
        setTimeline(
          saved.timeline ?? saved.dental?.timeline ?? saved.travel?.treatment_timeline ?? "",
        );
        setPersonal({
          firstName: saved.personal?.firstName ?? "",
          lastName: saved.personal?.lastName ?? "",
          age: String(saved.personal?.age ?? ""),
        });
        setConditions(normalizeGroup(saved.conditions, saved.medical?.conditions));
        setMedications(normalizeGroup(saved.medications, saved.medical?.meds));
        setAllergies(normalizeGroup(saved.allergies, saved.medical?.allergies));
        setUploads({
          dentalPhotos: !!(saved.uploads?.dentalPhotos ?? saved.uploads?.uploaded_dental_photos),
          panoramic: !!(saved.uploads?.panoramic ?? saved.uploads?.uploaded_panoramic),
        });
      } else setSubmissionId(`anonymous_${crypto.randomUUID()}`);
    } catch {
      setSubmissionId(`anonymous_${crypto.randomUUID()}`);
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated || !submissionId || submitting) return;
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        submissionId,
        step,
        treatment,
        country,
        cities,
        timeline,
        personal,
        conditions,
        medications,
        allergies,
        uploads,
      }),
    );
  }, [
    allergies,
    cities,
    conditions,
    country,
    draftHydrated,
    medications,
    personal,
    step,
    submissionId,
    submitting,
    timeline,
    treatment,
    uploads,
  ]);

  const age = Number(personal.age);
  const canContinue =
    step === 0
      ? !!treatment
      : step === 1
        ? !!country
        : step === 2
          ? cities.length > 0
          : step === 3
            ? !!timeline
            : step === 4
              ? !!personal.firstName.trim() &&
                !!personal.lastName.trim() &&
                Number.isInteger(age) &&
                age >= 1 &&
                age <= 110
              : true;
  const back = () => setStep((current) => Math.max(0, current - 1));
  const advance = () => {
    if (canContinue) setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const submit = () => {
    if (!submissionId || submitting) return;
    setSubmitting(true);
    const assessment = store.addAssessment({
      patient_user_id: submissionId,
      dental: { treatment_interest: treatment },
      personal: {
        first_name: personal.firstName.trim(),
        last_name: personal.lastName.trim(),
        age,
        email: "",
      },
      medical: {
        conditions: withOther(conditions),
        medications: withOther(medications).join(", "),
        allergies: withOther(allergies).join(", "),
        medication_groups: withOther(medications),
        allergy_groups: withOther(allergies),
        smoking: false,
        pregnancy: false,
      },
      travel: {
        destination_country: country,
        preferred_cities: cities,
        companions: 0,
        needs_hotel: false,
        needs_airport_transfer: false,
        treatment_timeline: timeline,
      },
      uploads: {
        uploaded_panoramic: uploads.panoramic,
        uploaded_smile_photo: false,
        uploaded_cbct: false,
        uploaded_dental_photos: uploads.dentalPhotos,
        uploaded_previous_plan: false,
        uploaded_previous_report: false,
      },
      status: "submitted",
    });
    const roadmap = store.addRoadmap({
      ...generateRoadmap(assessment, submissionId),
      status: "ready",
    });
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.setItem(
      JOURNEY_KEY,
      JSON.stringify({ submissionId, assessmentId: assessment.id, roadmapId: roadmap.id }),
    );
    navigate({ to: "/roadmap/$id", params: { id: roadmap.id } });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.target instanceof HTMLButtonElement ||
      (event.target instanceof HTMLInputElement && event.target.type === "file")
    )
      return;
    event.preventDefault();
    if (step === STEPS.length - 1) submit();
    else advance();
  };

  return (
    <QuickAssessmentShell step={step} total={STEPS.length} label={STEPS[step]}>
      <div onKeyDown={onKeyDown} className="flex flex-1 flex-col">
        {step === 0 && (
          <AssessmentQuestion
            title="What treatment are you interested in?"
            description="Choose the closest option, or describe it in your own words."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {TREATMENTS.map((item) => (
                <AssessmentOption
                  key={item}
                  selected={treatment === item}
                  onClick={() => {
                    setTreatment(item);
                    setCustomTreatmentOpen(false);
                  }}
                >
                  {item}
                </AssessmentOption>
              ))}
            </div>
            <div className="mt-3 border-t pt-3">
              <button
                type="button"
                aria-expanded={customTreatmentOpen}
                onClick={() => setCustomTreatmentOpen((current) => !current)}
                className="min-h-11 rounded-lg px-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {customTreatmentOpen ? "Hide other treatment" : "Other treatment"}
              </button>
              {customTreatmentOpen && (
                <AssessmentInput
                  className="mt-2"
                  autoFocus
                  aria-label="Other treatment"
                  placeholder="Type another treatment"
                  value={TREATMENTS.includes(treatment) ? "" : treatment}
                  onChange={(event) => setTreatment(event.target.value)}
                />
              )}
            </div>
          </AssessmentQuestion>
        )}
        {step === 1 && (
          <AssessmentQuestion
            title="Which country would you consider?"
            description="This helps tailor your preliminary roadmap."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {COUNTRIES.map((item) => (
                <AssessmentOption
                  key={item}
                  selected={country === item}
                  onClick={() => {
                    setCountry(item);
                    setCities([]);
                  }}
                >
                  {item}
                </AssessmentOption>
              ))}
            </div>
          </AssessmentQuestion>
        )}
        {step === 2 && (
          <AssessmentQuestion
            title={`Which cities in ${country || "your destination"} would you consider?`}
            description="Select one or more cities."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {(CITIES_BY_COUNTRY[country] ?? []).map((item) => (
                <AssessmentOption
                  key={item}
                  multiple
                  selected={cities.includes(item)}
                  onClick={() =>
                    setCities((current) =>
                      current.includes(item)
                        ? current.filter((city) => city !== item)
                        : [...current, item],
                    )
                  }
                >
                  {item}
                </AssessmentOption>
              ))}
            </div>
          </AssessmentQuestion>
        )}
        {step === 3 && (
          <AssessmentQuestion
            title="When would you ideally like to start your treatment?"
            description="Your answer helps make the preliminary planning timeline more useful."
          >
            <div className="grid gap-2">
              {TIMELINES.map((item) => (
                <AssessmentOption
                  key={item}
                  selected={timeline === item}
                  onClick={() => setTimeline(item)}
                >
                  {item}
                </AssessmentOption>
              ))}
            </div>
          </AssessmentQuestion>
        )}
        {step === 4 && (
          <AssessmentQuestion
            title="A few basic details"
            description="No account, email or phone number is needed for your preliminary roadmap."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <AssessmentInput
                  autoComplete="given-name"
                  value={personal.firstName}
                  onChange={(event) => setPersonal({ ...personal, firstName: event.target.value })}
                />
              </Field>
              <Field label="Last name">
                <AssessmentInput
                  autoComplete="family-name"
                  value={personal.lastName}
                  onChange={(event) => setPersonal({ ...personal, lastName: event.target.value })}
                />
              </Field>
              <Field label="Age">
                <AssessmentInput
                  inputMode="numeric"
                  type="number"
                  min={1}
                  max={110}
                  value={personal.age}
                  onChange={(event) => setPersonal({ ...personal, age: event.target.value })}
                />
              </Field>
            </div>
            {personal.age && (!Number.isInteger(age) || age < 1 || age > 110) && (
              <p className="mt-3 text-sm text-destructive">Enter an age between 1 and 110.</p>
            )}
          </AssessmentQuestion>
        )}
        {step === 5 && (
          <AssessmentQuestion
            title="Medical safety"
            description="This helps us highlight anything that may affect treatment planning."
          >
            <div className="space-y-2">
              <MedicalGroup
                title="Existing conditions"
                options={CONDITIONS}
                value={conditions}
                onChange={setConditions}
                expanded={openMedicalGroup === "conditions"}
                onToggle={() =>
                  setOpenMedicalGroup((current) => (current === "conditions" ? "" : "conditions"))
                }
              />
              <MedicalGroup
                title="Medications"
                options={MEDICATIONS}
                value={medications}
                onChange={setMedications}
                expanded={openMedicalGroup === "medications"}
                onToggle={() =>
                  setOpenMedicalGroup((current) => (current === "medications" ? "" : "medications"))
                }
              />
              <MedicalGroup
                title="Allergies"
                options={ALLERGIES}
                value={allergies}
                onChange={setAllergies}
                expanded={openMedicalGroup === "allergies"}
                onToggle={() =>
                  setOpenMedicalGroup((current) => (current === "allergies" ? "" : "allergies"))
                }
              />
            </div>
          </AssessmentQuestion>
        )}
        {step === 6 && (
          <AssessmentQuestion
            title="Add photos or an X-ray"
            description="Photos and X-rays help create a more useful preliminary roadmap. You can continue without them."
          >
            <div className="space-y-4">
              <UploadCard
                title="Dental photos"
                hint="Front, upper arch, lower arch or side photos. You can select multiple images."
                accept="image/*"
                multiple
                selected={uploads.dentalPhotos}
                onChange={(files) => setUploads({ ...uploads, dentalPhotos: !!files?.length })}
              />
              <UploadCard
                title="Panoramic X-ray"
                hint="Select one image or PDF if you already have one."
                accept="image/*,.pdf,application/pdf"
                selected={uploads.panoramic}
                onChange={(files) => setUploads({ ...uploads, panoramic: !!files?.length })}
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Only selection metadata is saved in this preview; files are not uploaded.
            </p>
          </AssessmentQuestion>
        )}
        <AssessmentNavigation
          first={step === 0}
          last={step === STEPS.length - 1}
          back={back}
          next={step === STEPS.length - 1 ? submit : advance}
          canContinue={!!canContinue && draftHydrated}
          submitting={submitting}
        />
      </div>
    </QuickAssessmentShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
function normalizeGroup(value: unknown, legacy: unknown): MedicalGroup {
  if (value && typeof value === "object" && "selected" in value) {
    const group = value as MedicalGroup;
    return {
      selected: Array.isArray(group.selected) ? group.selected : [],
      other: group.other ?? "",
    };
  }
  const selected = Array.isArray(legacy)
    ? legacy
    : typeof legacy === "string" && legacy
      ? legacy
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  return { selected, other: "" };
}
function withOther(group: MedicalGroup) {
  return group.selected.flatMap((item) =>
    item === "Other" ? (group.other.trim() ? [`Other: ${group.other.trim()}`] : ["Other"]) : [item],
  );
}
function MedicalGroup({
  title,
  options,
  value,
  onChange,
  expanded,
  onToggle,
}: {
  title: string;
  options: string[];
  value: MedicalGroup;
  onChange: (value: MedicalGroup) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const toggle = (option: string) =>
    onChange({
      ...value,
      selected:
        option === "None of these"
          ? value.selected.includes(option)
            ? []
            : [option]
          : value.selected.includes(option)
            ? value.selected.filter((item) => item !== option)
            : [...value.selected.filter((item) => item !== "None of these"), option],
    });
  return (
    <AssessmentSelectionList
      title={title}
      summary={medicalSummary(value)}
      expanded={expanded}
      onToggle={onToggle}
    >
      <fieldset>
        <legend className="sr-only">{title}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <AssessmentOption
              key={option}
              multiple
              selected={value.selected.includes(option)}
              onClick={() => toggle(option)}
            >
              {option}
            </AssessmentOption>
          ))}
        </div>
        {value.selected.includes("Other") && (
          <AssessmentInput
            className="mt-2"
            aria-label={`Other ${title.toLowerCase()}`}
            placeholder="Add a short detail"
            value={value.other}
            onChange={(event) => onChange({ ...value, other: event.target.value })}
          />
        )}
      </fieldset>
    </AssessmentSelectionList>
  );
}

function medicalSummary(group: MedicalGroup) {
  if (group.selected.length === 0) return "None selected";
  if (group.selected.length === 1) {
    return group.selected[0] === "Other" && group.other.trim()
      ? `Other: ${group.other.trim()}`
      : group.selected[0];
  }
  return `${group.selected.length} selected`;
}
