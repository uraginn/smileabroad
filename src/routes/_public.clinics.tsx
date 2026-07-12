import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Check, ChevronsUpDown, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClinicCard } from "@/components/clinic-card";
import { ClinicRoadmapSummary } from "@/components/clinic-roadmap-summary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui-bits";
import {
  COMPARE_CLINICS_KEY,
  deriveClinicSearchDefaults,
  rankClinicsForRoadmap,
  readActiveJourney,
  resolveJourneyContext,
  type ClinicFilters,
  type ClinicSort,
} from "@/lib/clinic-directory";
import { useMockStore, useMockStoreHydrated } from "@/lib/mock/store";
import type { Clinic } from "@/types/models";

type ClinicSearch = { country?: string; city?: string; treatments?: string; sort?: ClinicSort };

export const Route = createFileRoute("/_public/clinics")({
  validateSearch: (search: Record<string, unknown>): ClinicSearch => ({
    country: typeof search.country === "string" ? search.country : undefined,
    city: typeof search.city === "string" ? search.city : undefined,
    treatments: typeof search.treatments === "string" ? search.treatments : undefined,
    sort: (["recommended", "rating", "reviews", "name"].includes(String(search.sort))
      ? search.sort
      : "recommended") as ClinicSort,
  }),
  head: () => ({ meta: [{ title: "Find dental clinics — SmileAbroad" }] }),
  component: Clinics,
});

function Clinics() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/clinics") return <Outlet />;
  return <ClinicDirectory />;
}

function ClinicDirectory() {
  const hydrated = useMockStoreHydrated();
  const navigate = useNavigate({ from: "/clinics" });
  const search = Route.useSearch();
  const clinics = useMockStore((state) => state.clinics);
  const roadmaps = useMockStore((state) => state.roadmaps);
  const assessments = useMockStore((state) => state.assessments);
  const [journey, setJourney] = useState<ReturnType<typeof readActiveJourney>>();
  const { roadmap, assessment } = useMemo(
    () => resolveJourneyContext(journey, roadmaps, assessments),
    [journey, roadmaps, assessments],
  );
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    setJourney(readActiveJourney());
    try {
      setSelected(JSON.parse(sessionStorage.getItem(COMPARE_CLINICS_KEY) ?? "[]"));
    } catch {
      setSelected([]);
    }
  }, []);
  const [compareOpen, setCompareOpen] = useState(false);
  const defaults = useMemo(
    () => deriveClinicSearchDefaults(assessment, roadmap),
    [assessment, roadmap],
  );
  useEffect(() => {
    if (!roadmap || search.country || search.city || search.treatments) return;
    void navigate({
      replace: true,
      search: {
        country: defaults.country,
        city: defaults.city,
        treatments: defaults.treatments.join(",") || undefined,
        sort: "recommended",
      },
    });
  }, [defaults, navigate, roadmap, search.city, search.country, search.treatments]);
  const filters: ClinicFilters = {
    country: search.country,
    city: search.city,
    treatments: search.treatments?.split(",").filter(Boolean) ?? [],
    sort: search.sort ?? "recommended",
  };
  const countries = [...new Set(clinics.map((item) => item.country))].sort();
  const cities = [
    ...new Set(
      clinics
        .filter((item) => !filters.country || item.country === filters.country)
        .map((item) => item.city),
    ),
  ].sort();
  const treatments = [
    ...new Set(clinics.flatMap((item) => item.supported_treatments ?? [])),
  ].sort();
  const results = rankClinicsForRoadmap({ clinics, roadmap, assessment, filters });
  const update = (next: Partial<ClinicFilters>) =>
    void navigate({
      search: {
        country: next.country === "" ? undefined : (next.country ?? filters.country),
        city: next.city === "" ? undefined : (next.city ?? filters.city),
        treatments: (next.treatments ?? filters.treatments).join(",") || undefined,
        sort: next.sort ?? filters.sort,
      },
    });
  const toggleCompare = (clinic: Clinic) =>
    setSelected((current) => {
      const next = current.includes(clinic.id)
        ? current.filter((id) => id !== clinic.id)
        : current.length >= 3
          ? current
          : [...current, clinic.id];
      if (!current.includes(clinic.id) && current.length >= 3)
        toast.info("You can compare up to 3 clinics.");
      sessionStorage.setItem(COMPARE_CLINICS_KEY, JSON.stringify(next));
      return next;
    });
  const selectedClinics = clinics.filter((item) => selected.includes(item.id));
  if (!hydrated)
    return (
      <div className="container-app py-16 text-sm text-muted-foreground">Loading clinics…</div>
    );
  return (
    <div className="container-app py-10 md:py-14">
      <PageHeader
        title={roadmap ? "Clinics matched to your Roadmap" : "Explore dental clinics"}
        description={
          roadmap
            ? "These clinics match your destination and expected treatment interests. Final suitability and pricing must be confirmed directly by the clinic."
            : "Browse public clinic profiles and compare practical travel and treatment information."
        }
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="min-w-0 space-y-6">
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <SlidersHorizontal className="size-4" />
              Filters
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FilterCommand
                label="Country"
                value={filters.country}
                options={countries}
                onSelect={(value) => update({ country: value, city: "" })}
              />
              <Select
                value={filters.city ?? "all"}
                onValueChange={(value) => update({ city: value === "all" ? "" : value })}
              >
                <SelectTrigger aria-label="City">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TreatmentFilter
                options={treatments}
                selected={filters.treatments}
                onChange={(value) => update({ treatments: value })}
              />
              <Select
                value={filters.sort}
                onValueChange={(value) => update({ sort: value as ClinicSort })}
              >
                <SelectTrigger aria-label="Sort clinics">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="reviews">Review count</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.country && <Badge variant="secondary">{filters.country}</Badge>}
              {filters.city && <Badge variant="secondary">{filters.city}</Badge>}
              {filters.treatments.map((item) => (
                <Badge key={item} variant="secondary">
                  {label(item)}
                </Badge>
              ))}
              {(filters.country || filters.city || filters.treatments.length) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => update({ country: "", city: "", treatments: [] })}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
          {results.length === 0 ? (
            <Alert>
              <AlertTitle>No clinics match every selected filter.</AlertTitle>
              <AlertDescription className="mt-2 flex flex-wrap gap-2">
                Try a broader selection.
                <Button size="sm" variant="outline" onClick={() => update({ city: "" })}>
                  Remove city
                </Button>
                <Button size="sm" variant="outline" onClick={() => update({ treatments: [] })}>
                  Clear treatment
                </Button>
                <Button size="sm" onClick={() => update({ country: "", city: "", treatments: [] })}>
                  View all clinics
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {results.map((clinic) => (
                <ClinicCard
                  key={clinic.id}
                  clinic={clinic}
                  selectedForCompare={selected.includes(clinic.id)}
                  onCompare={toggleCompare}
                />
              ))}
            </div>
          )}
        </main>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {roadmap && assessment && (
            <ClinicRoadmapSummary roadmap={roadmap} assessment={assessment} />
          )}
          {!roadmap && journey && (
            <Alert>
              <AlertTitle>Roadmap context unavailable</AlertTitle>
              <AlertDescription>You can continue browsing clinics normally.</AlertDescription>
            </Alert>
          )}
        </aside>
      </div>
      {selected.length > 0 && (
        <div className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border bg-background p-3 shadow-xl">
          <span className="text-sm font-medium">{selected.length}/3 selected</span>
          <Button disabled={selected.length < 2} onClick={() => setCompareOpen(true)}>
            Compare clinics
          </Button>
        </div>
      )}
      <ComparisonDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        clinics={selectedClinics}
      />
    </div>
  );
}

