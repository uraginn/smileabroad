import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, invert = false }: { className?: string; invert?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 group", className)}>
      <span
        className={cn(
          "grid place-items-center size-8 rounded-lg",
          invert ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        <Sparkles className="size-4" />
      </span>
      <span
        className={cn(
          "font-display text-xl font-semibold tracking-tight",
          invert && "text-sidebar-foreground",
        )}
      >
        Smile<span className="text-accent">Abroad</span>
      </span>
    </Link>
  );
}
