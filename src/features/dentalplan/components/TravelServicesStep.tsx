import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { DentalPlan, DentalPlanStudioProps } from "../types/dental-plan.types";
import { DEFAULT_CLINICAL_SERVICES, TRAVEL_SERVICES } from "../data/serviceDefinitions";

type HotelOption = NonNullable<DentalPlanStudioProps["hotels"]>[number];

export function TravelServicesStep({
  plan,
  change,
  hotels = [],
  serviceOptions = DEFAULT_CLINICAL_SERVICES,
  readOnly,
}: {
  plan: DentalPlan;
  change: (patch: Partial<DentalPlan>) => void;
  hotels?: HotelOption[];
  serviceOptions?: string[];
  readOnly?: boolean;
}) {
  const selectedHotel = hotels.find((hotel) => hotel.id === plan.travel.selectedHotelId);
  const defaultHotel = hotels.find((hotel) => hotel.isDefault) ?? hotels[0];
  const update = (patch: Partial<DentalPlan["travel"]>) => {
    if (!readOnly) change({ travel: { ...plan.travel, ...patch } });
  };
  const setService = (service: string, checked: boolean) => {
    const includedServices = checked
      ? [...new Set([...plan.travel.includedServices, service])]
      : plan.travel.includedServices.filter((item) => item !== service);
    update({
      includedServices,
      transferIncluded:
        includedServices.includes("Airport Transfer") ||
        includedServices.includes("Hotel Transfer"),
      ...(service === "Airport Transfer"
        ? { airportTransfer: checked, airportPickup: checked, airportDropoff: checked }
        : {}),
      ...(service === "Hotel Transfer" ? { localTransfer: checked } : {}),
      ...(service === "Flight Included" ? { flightIncluded: checked } : {}),
    });
  };
  const chooseHotel = (hotelId: string, extra: Partial<DentalPlan["travel"]> = {}) => {
    if (readOnly) return;
    const hotel = hotels.find((item) => item.id === hotelId);
    if (!hotel) return;
    const hotelNights = plan.travel.hotelNights || hotel.defaultNights;
    change({
      travel: {
        ...plan.travel,
        ...extra,
        selectedHotelId: hotel.id,
        hotelName: hotel.name,
        hotelDescription: hotel.description,
        hotelNights,
        roomType: hotel.roomTypes[0],
        boardType: hotel.boardTypes[0],
      },
      commercial: {
        ...plan.commercial,
        currency: hotel.currency,
        hotelTotal: hotel.pricePerNight * hotelNights,
      },
    });
  };
  const legacyServices = plan.travel.includedServices.filter(
    (service) => ![...serviceOptions, ...TRAVEL_SERVICES].includes(service),
  );
  const selectableServices = [...new Set([...serviceOptions, ...legacyServices])];
  const packageSelected =
    plan.travel.hotelIncluded ||
    TRAVEL_SERVICES.some((service) => plan.travel.includedServices.includes(service)) ||
    selectableServices.some((service) => plan.travel.includedServices.includes(service));

  return (
    <section className="space-y-4 rounded-xl bg-card p-4 shadow-sm sm:p-6">
      <fieldset disabled={readOnly} className="contents">
        <div>
          <h2 className="text-lg font-semibold">Package</h2>
          <p className="text-sm text-muted-foreground">
            Accommodation, transfers and services included for the patient.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-5 rounded-lg border p-4">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Accommodation</h3>
              <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <span className="font-medium">Accommodation included</span>
                <Switch
                  checked={plan.travel.hotelIncluded}
                  onCheckedChange={(hotelIncluded) => {
                    if (hotelIncluded && !selectedHotel && defaultHotel)
                      chooseHotel(defaultHotel.id, { hotelIncluded, hotelRequired: true });
                    else update({ hotelIncluded, hotelRequired: hotelIncluded });
                  }}
                />
              </label>
              {plan.travel.hotelIncluded && (
                <>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                    <Field label="Hotel">
                      {hotels.length ? (
                        <HotelCombobox
                          hotels={hotels}
                          selected={selectedHotel}
                          onSelect={chooseHotel}
                        />
                      ) : (
                        <p className="rounded-md border p-2 text-sm text-muted-foreground">
                          {plan.travel.hotelName || "No hotels configured in CRM Settings."}
                        </p>
                      )}
                    </Field>
                    <Field label="Nights">
                      <Input
                        type="number"
                        min={0}
                        value={plan.travel.hotelNights}
                        onChange={(event) => {
                          const hotelNights = Math.max(0, Number(event.target.value));
                          change({
                            travel: { ...plan.travel, hotelNights },
                            commercial: {
                              ...plan.commercial,
                              hotelTotal: (selectedHotel?.pricePerNight ?? 0) * hotelNights,
                            },
                          });
                        }}
                      />
                    </Field>
                  </div>
                </>
              )}
            </section>
            <Separator />
            <section>
              <h3 className="mb-2 text-sm font-semibold">Transfers</h3>
              <div className="space-y-1 rounded-lg border p-2">
                <ServiceSwitch
                  label="Airport Transfer"
                  checked={plan.travel.includedServices.includes("Airport Transfer")}
                  onChange={(checked) => setService("Airport Transfer", checked)}
                />
                <ServiceSwitch
                  label="Hotel Transfer"
                  checked={plan.travel.includedServices.includes("Hotel Transfer")}
                  onChange={(checked) => setService("Hotel Transfer", checked)}
                />
                <ServiceSwitch
                  label="Flight Included"
                  checked={plan.travel.includedServices.includes("Flight Included")}
                  onChange={(checked) => setService("Flight Included", checked)}
                />
              </div>
            </section>
            <Separator />
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Included services</h3>
              <ServiceMultiSelect
                options={selectableServices}
                selected={plan.travel.includedServices}
                onChange={setService}
              />
            </section>
          </div>
          <aside className="space-y-4 rounded-lg border bg-muted/20 p-4 lg:sticky lg:top-24 lg:self-start">
            <div>
              <h3 className="font-semibold">Live package summary</h3>
              <p className="text-xs text-muted-foreground">Updates as package options change.</p>
            </div>
            {!packageSelected ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Build the patient package using the controls on the left.
              </p>
            ) : (
              <>
                {selectedHotel && plan.travel.hotelIncluded && (
                  <HotelPreview hotel={selectedHotel} nights={plan.travel.hotelNights} />
                )}
                <div className="divide-y rounded-lg border bg-background">
                  <SummaryRow
                    label="Accommodation"
                    value={
                      plan.travel.hotelIncluded
                        ? `Included · ${plan.travel.hotelNights} nights`
                        : "Not included"
                    }
                  />
                  <SummaryRow
                    label="Airport transfer"
                    value={
                      plan.travel.includedServices.includes("Airport Transfer")
                        ? "Included"
                        : "Not included"
                    }
                  />
                  <SummaryRow
                    label="Hotel transfer"
                    value={
                      plan.travel.includedServices.includes("Hotel Transfer")
                        ? "Included"
                        : "Not included"
                    }
                  />
                  <SummaryRow
                    label="Flight"
                    value={
                      plan.travel.includedServices.includes("Flight Included")
                        ? "Included"
                        : "Not included"
                    }
                  />
                  <SummaryRow
                    label="Included services"
                    value={`${plan.travel.includedServices.filter((item) => !TRAVEL_SERVICES.includes(item)).length} selected`}
                  />
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto text-sm">
                  {plan.travel.includedServices
                    .filter((item) => !TRAVEL_SERVICES.includes(item))
                    .map((service) => (
                      <div key={service} className="flex items-center gap-2 py-1">
                        <Check className="size-3.5 text-primary" />
                        {service}
                      </div>
                    ))}
                </div>
              </>
            )}
          </aside>
        </div>
      </fieldset>
    </section>
  );
}

function ServiceMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (service: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedOptions = options.filter((option) => selected.includes(option));
  const groups = groupServices(options);
  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between sm:w-96">
            {selectedOptions.length
              ? `${selectedOptions.length} services selected`
              : "Select included services"}
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search services..." />
            <CommandList className="max-h-72">
              <CommandEmpty>No services found</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.options.map((service) => (
                    <CommandItem
                      key={service}
                      value={service}
                      onSelect={() => onChange(service, !selected.includes(service))}
                    >
                      <Check
                        className={`mr-2 size-4 ${selected.includes(service) ? "opacity-100" : "opacity-0"}`}
                      />
                      {service}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function HotelCombobox({
  hotels,
  selected,
  onSelect,
}: {
  hotels: HotelOption[];
  selected?: HotelOption;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal">
          <span className="truncate">{selected?.name ?? "Select hotel"}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search hotels..." />
          <CommandList>
            <CommandEmpty>No hotels found</CommandEmpty>
            <CommandGroup>
              {hotels.map((hotel) => (
                <CommandItem
                  key={hotel.id}
                  value={`${hotel.name} ${hotel.categories.join(" ")}`}
                  onSelect={() => {
                    onSelect(hotel.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 size-4 ${hotel.id === selected?.id ? "opacity-100" : "opacity-0"}`}
                  />
                  <span className="truncate">{hotel.name}</span>
                  {hotel.isDefault && (
                    <Badge className="ml-auto" variant="outline">
                      Default
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function HotelPreview({ hotel, nights }: { hotel: HotelOption; nights: number }) {
  return (
    <div className="grid gap-3 rounded-lg bg-muted/30 p-3 md:grid-cols-[12rem_minmax(0,1fr)]">
      {hotel.images.some((image) => image.dataUrl) && (
        <Carousel className="mx-8 md:mx-0 md:w-48">
          <CarouselContent>
            {hotel.images
              .filter((image) => image.dataUrl)
              .map((image) => (
                <CarouselItem key={image.id}>
                  <img
                    src={image.dataUrl}
                    alt={image.name}
                    className="h-28 w-full rounded-md object-cover"
                  />
                </CarouselItem>
              ))}
          </CarouselContent>
          <CarouselPrevious className="-left-8" />
          <CarouselNext className="-right-8" />
        </Carousel>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{hotel.name}</p>
          {hotel.categories.map((category) => (
            <Badge key={category} variant="outline">
              {category}
            </Badge>
          ))}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {nights} night{nights === 1 ? "" : "s"} · {hotel.pricePerNight} {hotel.currency} / night
        </p>
        {hotel.website && (
          <Button asChild variant="link" className="mt-2 h-auto p-0">
            <a href={hotel.website} target="_blank" rel="noopener noreferrer">
              Website <ExternalLink className="size-3" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function ServiceSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md px-2 py-2">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function groupServices(options: string[]) {
  const travelPattern = /travel|hotel|flight|transfer|transport/i;
  const supportPattern = /support|translation|interpreter|coordinator|consult|follow.?up|guide/i;
  const grouped = [
    { label: "Clinical", options: [] as string[] },
    { label: "Travel", options: [] as string[] },
    { label: "Support", options: [] as string[] },
  ];
  for (const option of options) {
    const group = travelPattern.test(option)
      ? grouped[1]
      : supportPattern.test(option)
        ? grouped[2]
        : grouped[0];
    group.options.push(option);
  }
  return grouped.filter((group) => group.options.length > 0);
}
