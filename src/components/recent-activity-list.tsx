import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-bits";
import { format } from "date-fns";
import {
  CalendarCheck,
  CheckSquare,
  ClipboardList,
  FileText,
  FileUp,
  Kanban,
  type LucideIcon,
} from "lucide-react";

export type ActivityItem = {
  id: string;
  type: "lead" | "task" | "appointment" | "application" | "plan" | "note";
  title: string;
  patient?: string;
  status?: string;
  timestamp: string;
  description?: string;
  to?: string;
  params?: Record<string, string>;
};

const iconMap: Record<ActivityItem["type"], LucideIcon> = {
  lead: Kanban,
  task: CheckSquare,
  appointment: CalendarCheck,
  application: FileUp,
  plan: ClipboardList,
  note: FileText,
};

export function RecentActivityList({
  items,
  title = "Recent activity",
}: {
  items: ActivityItem[];
  title?: string;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <Badge variant="outline">{items.length}</Badge>
        </div>

        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No activity yet"
              description="New lead updates, tasks, appointments and plan activity will appear here."
            />
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => {
              const Icon = iconMap[item.type];
              const content = (
                <div className="flex gap-3 px-6 py-3 hover:bg-surface/40 transition-colors">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0 mt-0.5">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.status && (
                        <Badge variant="secondary" className="text-[10px]">
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    {item.patient && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Patient: {item.patient}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(item.timestamp), "MMM d, HH:mm")}
                  </p>
                </div>
              );

              if (item.to) {
                return (
                  <Link key={item.id} to={item.to} params={item.params as never}>
                    {content}
                  </Link>
                );
              }

              return <div key={item.id}>{content}</div>;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
