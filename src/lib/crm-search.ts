import type { Lead, Patient, TreatmentPlan } from "@/types/models";

export type CrmSearchResult = {
  id: string;
  group: "Leads" | "Patients" | "Treatment Plans";
  title: string;
  subtitle: string;
  status?: string;
  href: string;
  keywords: string;
};

export function buildCrmSearchIndex({
  clinicId,
  leads,
  patients,
  plans,
}: {
  clinicId: string;
  leads: Lead[];
  patients: Patient[];
  plans: TreatmentPlan[];
}): CrmSearchResult[] {
  const clinicPatients = patients.filter((item) => item.clinic_id === clinicId);
  return [
    ...leads
      .filter((item) => item.clinic_id === clinicId)
      .map((item) => ({
        id: `lead_${item.id}`,
        group: "Leads" as const,
        title: item.patient_name,
        subtitle: `${item.treatment} · ${item.source.replace(/_/g, " ")}`,
        status: item.status,
        href: item.clinic_patient_id ? `/pro/patients/${item.clinic_patient_id}` : "/pro/leads",
        keywords: [item.patient_name, item.patient_country, item.treatment, item.source].join(" "),
      })),
    ...clinicPatients.map((item) => {
      const plan = plans
        .filter(
          (candidate) =>
            candidate.clinic_id === clinicId && candidate.clinic_patient_id === item.id,
        )
        .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))[0];
      return {
        id: `patient_${item.id}`,
        group: "Patients" as const,
        title: `${item.first_name} ${item.last_name}`.trim(),
        subtitle: `${item.email || item.phone || item.country}${plan ? ` · ${plan.title}` : ""}`,
        status: plan?.status ?? item.status ?? "active",
        href: `/pro/patients/${item.id}`,
        keywords: [
          item.first_name,
          item.last_name,
          item.email,
          item.phone,
          item.whatsapp,
          item.country,
          plan?.id,
          plan?.title,
        ]
          .filter(Boolean)
          .join(" "),
      };
    }),
    ...plans
      .filter((item) => item.clinic_id === clinicId)
      .map((item) => {
        const patient = clinicPatients.find((candidate) => candidate.id === item.clinic_patient_id);
        return {
          id: `plan_${item.id}`,
          group: "Treatment Plans" as const,
          title: patient ? `${patient.first_name} ${patient.last_name}`.trim() : item.title,
          subtitle: item.title,
          status: item.status ?? "draft",
          href: `/pro/treatment-plans/${item.id}`,
          keywords: [item.id, item.title, item.summary, patient?.first_name, patient?.last_name]
            .filter(Boolean)
            .join(" "),
        };
      }),
  ];
}
