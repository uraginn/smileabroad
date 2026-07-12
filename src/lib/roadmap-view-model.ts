import { TREATMENT_DEFINITIONS } from "@/features/dentalplan/data/treatmentDefinitions";
import {
  buildRoadmapTreatmentJourney,
  deriveAssessmentTreatmentEstimates,
} from "@/lib/roadmap-engine";
import type {
  Assessment,
  Roadmap,
  RoadmapTreatmentContent,
  RoadmapTreatmentEstimate,
} from "@/types/models";

type CompletenessStatus =
  "Completed" | "Partially completed" | "Provided" | "Not provided" | "More information required";
export type PatientRoadmapViewModel = {
  informationCompleteness: Array<{ label: string; status: CompletenessStatus }>;
  detailLabel:
    | "Basic assessment"
    | "Assessment with dental photos"
    | "Assessment with X-ray"
    | "Assessment with photos and X-ray";
  treatmentEstimates: RoadmapTreatmentEstimate[];
  journey: NonNullable<Roadmap["treatment_journey"]>;
  treatmentInformation: RoadmapTreatmentContent[];
  inclusions: string[];
  exclusions: string[];
  alternatives: Array<{ title: string; options: string[]; note: string }>;
  clinicQuestions: string[];
  changeFactors: Array<{ title: string; items: string[] }>;
  preparedAt: string;
  updatedAt: string;
  reference: string;
  freshness: "Current" | "Price estimate may need updating";
  missingPhotos: boolean;
  missingPanoramic: boolean;
};

const treatmentName = (key: string) =>
  TREATMENT_DEFINITIONS.find((item) => item.type === key)?.label ?? key.replace(/-/g, " ");

