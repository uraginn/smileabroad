import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/treatments", label: "Treatments" },
  { to: "/destinations", label: "Destinations" },
  { to: "/clinics", label: "Clinics" },
  { to: "/for-clinics", label: "For clinics" },
  { to: "/about", label: "About" },
] as const;

export function PublicHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === n.to ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2">Clinic login</Link>
          <Button asChild size="sm" className="hidden sm:inline-flex"><Link to="/assessment">Start assessment</Link></Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="mt-8 flex flex-col gap-1">
                {NAV.map((n) => (
                  <Link key={n.to} to={n.to} className="px-3 py-2 rounded-md hover:bg-secondary">{n.label}</Link>
                ))}
                <Link to="/login" className="px-3 py-2 rounded-md hover:bg-secondary">Clinic login</Link>
                <Link to="/assessment" className="px-3 py-2 rounded-md bg-primary text-primary-foreground mt-2 text-center">Start assessment</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface mt-24">
      <div className="container-app py-14 grid gap-10 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">
            Verified dental clinics abroad, transparent quotes, concierge care.
          </p>
        </div>
        <FooterCol title="Patients" links={[
          ["Start assessment", "/assessment"],
          ["How it works", "/how-it-works"],
          ["Treatments", "/treatments"],
          ["Destinations", "/destinations"],
        ]} />
        <FooterCol title="Clinics" links={[
          ["For clinics", "/for-clinics"],
          ["Join the network", "/for-clinics"],
          ["Clinic login", "/login"],
        ]} />
        <FooterCol title="Company" links={[
          ["About", "/about"],
          ["Clinics directory", "/clinics"],
        ]} />
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SmileAbroad. Estimates are not diagnoses.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="mt-4 space-y-2">
        {links.map(([label, to]) => (
          <li key={to}><Link to={to as any} className="text-sm text-muted-foreground hover:text-foreground">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
