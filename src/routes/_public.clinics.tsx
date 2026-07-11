import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useMockStore } from "@/lib/mock/store";
import { ClinicCard } from "@/components/clinic-card";
import { PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/_public/clinics")({
  head: () => ({ meta: [{ title: "Verified clinics — SmileAbroad" }, { name: "description", content: "Explore verified dental clinics worldwide, with real ratings and transparent pricing." }] }),
  component: Clinics,
});

function Clinics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const clinics = useMockStore((s) => s.clinics);
  if (pathname !== "/clinics") return <Outlet />;
  return (
    <div className="container-app py-16">
      <PageHeader title="Verified clinics" description="Each clinic is audited for credentials, hygiene and outcomes. Ratings blend Google & Trustpilot." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clinics.map((c) => <ClinicCard key={c.id} clinic={c} />)}
      </div>
    </div>
  );
}