function FilterCommand({
  label: title,
  value,
  options,
  onSelect,
}: {
  label: string;
  value?: string;
  options: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="justify-between font-normal">
          {value ?? `All ${title.toLowerCase()}s`}
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder={`Search ${title.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => onSelect("")}>All {title.toLowerCase()}s</CommandItem>
              {options.map((option) => (
                <CommandItem key={option} onSelect={() => onSelect(option)}>
                  <Check
                    className={`mr-2 size-4 ${value === option ? "opacity-100" : "opacity-0"}`}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
function TreatmentFilter({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between font-normal">
          {selected.length
            ? `${selected.length} treatment${selected.length > 1 ? "s" : ""}`
            : "All treatments"}
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Search treatments…" />
          <CommandList>
            <CommandEmpty>No treatment found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  onSelect={() =>
                    onChange(
                      selected.includes(option)
                        ? selected.filter((item) => item !== option)
                        : [...selected, option],
                    )
                  }
                >
                  <Check
                    className={`mr-2 size-4 ${selected.includes(option) ? "opacity-100" : "opacity-0"}`}
                  />
                  {label(option)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
function ComparisonDialog({
  open,
  onOpenChange,
  clinics,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  clinics: Clinic[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-auto">
        <DialogHeader>
          <DialogTitle>Compare clinics</DialogTitle>
          <DialogDescription>
            Compare public listing information. Treatment suitability and final prices require
            clinic review.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clinics.map((clinic) => (
            <div key={clinic.id} className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold">{clinic.name}</h3>
              <p className="text-sm">
                {clinic.city}, {clinic.country}
              </p>
              <p className="text-sm">
                ★ {clinic.google_rating} · {clinic.google_reviews} reviews
              </p>
              <div className="flex flex-wrap gap-1">
                {(clinic.supported_treatments ?? []).slice(0, 4).map((item) => (
                  <Badge key={item} variant="outline">
                    {label(item)}
                  </Badge>
                ))}
              </div>
              <p className="text-sm">Hotel: {clinic.hotel_included ? "Included" : "Ask clinic"}</p>
              <p className="text-sm">
                Transfers: {clinic.transfers_included ? "Included" : "Ask clinic"}
              </p>
              <p className="text-sm">{clinic.languages.join(", ")}</p>
              <Button asChild className="w-full">
                <a href={`/clinics/${clinic.slug}`}>View clinic</a>
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
const label = (key: string) =>
  key
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
