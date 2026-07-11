import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickAssessmentShell({
  step,
  total,
  label,
  children,
}: {
  step: number;
  total: number;
  label: string;
  children: ReactNode;
}) {
  const progress = ((step + 1) / total) * 100;
  return (
    <main className="min-h-screen overflow-x-hidden bg-surface/60 text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-3 py-3 sm:px-6 sm:py-6">
        <header className="mb-3 px-1 sm:mb-4">
          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span>Quick assessment</span>
            <span>
              Step {step + 1} of {total}
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10"
            role="progressbar"
            aria-label="Assessment progress"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={step + 1}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-[11px] text-muted-foreground">{label}</p>
        </header>
        <section className="flex flex-1 flex-col rounded-xl border bg-background p-4 shadow-sm sm:p-7">
          {children}
        </section>
      </div>
    </main>
  );
}

export function AssessmentQuestion({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
      <h1 className="max-w-2xl font-display text-2xl font-semibold leading-tight sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function AssessmentOption({
  selected,
  children,
  onClick,
  multiple = false,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
  multiple?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "group flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-background px-3.5 py-2.5 text-left text-sm font-medium transition-colors hover:border-primary/60 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none",
        selected && "border-primary bg-primary/5 text-primary",
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border transition",
          multiple ? "rounded-md" : "rounded-full",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-surface",
        )}
      >
        {selected && <Check className="size-3.5" aria-hidden="true" />}
      </span>
    </button>
  );
}

export function AssessmentNavigation({
  back,
  next,
  canContinue,
  first,
  last,
  submitting,
}: {
  back: () => void;
  next: () => void;
  canContinue: boolean;
  first: boolean;
  last: boolean;
  submitting?: boolean;
}) {
  return (
    <nav
      className="sticky bottom-0 z-10 -mx-4 mt-auto flex items-center justify-between gap-2 border-t bg-background/95 px-4 pb-1 pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-6 sm:backdrop-blur-none"
      aria-label="Assessment navigation"
    >
      {!first ? (
        <button
          type="button"
          onClick={back}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={next}
        disabled={!canContinue || submitting}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
      >
        {submitting ? "Creating roadmap…" : last ? "Create My Roadmap" : "Continue"}
        <ArrowRight className="size-4" />
      </button>
    </nav>
  );
}

export function AssessmentInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-background px-3.5 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20",
        props.className,
      )}
    />
  );
}

export function UploadCard({
  title,
  hint,
  accept,
  multiple,
  selected,
  onChange,
}: {
  title: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  selected: boolean;
  onChange: (files: FileList | null) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-lg border border-dashed border-primary/30 bg-primary/[0.025] p-4 transition-colors hover:border-primary hover:bg-primary/5 focus-within:ring-2 focus-within:ring-primary">
      <input
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => onChange(event.target.files)}
      />
      <span className="flex items-start justify-between gap-4">
        <span>
          <span className="block font-semibold">
            {title} <span className="text-xs font-normal text-muted-foreground">Optional</span>
          </span>
          <span className="mt-1 block text-sm leading-5 text-muted-foreground">{hint}</span>
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            selected ? "bg-primary/10 text-primary" : "bg-surface text-muted-foreground",
          )}
        >
          {selected ? "Selected" : "Choose"}
        </span>
      </span>
    </label>
  );
}

export function AssessmentAccordion({
  title,
  summary,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const regionId = `medical-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section className="overflow-hidden rounded-lg border bg-background">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={onToggle}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div id={regionId} className="border-t bg-surface/30 p-3">
          {children}
        </div>
      )}
    </section>
  );
}
