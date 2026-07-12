import type { DentalPlanData } from "@/features/dentalplan/types/dental-plan.types";
import { TREATMENT_DEFINITIONS } from "@/features/dentalplan/data/treatmentDefinitions";
import type {
  Assessment,
  PlanCurrency,
  RoadmapCountryTreatmentPrice,
  RoadmapJourneyStep,
  RoadmapTreatmentContent,
  RoadmapTreatmentEstimate,
} from "@/types/models";

export type PreliminaryDentalAnalysis = {
  treatments: RoadmapTreatmentEstimate[];
  source: "assessment" | "future_ai" | "manual";
  generated_at: string;
  requires_clinical_review: boolean;
};
export type RoadmapAnalysisInput = { assessment: Assessment };
export interface RoadmapAnalysisProvider {
  analyze(input: RoadmapAnalysisInput): Promise<PreliminaryDentalAnalysis>;
}

const label = (key: string) =>
  TREATMENT_DEFINITIONS.find((item) => item.type === key)?.label ?? key.replace(/-/g, " ");

export function deriveRoadmapInputs(assessment: Assessment) {
  return {
    treatmentInterest: assessment.dental.treatment_interest.trim(),
    medicalConditions: assessment.medical.conditions ?? [],
    medications: assessment.medical.medication_groups ?? [],
    allergies: assessment.medical.allergy_groups ?? [],
    destinationCountry: assessment.travel.destination_country,
    preferredCities: assessment.travel.preferred_cities ?? [],
    treatmentTimeline: assessment.travel.treatment_timeline,
    hasPanoramic: assessment.uploads.uploaded_panoramic,
    hasDentalPhotos: assessment.uploads.uploaded_dental_photos,
  };
}

export class AssessmentRulesRoadmapProvider implements RoadmapAnalysisProvider {
  async analyze({ assessment }: RoadmapAnalysisInput) {
    return {
      treatments: deriveAssessmentTreatmentEstimates(assessment),
      source: "assessment" as const,
      generated_at: new Date().toISOString(),
      requires_clinical_review: true,
    };
  }
}

export function deriveAssessmentTreatmentEstimates(
  assessment: Assessment,
): RoadmapTreatmentEstimate[] {
  const { treatmentInterest } = deriveRoadmapInputs(assessment);
  const text = treatmentInterest.toLowerCase();
  const keys: string[] = [];
  if (text.includes("all-on-4")) keys.push("all-on-4");
  else if (text.includes("all-on-6")) keys.push("all-on-6");
  else if (text.includes("full mouth")) keys.push("dental-implant", "zirconium-crown");
  else if (text.includes("implant")) keys.push("dental-implant", "implant-crown");
  else if (text.includes("veneer")) keys.push("veneer");
  else if (text.includes("crown")) keys.push("zirconium-crown");
  else if (text.includes("bridge")) keys.push("bridge");
  else if (text.includes("root canal")) keys.push("root-canal-treatment");
  else if (text.includes("whitening")) keys.push("whitening");
  else if (text.includes("bonding")) keys.push("composite-bonding");
  else if (text.includes("denture")) keys.push("denture");
  return [...new Set(keys)].map((treatmentKey) => ({
    treatment_key: treatmentKey,
    label: label(treatmentKey),
    likelihood: "possible",
    source: "assessment",
    ...(["all-on-4", "all-on-6", "whitening", "denture"].includes(treatmentKey)
      ? { estimated_quantity: 1 }
      : {}),
    patient_explanation:
      "This treatment may be relevant based on your selected treatment interest. Quantity will be confirmed after clinical review.",
  }));
}

export function summarizeDentalPlanForRoadmap(plan: DentalPlanData): RoadmapTreatmentEstimate[] {
  const grouped = new Map<string, number>();
  for (const treatment of plan.proposedTreatments) {
    const key = treatment.treatmentKey ?? treatment.treatmentType;
    grouped.set(key, (grouped.get(key) ?? 0) + Math.max(1, treatment.toothNumbers.length));
  }
  return [...grouped].map(([treatmentKey, quantity]) => ({
    treatment_key: treatmentKey,
    label: label(treatmentKey),
    estimated_quantity: quantity,
    likelihood: "expected",
    source: "future_ai",
  }));
}

