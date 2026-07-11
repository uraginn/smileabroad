import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PlanDocumentShell({
  variant,
  style,
  children,
}: {
  variant: "preliminary" | "clinic";
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-h-screen",
        variant === "preliminary" ? "bg-surface" : "shared-plan bg-slate-50 text-slate-900",
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export function PlanDocumentHeader({
  variant,
  eyebrow,
  title,
  description,
  badge,
  actions,
  brand,
}: {
  variant: "preliminary" | "clinic";
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
  brand?: ReactNode;
}) {
  if (variant === "clinic")
    return (
      <header
        className="text-white"
        style={{
          background: "linear-gradient(135deg, var(--clinic-primary), var(--clinic-secondary))",
        }}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-6 sm:px-6">
          {brand}
          <div className="min-w-48 flex-1">
            {eyebrow && <p className="text-xs uppercase tracking-wider text-white/75">{eyebrow}</p>}
            <h1 className="text-2xl font-semibold">{title}</h1>
            {description && <p className="mt-1 text-sm text-white/85">{description}</p>}
          </div>
          {actions}
        </div>
      </header>
    );
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
        {description && (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

export function PlanSummaryGrid({
  items,
}: {
  items: { label: string; value: string; icon?: ReactNode }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border bg-background p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.icon}
            {item.label}
          </div>
          <p className="mt-1 text-sm font-medium">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function PlanSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("print-card", className)}>
      <CardContent className="p-5 sm:p-7">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function PlanDisclaimer({
  children,
  preliminary = false,
}: {
  children: ReactNode;
  preliminary?: boolean;
}) {
  const Icon = preliminary ? AlertTriangle : ShieldCheck;
  return (
    <div
      className={cn(
        "print-card flex gap-3 rounded-lg border p-4 text-sm",
        preliminary
          ? "border-warning/40 bg-warning/5 text-warning-foreground"
          : "bg-background text-muted-foreground",
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
