import type { Assessment, Clinic, Roadmap } from "@/types/models";

export const ACTIVE_JOURNEY_KEY = "smileabroad-active-journey-v1";
export const APPLICATION_CONTEXT_KEY = "smileabroad-clinic-application-context-v1";
export const COMPARE_CLINICS_KEY = "smileabroad-compare-clinics-v1";

export type ClinicSort = "recommended" | "rating" | "reviews" | "name";
export type ClinicFilters = {
  country?: string;
  city?: string;
  treatments: string[];
  sort: ClinicSort;
};
export type ActiveJourney = { submissionId: string; assessmentId: string; roadmapId: string };
export type ClinicApplicationContext = {
  assessmentId: string;
  roadmapId: string;
  clinicId: string;
  submissionId?: string;
};

export function readActiveJourney(): ActiveJourney | undefined {
  try {
    const value = JSON.parse(window.localStorage.getItem(ACTIVE_JOURNEY_KEY) ?? "null");
    if (
      typeof value?.assessmentId === "string" &&
      typeof value?.roadmapId === "string" &&
      typeof value?.submissionId === "string"
    )
      return value;
  } catch {
    /* General browsing remains available when stored context is invalid. */
  }
}

export function resolveJourneyContext(
  journey: ActiveJourney | undefined,
  roadmaps: Roadmap[],
  assessments: Assessment[],
) {
  if (!journey) return {};
  const roadmap = roadmaps.find(
    (item) =>
      item.id === journey.roadmapId &&
      item.assessment_id === journey.assessmentId &&
      item.patient_user_id === journey.submissionId,
  );
  const assessment = roadmap
    ? assessments.find(
        (item) =>
          item.id === roadmap.assessment_id && item.patient_user_id === journey.submissionId,
      )
    : undefined;
  return assessment ? { roadmap, assessment } : {};
}

export function deriveClinicSearchDefaults(
  assessment?: Assessment,
  roadmap?: Roadmap,
): ClinicFilters {
  return {
    country: assessment?.travel.destination_country || undefined,
    city: assessment?.travel.preferred_cities?.[0] || undefined,
    treatments: (roadmap?.treatment_estimates ?? []).map((item) => item.treatment_key),
    sort: "recommended",
  };
}

export function rankClinicsForRoadmap({
  clinics,
  roadmap,
  assessment,
  filters,
}: {
  clinics: Clinic[];
  roadmap?: Roadmap;
  assessment?: Assessment;
  filters: ClinicFilters;
}) {
  const lower = (value?: string) => value?.toLocaleLowerCase();
  return clinics
    .filter((clinic) => !filters.country || lower(clinic.country) === lower(filters.country))
    .filter((clinic) => !filters.city || lower(clinic.city) === lower(filters.city))
    .filter(
      (clinic) =>
        !filters.treatments.length ||
        filters.treatments.some((key) => clinic.supported_treatments?.includes(key)),
    )
    .map((clinic) => {
      const score =
        (lower(clinic.country) === lower(assessment?.travel.destination_country) ? 40 : 0) +
        (assessment?.travel.preferred_cities?.some((city) => lower(city) === lower(clinic.city))
          ? 25
          : 0) +
        (roadmap?.treatment_estimates ?? []).filter((item) =>
          clinic.supported_treatments?.includes(item.treatment_key),
        ).length *
          12 +
        clinic.google_rating * 2 +
        Math.min(clinic.google_reviews / 250, 5) +
        (clinic.directory_source === "platform" ? 2 : 0);
      return { clinic, score };
    })
    .sort((a, b) =>
      filters.sort === "rating"
        ? b.clinic.google_rating - a.clinic.google_rating
        : filters.sort === "reviews"
          ? b.clinic.google_reviews - a.clinic.google_reviews
          : filters.sort === "name"
            ? a.clinic.name.localeCompare(b.clinic.name)
            : b.score - a.score,
    )
    .map(({ clinic }) => clinic);
}

export function clinicMatchReasons(clinic: Clinic, assessment?: Assessment, roadmap?: Roadmap) {
  const reasons: string[] = [];
  if (assessment?.travel.destination_country === clinic.country)
    reasons.push("Located in your selected destination");
  if (assessment?.travel.preferred_cities?.includes(clinic.city))
    reasons.push("Matches one of your preferred cities");
  const labels = (roadmap?.treatment_estimates ?? [])
    .filter((item) => clinic.supported_treatments?.includes(item.treatment_key))
    .map((item) => item.label);
  if (labels.length)
    reasons.push(`Lists ${labels.slice(0, 2).join(" and ")} among its supported treatments`);
  return reasons;
}

export function saveApplicationContext(context: ClinicApplicationContext) {
  window.localStorage.setItem(APPLICATION_CONTEXT_KEY, JSON.stringify(context));
}