export function mergeRoadmapTreatmentEstimates(
  ...sources: RoadmapTreatmentEstimate[][]
): RoadmapTreatmentEstimate[] {
  const priority = { assessment: 1, manual: 2, future_ai: 3 } as const;
  const merged = new Map<string, RoadmapTreatmentEstimate>();
  for (const estimates of sources)
    for (const estimate of estimates) {
      const current = merged.get(estimate.treatment_key);
      if (!current || priority[estimate.source] >= priority[current.source])
        merged.set(estimate.treatment_key, estimate);
    }
  return [...merged.values()];
}

export function calculateRoadmapPriceRange({
  country,
  treatmentEstimates,
  configuredPrices,
}: {
  country: string;
  treatmentEstimates: RoadmapTreatmentEstimate[];
  configuredPrices: RoadmapCountryTreatmentPrice[];
}) {
  let minimum = 0;
  let maximum = 0;
  let currency: PlanCurrency = "EUR";
  const missingPriceKeys: string[] = [];
  for (const estimate of treatmentEstimates) {
    const price = configuredPrices.find(
      (item) =>
        item.active && item.country === country && item.treatment_key === estimate.treatment_key,
    );
    const minimumQuantity = estimate.minimum_quantity ?? estimate.estimated_quantity;
    const maximumQuantity = estimate.maximum_quantity ?? estimate.estimated_quantity;
    if (!price || minimumQuantity === undefined || maximumQuantity === undefined) {
      missingPriceKeys.push(estimate.treatment_key);
      continue;
    }
    currency = price.currency;
    minimum += minimumQuantity * price.minimum_price;
    maximum += maximumQuantity * price.maximum_price;
  }
  return { minimum, maximum, currency, missingPriceKeys };
}

export function buildRoadmapTreatmentJourney(
  estimates: RoadmapTreatmentEstimate[],
): RoadmapJourneyStep[] {
  const keys = new Set(estimates.map((item) => item.treatment_key));
  const surgical = [...keys].some((key) =>
    ["dental-implant", "all-on-4", "all-on-6", "extraction", "bone-graft", "sinus-lift"].includes(
      key,
    ),
  );
  const restorative = [...keys].some((key) =>
    [
      "zirconium-crown",
      "implant-crown",
      "veneer",
      "bridge",
      "composite-bonding",
      "filling",
      "denture",
    ].includes(key),
  );
  const steps: RoadmapJourneyStep[] = [
    {
      id: "review",
      title: "Clinical review and diagnostics",
      description:
        "The clinic reviews your assessment, available images and medical safety information.",
    },
    {
      id: "planning",
      title: "Treatment planning",
      description:
        "Your dentist confirms the required procedures, quantities, materials and visit sequence.",
    },
  ];
  if (surgical)
    steps.push(
      {
        id: "surgery",
        title: "First treatment visit",
        description:
          "Required surgical treatment may be completed and a temporary solution may be provided where suitable.",
      },
      {
        id: "healing",
        title: "Healing period",
        description:
          "Implants and supporting tissues are allowed to heal before final restorations are confirmed.",
      },
    );
  if (restorative || surgical)
    steps.push({
      id: "restoration",
      title: surgical ? "Final restoration visit" : "Restorative treatment",
      description:
        "Final crowns, veneers, bridges or other restorations are prepared, checked and fitted where clinically appropriate.",
    });
  steps.push({
    id: "aftercare",
    title: "Final checks and aftercare",
    description:
      "The clinic checks comfort and bite and explains hygiene, maintenance and follow-up.",
  });
  return steps;
}

export function deriveRoadmapTiming(estimates: RoadmapTreatmentEstimate[]) {
  const surgical = estimates.some((item) =>
    ["dental-implant", "all-on-4", "all-on-6", "bone-graft", "sinus-lift"].includes(
      item.treatment_key,
    ),
  );
  return surgical
    ? {
        visits: 2,
        healingWeeks: 12,
        timeline: "Approximately 3–6 months",
        stay: "Approximately 5–7 days per visit",
      }
    : {
        visits: 1,
        healingWeeks: 2,
        timeline: "Approximately 1–3 weeks",
        stay: "Approximately 5–7 days",
      };
}

const content = (
  treatmentKey: string,
  title: string,
  shortDescription: string,
  timeline: string,
): RoadmapTreatmentContent => ({
  id: `roadmap_content_${treatmentKey}`,
  treatment_key: treatmentKey,
  title,
  short_description: shortDescription,
  why_it_may_be_needed:
    "It may help restore comfort, function or appearance when confirmed by a dentist.",
  procedure_steps: [
    "Clinical examination and diagnostics",
    "Personal treatment planning",
    "Treatment and final checks",
  ],
  usual_visits: timeline.includes("months") ? "Usually two visits" : "Usually one visit",
  typical_timeline: timeline,
  considerations: [
    "Final suitability and quantity require clinical examination and appropriate imaging.",
  ],
  active: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  created_by: "system",
});

