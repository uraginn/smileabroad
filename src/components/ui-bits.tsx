import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  trend,
  comparison,
  loading,
  emptyText = "No data",
}: {
  icon: LucideIcon;
  label: string;
  value?: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "accent";
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  comparison?: string;
  loading?: boolean;
  emptyText?: string;
}) {
  const toneMap = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    accent: "bg-accent/15 text-accent",
  };
  const trendTone = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-4">
        <div className={cn("size-11 rounded-xl grid place-items-center shrink-0", toneMap[tone])}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-1" />
          ) : (
            <p className="text-2xl font-display font-semibold mt-0.5">{value ?? emptyText}</p>
          )}
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          {(trend || comparison) && (
            <div className="mt-1 flex items-center gap-2 text-xs">
              {trend && (
                <span className={cn("font-medium", trendTone[trend.direction])}>{trend.value}</span>
              )}
              {comparison && <span className="text-muted-foreground">{comparison}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-border rounded-xl p-10 text-center bg-surface/50">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