export function createPatientRoadmapViewModel({
  roadmap,
  assessment,
  content,
}: {
  roadmap: Roadmap;
  assessment: Assessment;
  content: RoadmapTreatmentContent[];
}): PatientRoadmapViewModel {
  const missingPhotos = !assessment.uploads.uploaded_dental_photos;
  const missingPanoramic = !assessment.uploads.uploaded_panoramic;
  const estimates = (
    roadmap.treatment_estimates?.length
      ? roadmap.treatment_estimates
      : deriveAssessmentTreatmentEstimates(assessment)
  ).map((item) => ({ ...item, label: treatmentName(item.treatment_key) }));
  const keys = new Set(estimates.map((item) => item.treatment_key));
  const implant = [...keys].some((key) =>
    [
      "dental-implant",
      "implant-crown",
      "all-on-4",
      "all-on-6",
      "bone-graft",
      "sinus-lift",
    ].includes(key),
  );
  const restorative = [...keys].some((key) =>
    [
      "zirconium-crown",
      "veneer",
      "composite-bonding",
      "bridge",
      "composite-filling",
      "root-canal-treatment",
    ].includes(key),
  );
  const fullArch = keys.has("all-on-4") || keys.has("all-on-6") || keys.has("denture");
  const treatmentInfoProvided = Boolean(assessment.dental.treatment_interest);
  const medicalProvided =
    assessment.medical.conditions.length > 0 ||
    Boolean(assessment.medical.medications) ||
    Boolean(assessment.medical.allergies);
  const detailLabel =
    !missingPhotos && !missingPanoramic
      ? "Assessment with photos and X-ray"
      : !missingPanoramic
        ? "Assessment with X-ray"
        : !missingPhotos
          ? "Assessment with dental photos"
          : "Basic assessment";
  const inclusions = [
    "Treatment procedures represented in the current estimate",
    "Clinic examination and confirmation of the treatment plan",
  ];
  if (assessment.uploads.uploaded_panoramic)
    inclusions.push("Review of the panoramic X-ray you marked as provided");
  if (assessment.uploads.uploaded_dental_photos)
    inclusions.push("Review of the dental photographs you marked as provided");
  if (implant || restorative)
    inclusions.push("Digital scan or impressions where clinically required");
  if (implant || fullArch) inclusions.push("Temporary teeth where clinically suitable");
  const exclusions = [
    "Flights and travel insurance",
    "Additional hotel nights or companion expenses",
    "Sedation or general anaesthesia unless specifically quoted",
    "Procedures identified only after examination",
  ];
  if (implant)
    exclusions.push(
      "Additional graft material or sinus procedures unless included in the confirmed Quote",
    );
  if (!keys.has("extraction")) exclusions.push("Unexpected extractions");
  if (!keys.has("root-canal-treatment"))
    exclusions.push("Hidden infection or root-canal treatment discovered later");
  const alternatives: PatientRoadmapViewModel["alternatives"] = [];
  if (implant)
    alternatives.push({
      title: "Replacing missing teeth",
      options: [treatmentName("dental-implant"), treatmentName("bridge"), treatmentName("denture")],
      note: "These options may be discussed; suitability depends on bone, gum and neighbouring-tooth findings.",
    });
  if (fullArch)
    alternatives.push({
      title: "Full-arch treatment",
      options: [treatmentName("all-on-4"), treatmentName("all-on-6"), treatmentName("denture")],
      note: "The number of implants and type of restoration can only be confirmed clinically.",
    });
  if (restorative)
    alternatives.push({
      title: "Restoring visible or damaged teeth",
      options: [
        treatmentName("composite-bonding"),
        treatmentName("veneer"),
        treatmentName("zirconium-crown"),
      ],
      note: "More invasive restorations should only be considered where tooth condition supports them.",
    });
  const questions = [
    "Will this preliminary estimate change after clinical examination?",
    "How many visits and treatment days are expected?",
    "What is included and excluded from the confirmed Quote?",
    "What guarantee and aftercare are provided?",
    "What happens if additional treatment is identified?",
  ];
  if (implant)
    questions.push(
      "Which implant system is proposed?",
      "Are bone grafting or sinus lift expected?",
      "Will temporary teeth and the final implant crown be included?",
    );
  if (restorative)
    questions.push(
      "Which restoration material is proposed?",
      "How many teeth are expected to be treated?",
      "Will temporary restorations be provided?",
    );
  if (assessment.travel.needs_hotel) questions.push("How many hotel nights are included?");
  if (assessment.travel.needs_airport_transfer)
    questions.push("Are airport and clinic transfers included?");
  const medicalFactors = [
    assessment.medical.conditions.length && "Medical conditions may require additional review",
    (assessment.medical.medication_groups?.length || assessment.medical.medications) &&
      "Medication may affect treatment or healing",
    assessment.medical.smoking && "Smoking may affect healing",
  ].filter(Boolean) as string[];
  return {
    informationCompleteness: [
      {
        label: "Treatment preferences",
        status: treatmentInfoProvided ? "Completed" : "More information required",
      },
      {
        label: "Dental condition or symptom information",
        status: treatmentInfoProvided ? "Partially completed" : "More information required",
      },
      {
        label: "Medical information",
        status: medicalProvided ? "Completed" : "Partially completed",
      },
      { label: "Dental photos", status: missingPhotos ? "Not provided" : "Provided" },
      { label: "Panoramic X-ray", status: missingPanoramic ? "Not provided" : "Provided" },
      {
        label: "Destination preference",
        status: assessment.travel.destination_country ? "Completed" : "More information required",
      },
    ],
    detailLabel,
    treatmentEstimates: estimates,
    journey: roadmap.treatment_journey?.length
      ? roadmap.treatment_journey
      : buildRoadmapTreatmentJourney(estimates),
    treatmentInformation: estimates.flatMap(
      (estimate) =>
        content.find((item) => item.treatment_key === estimate.treatment_key && item.active) ?? [],
    ),
    inclusions: [...new Set(inclusions)],
    exclusions: [...new Set(exclusions)],
    alternatives,
    clinicQuestions: [...new Set(questions)].slice(0, 8),
    changeFactors: [
      {
        title: "Clinical findings",
        items: [
          "Bone and gum condition",
          "Hidden infection or fractures",
          "Need for extraction or root-canal treatment",
        ],
      },
      ...(medicalFactors.length ? [{ title: "Medical factors", items: medicalFactors }] : []),
      {
        title: "Treatment choices",
        items: [
          "Number of treated teeth",
          "Restoration material or implant system",
          "Sedation, hotel or additional services",
        ],
      },
    ],
    preparedAt: roadmap.created_at,
    updatedAt: roadmap.updated_at,
    reference: roadmapReference(roadmap),
    freshness:
      Date.now() - new Date(roadmap.updated_at).getTime() > 90 * 24 * 60 * 60 * 1000
        ? "Price estimate may need updating"
        : "Current",
    missingPhotos,
    missingPanoramic,
  };
}

function roadmapReference(roadmap: Roadmap) {
  let hash = 0;
  for (const character of roadmap.id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `RM-${new Date(roadmap.created_at).getFullYear()}-${String(hash % 100000).padStart(5, "0")}`;
}