export const DEFAULT_ROADMAP_TREATMENT_CONTENT: RoadmapTreatmentContent[] = [
  content(
    "dental-implant",
    "Dental Implant",
    "A fixed replacement foundation for a missing tooth.",
    "Approximately 3–6 months",
  ),
  content(
    "implant-crown",
    "Implant Crown",
    "The visible restoration fitted to a dental implant.",
    "After implant healing",
  ),
  content(
    "zirconium-crown",
    "Dental Crown",
    "A restoration designed to cover and strengthen a tooth.",
    "Approximately 1–2 weeks",
  ),
  content(
    "veneer",
    "Veneer",
    "A thin restoration used to improve the visible tooth surface.",
    "Approximately 1–2 weeks",
  ),
  content(
    "composite-bonding",
    "Composite Bonding",
    "Tooth-coloured material used for conservative shape repairs.",
    "Often one visit",
  ),
  content(
    "extraction",
    "Extraction",
    "Removal of a tooth that cannot be predictably retained.",
    "Healing varies",
  ),
  content(
    "root-canal-treatment",
    "Root Canal Treatment",
    "Treatment intended to manage infection or inflammation inside a tooth.",
    "Usually one or more appointments",
  ),
  content(
    "composite-filling",
    "Dental Filling",
    "A restoration used to repair a localised tooth defect.",
    "Often one visit",
  ),
  content(
    "bridge",
    "Dental Bridge",
    "A fixed restoration used to replace one or more missing teeth.",
    "Approximately 1–2 weeks",
  ),
  content(
    "bone-graft",
    "Bone Graft",
    "A supporting procedure that may improve available bone volume.",
    "Several months of healing may be required",
  ),
  content(
    "sinus-lift",
    "Sinus Lift",
    "A supporting upper-jaw procedure that may be needed before implants.",
    "Several months of healing may be required",
  ),
  content(
    "whitening",
    "Teeth Whitening",
    "A cosmetic treatment intended to lighten tooth colour.",
    "Often one visit",
  ),
  content(
    "all-on-4",
    "All-on-4",
    "A full-arch implant-supported restoration concept.",
    "Usually staged over two visits",
  ),
  content(
    "all-on-6",
    "All-on-6",
    "A full-arch restoration supported by six implants.",
    "Usually staged over two visits",
  ),
  content(
    "denture",
    "Denture",
    "A removable replacement for multiple missing teeth.",
    "Timing depends on the clinical design",
  ),
];

const BASE_PRICES: Record<string, [number, number, RoadmapCountryTreatmentPrice["unit"]]> = {
  "dental-implant": [450, 750, "per_implant"],
  "implant-crown": [250, 450, "per_tooth"],
  "zirconium-crown": [180, 320, "per_tooth"],
  veneer: [220, 400, "per_tooth"],
  "composite-bonding": [90, 180, "per_tooth"],
  extraction: [60, 180, "per_tooth"],
  "root-canal-treatment": [120, 280, "per_tooth"],
  "composite-filling": [60, 140, "per_tooth"],
  "bone-graft": [350, 900, "per_case"],
  "sinus-lift": [500, 1200, "per_case"],
  whitening: [180, 350, "per_case"],
  bridge: [180, 320, "per_tooth"],
  denture: [700, 1600, "per_arch"],
  "all-on-4": [4500, 7500, "per_arch"],
  "all-on-6": [6000, 9500, "per_arch"],
};

export const DEFAULT_ROADMAP_COUNTRY_PRICES: RoadmapCountryTreatmentPrice[] = [
  ["Turkey", 1],
  ["Hungary", 1.2],
  ["Poland", 1.15],
  ["Croatia", 1.25],
  ["Spain", 1.7],
].flatMap(([country, multiplier]) =>
  Object.entries(BASE_PRICES).map(([treatmentKey, [minimum, maximum, unit]]) => ({
    id: `roadmap_price_${String(country).toLowerCase()}_${treatmentKey}`,
    country: String(country),
    currency: "EUR" as const,
    treatment_key: treatmentKey,
    minimum_price: Math.round(minimum * Number(multiplier)),
    maximum_price: Math.round(maximum * Number(multiplier)),
    unit,
    active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    created_by: "system",
  })),
);
