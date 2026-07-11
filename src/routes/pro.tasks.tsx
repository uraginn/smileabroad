import { createFileRoute } from "@tanstack/react-router";
import { useMockStore, selectClinicTasks } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/pro/tasks")({ component: Tasks });

function Tasks() {
  const clinicId = useAuth((s) => s.user?.clinic_id) ?? "clinic_istanbul";
  const tasks = useMockStore(useShallow(selectClinicTasks(clinicId)));
  const toggle = useMockStore((s) => s.toggleTask);
  return (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Tasks" description="Follow-ups, calls and reminders." />
      {tasks.length === 0 ? <EmptyState title="No tasks" /> :
        <Card><CardContent className="p-0 divide-y">
          {tasks.map((t) => (
            <label key={t.id} className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface">
              <Checkbox checked={t.done} onCheckedChange={() => toggle(t.id)} />
              <div className="flex-1"><p className={t.done ? "line-through text-muted-foreground" : ""}>{t.title}</p>
                {t.due_at && <p className="text-xs text-muted-foreground">Due {format(new Date(t.due_at), "MMM d")}</p>}
              </div>
            </label>
          ))}
        </CardContent></Card>}
    </div>
  );
}
