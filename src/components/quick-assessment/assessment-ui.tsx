import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
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
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.10),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--surface)))] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-5 sm:px-7 sm:py-8">
        <header className="mb-5 sm:mb-7">
          <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span>Quick assessment</span>
            <span>
              Step {step + 1} of {total}
            </span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10"
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
          <p className="mt-2 text-right text-xs text-muted-foreground">{label}</p>
        </header>
        <section className="flex flex-1 flex-col rounded-[1.75rem] border border-primary/10 bg-background/95 p-5 shadow-[0_24px_70px_-36px_hsl(var(--primary)/0.45)] sm:p-9">
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
      <h1 className="max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
      <div className="mt-7">{children}</div>
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
        "group flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none",
        selected && "border-primary bg-primary/5 text-primary shadow-md",
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border transition",
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
      className="mt-auto flex items-center justify-between gap-3 pt-8"
      aria-label="Assessment navigation"
    >
      {!first ? (
        <button
          type="button"
          onClick={back}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 motion-reduce:transform-none"
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
        "h-12 w-full rounded-xl border border-input bg-background px-4 text-base shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20",
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
    <label className="block cursor-pointer rounded-2xl border border-dashed border-primary/30 bg-primary/[0.025] p-5 transition hover:border-primary hover:bg-primary/5 focus-within:ring-2 focus-within:ring-primary">
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
