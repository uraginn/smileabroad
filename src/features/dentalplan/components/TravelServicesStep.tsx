import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { DentalPlan, DentalPlanStudioProps } from "../types/dental-plan.types";
import { derivePlanDefaults } from "../utils/derivePlanDefaults";
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
  const defaults = derivePlanDefaults(plan);
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

  return (
    <section className="space-y-5 rounded-xl bg-card p-4 shadow-sm sm:p-6">
      <fieldset disabled={readOnly} className="contents">
        <div>
          <h2 className="text-lg font-semibold">Package</h2>
          <p className="text-sm text-muted-foreground">
            Accommodation, transfers and services included for the patient.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
          <span>
            Suggested package: <b>{defaults.recommendedVisits} visit(s)</b> ·{" "}
            {defaults.healingPeriodSummary.toLowerCase()}
          </span>
          <Badge variant="outline">Confirm clinically</Badge>
        </div>
        <div>
          <div>
            <Accordion type="multiple" defaultValue={["accommodation"]} className="border-y">
              <AccordionItem value="accommodation">
                <AccordionTrigger>
                  <SectionTitle
                    title="Accommodation"
                    detail={
                      plan.travel.hotelIncluded
                        ? plan.travel.hotelName || "Included"
                        : "Not included"
                    }
                  />
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                    <span>
                      <span className="block font-medium">Include accommodation</span>
                      <span className="text-xs text-muted-foreground">
                        Add a clinic-configured hotel to this package.
                      </span>
                    </span>
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
                      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                        <Field label="Hotel">
                          {hotels.length ? (
                            <Select value={selectedHotel?.id} onValueChange={chooseHotel}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select hotel" />
                              </SelectTrigger>
                              <SelectContent>
                                {hotels.map((hotel) => (
                                  <SelectItem key={hotel.id} value={hotel.id}>
                                    {hotel.name}
                                    {hotel.isDefault ? " · Default" : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                      {selectedHotel && <HotelPreview hotel={selectedHotel} />}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="transfers">
                <AccordionTrigger>
                  <SectionTitle title="Transfers" detail={transferSummary(plan)} />
                </AccordionTrigger>
                <AccordionContent className="grid gap-3 pt-2 sm:grid-cols-3">
                  <ServiceSwitch
                    label="Airport"
                    description="Pickup and drop-off"
                    checked={plan.travel.includedServices.includes("Airport Transfer")}
                    onChange={(checked) => setService("Airport Transfer", checked)}
                  />
                  <ServiceSwitch
                    label="Hotel"
                    description="Hotel and clinic travel"
                    checked={plan.travel.includedServices.includes("Hotel Transfer")}
                    onChange={(checked) => setService("Hotel Transfer", checked)}
                  />
                  <ServiceSwitch
                    label="Flight"
                    description="Flight cost included"
                    checked={plan.travel.includedServices.includes("Flight Included")}
                    onChange={(checked) => setService("Flight Included", checked)}
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="services">
                <AccordionTrigger>
                  <SectionTitle
                    title="Included Services"
                    detail={`${plan.travel.includedServices.filter((item) => !TRAVEL_SERVICES.includes(item)).length} selected`}
                  />
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <ServiceMultiSelect
                    options={selectableServices}
                    selected={plan.travel.includedServices}
                    onChange={setService}
                  />
                  <p className="text-xs text-muted-foreground">
                    Service options are managed in Dental Planner Settings.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
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
  return (
    <div className="space-y-3">
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
              {options.map((service) => (
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-2">
        {selectedOptions.map((service) => (
          <Badge
            key={service}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => onChange(service, false)}
          >
            {service} ×
          </Badge>
        ))}
      </div>
    </div>
  );
}

function HotelPreview({ hotel }: { hotel: HotelOption }) {
  return (
    <div className="grid gap-4 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{hotel.name}</p>
          {hotel.categories.map((category) => (
            <Badge key={category} variant="outline">
              {category}
            </Badge>
          ))}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {hotel.pricePerNight} {hotel.currency} / night
        </p>
        {hotel.description && <p className="mt-3 text-sm">{hotel.description}</p>}
        {hotel.website && (
          <Button asChild variant="link" className="mt-2 h-auto p-0">
            <a href={hotel.website} target="_blank" rel="noopener noreferrer">
              Website <ExternalLink className="size-3" />
            </a>
          </Button>
        )}
      </div>
      {hotel.images.some((image) => image.dataUrl) && (
        <Carousel className="mx-10">
          <CarouselContent>
            {hotel.images
              .filter((image) => image.dataUrl)
              .map((image) => (
                <CarouselItem key={image.id}>
                  <img
                    src={image.dataUrl}
                    alt={image.name}
                    className="h-40 w-full rounded-md object-cover"
                  />
                </CarouselItem>
              ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      )}
    </div>
  );
}

function ServiceSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function SectionTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span>{title}</span>
      <Badge variant="outline" className="font-normal">
        {detail}
      </Badge>
    </span>
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

function transferSummary(plan: DentalPlan) {
  const count = TRAVEL_SERVICES.filter((service) =>
    plan.travel.includedServices.includes(service),
  ).length;
  return count ? `${count} included` : "None";
}
