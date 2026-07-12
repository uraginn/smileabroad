import { createFileRoute } from "@tanstack/react-router";
import { useMockStore } from "@/lib/mock/store";
import { PageHeader, StatCard } from "@/components/ui-bits";
import { Building2, Users, ClipboardList, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminDash });

function AdminDash() {
  const s = useMockStore.getState();
  return (
    <div className="p-6 max-w-6xl">
      <PageHeader title="Platform overview" description="All tenants, all activity." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Clinics" value={s.clinics.length} tone="accent" />
        <StatCard icon={Users} label="Users" value={s.users.length} />
        <StatCard
          icon={ClipboardList}
          label="Treatment plans"
          value={s.treatmentPlans.length}
          tone="success"
        />
        <StatCard
          icon={CheckCircle2}
          label="Accepted plans"
          value={s.treatmentPlans.filter((plan) => plan.status === "accepted").length}
        />
      </div>
    </div>
  );
}
