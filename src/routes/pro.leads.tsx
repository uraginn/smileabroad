import { createFileRoute, Link } from "@tanstack/react-router";
import { useMockStore, selectClinicLeads } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { LEAD_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/ui-bits";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowRight, Clock3, UserRound } from "lucide-react";
import type { Lead, LeadStatus } from "@/types/models";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/pro/leads")({ component: LeadsKanban });

const priorityColor: Record<Lead["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/15 text-accent",
  high: "bg-destructive/15 text-destructive",
};

function LeadsKanban() {
  const activeUser = useAuth((s) => s.user);
  const clinicId = activeUser?.clinic_id ?? "clinic_istanbul";
  const leads = useMockStore(useShallow(selectClinicLeads(clinicId)));
  const users = useMockStore((s) => s.users);
  const updateStatus = useMockStore((s) => s.updateLeadStatus);

  const byStatus = LEAD_STATUSES.reduce<Record<string, Lead[]>>((acc, s) => {
    acc[s.value] = leads.filter((l) => l.status === s.value);
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 flex flex-col h-[calc(100vh-3.5rem)] gap-4">
      <PageHeader
        title="CRM pipeline"
        description="Clinic-scoped leads grouped by lifecycle stage."
        actions={
          <Button disabled title="Manual lead creation is not implemented yet">
            New lead (soon)
          </Button>
        }
      />
      <div className="flex-1 overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex gap-4 min-w-max pb-4 h-full">
          {LEAD_STATUSES.map((col) => (
            <div key={col.value} className="w-[320px] shrink-0">
              <div className="flex items-center justify-between mb-2 sticky top-0 bg-background z-10 py-1">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary">{byStatus[col.value]?.length ?? 0}</Badge>
              </div>
              <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
                {(byStatus[col.value] ?? []).map((lead) => (
                  <Card key={lead.id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{lead.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{lead.patient_country}</p>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px] font-normal capitalize",
                          priorityColor[lead.priority],
                        )}
                      >
                        {lead.priority}
                      </Badge>
                    </div>

                    <p className="text-xs mt-2 line-clamp-2">{lead.treatment}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {lead.source}
                      </Badge>
                      {lead.budget && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Budget: {lead.budget}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <Clock3 className="size-3" />
                        {format(new Date(lead.last_activity_at), "MMM d, HH:mm")}
                      </p>
                      <p className="flex items-center gap-1">
                        <UserRound className="size-3" />
                        {lead.assigned_to
                          ? (users.find((u) => u.id === lead.assigned_to)?.name ?? "Assigned")
                          : "Unassigned"}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      {lead.clinic_patient_id ? (
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                          <Link to="/pro/patients/$id" params={{ id: lead.clinic_patient_id }}>
                            Patient <ArrowRight className="size-3.5 ml-1" />
                          </Link>
                        </Button>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Patient record pending</p>
                      )}

                      <select
                        value={lead.status}
                        onChange={(e) =>
                          updateStatus(
                            lead.id,
                            e.target.value as LeadStatus,
                            activeUser?.clinic_id === lead.clinic_id ? activeUser.id : "system",
                          )
                        }
                        className="text-xs border rounded px-2 py-1 bg-background max-w-[150px]"
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
