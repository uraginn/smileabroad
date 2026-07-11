import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link, useRouterState } from "@tanstack/react-router";

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
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{description ?? "There is nothing to display here yet."}</p>
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const segments = pathname.startsWith("/pro") ? pathname.split("/").filter(Boolean) : [];
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        {segments.length > 1 && <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Link to="/pro/dashboard" className="hover:text-foreground">CRM</Link>{segments.slice(1).map((segment, index) => <span key={`${segment}-${index}`} className="flex items-center gap-1.5"><span aria-hidden="true">/</span><span className={index === segments.length - 2 ? "text-foreground" : ""}>{segment.replace(/-/g, " ").replace(/^./, (letter) => letter.toUpperCase())}</span></span>)}</nav>}
        <h1 className="text-2xl font-display font-semibold">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

const statusTone: Record<string, string> = {
  draft: "bg-muted text-muted-foreground", new_lead: "bg-primary/10 text-primary",
  awaiting_images: "bg-warning/20 text-warning-foreground", doctor_review: "bg-warning/20 text-warning-foreground",
  awaiting_doctor_review: "bg-warning/20 text-warning-foreground", contacted: "bg-accent/15 text-accent",
  treatment_planning: "bg-accent/15 text-accent", approved: "bg-success/15 text-success",
  sent: "bg-primary/10 text-primary", quote_sent: "bg-primary/10 text-primary", viewed: "bg-primary/10 text-primary",
  accepted: "bg-success/15 text-success", booked: "bg-success/15 text-success", completed: "bg-success/15 text-success",
  open: "bg-primary/10 text-primary", done: "bg-success/15 text-success",
  declined: "bg-destructive/15 text-destructive", lost: "bg-destructive/15 text-destructive",
  expired: "bg-muted text-muted-foreground", archived: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className }: { status?: string; className?: string }) {
  const value = status || "draft";
  return <Badge className={cn("border-0 capitalize", statusTone[value] ?? "bg-muted text-muted-foreground", className)}>{value.replace(/_/g, " ")}</Badge>;
}

export function PageLoading({ label = "Loading workspace" }: { label?: string }) {
  return <div className="p-4 sm:p-6 space-y-5" role="status" aria-label={label}><Skeleton className="h-5 w-40" /><Skeleton className="h-9 w-72 max-w-full" /><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}</div><Skeleton className="h-64 rounded-xl" /></div>;
}
