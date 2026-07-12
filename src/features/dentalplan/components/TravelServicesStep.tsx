import { useState, type ReactNode } from "react";
import { LockKeyhole, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { DentalPlan, DentalPlanStudioProps } from "../types/dental-plan.types";
import { derivePlanDefaults } from "../utils/derivePlanDefaults";

const CLINICAL_SERVICES = [
  "Prescribed medications",
  "Panoramic X-ray",
  "3D X-ray / CBCT",
  "Initial clinical examination",
  "Digital dental scan",
  "Temporary teeth where required",
];
const TRAVEL_SERVICES = ["Airport Transfer", "Hotel Transfer", "Flight Included"];
const KNOWN_SERVICES = [...CLINICAL_SERVICES, ...TRAVEL_SERVICES];
type HotelOption = NonNullable<DentalPlanStudioProps["hotels"]>[number];

export function TravelServicesStep({
  plan,
  change,
  hotels = [],
}: {
  plan: DentalPlan;
  change: (patch: Partial<DentalPlan>) => void;
  hotels?: HotelOption[];
}) {
  const [custom, setCustom] = useState("");
  const [hotelQuery, setHotelQuery] = useState("");
  const defaults = derivePlanDefaults(plan);
  const selectedHotel = hotels.find((hotel) => hotel.id === plan.travel.selectedHotelId);
  const defaultHotel = hotels.find((hotel) => hotel.isDefault) ?? hotels[0];
  const normalizedHotelQuery = hotelQuery.trim().toLocaleLowerCase();
  const filteredHotels = normalizedHotelQuery
    ? hotels.filter((hotel) =>
        `${hotel.name} ${hotel.category}`.toLocaleLowerCase().includes(normalizedHotelQuery),
      )
    : hotels;
  const update = (patch: Partial<DentalPlan["travel"]>) =>
    change({ travel: { ...plan.travel, ...patch } });
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
        roomType: hotel.roomTypes.includes(plan.travel.roomType ?? "")
          ? plan.travel.roomType
          : hotel.roomTypes[0],
        boardType: hotel.boardTypes.includes(plan.travel.boardType ?? "")
          ? plan.travel.boardType
          : hotel.boardTypes[0],
      },
      commercial: {
        ...plan.commercial,
        currency: hotel.currency,
        hotelTotal: hotel.pricePerNight * hotelNights,
      },
    });
  };
  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="space-y-2 p-4 text-sm">
          <p>
            This plan is currently expected to require <b>{defaults.recommendedVisits} visit(s)</b>{" "}
            with <b>{defaults.healingPeriodSummary.toLowerCase()}</b>.
          </p>
          <p className="text-xs text-muted-foreground">
            Generated from the selected treatments and linked groups; confirm clinically.
          </p>
          {defaults.warnings.map((warning) => (
            <p key={warning} className="text-xs text-warning-foreground">
              {warning}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Hotel</CardTitle>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={plan.travel.hotelIncluded}
              onCheckedChange={(hotelIncluded) => {
                if (hotelIncluded && !selectedHotel && defaultHotel)
                  chooseHotel(defaultHotel.id, { hotelIncluded, hotelRequired: hotelIncluded });
                else update({ hotelIncluded, hotelRequired: hotelIncluded });
              }}
            />
            Included
          </label>
        </CardHeader>
        {plan.travel.hotelIncluded && (
          <CardContent className="space-y-4">
            {hotels.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Filter hotels">
                  <Input
                    value={hotelQuery}
                    onChange={(event) => setHotelQuery(event.target.value)}
                    placeholder="Name or category"
                  />
                </Field>
                <Field label="Configured hotel">
                  <Select value={selectedHotel?.id} onValueChange={chooseHotel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hotel" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredHotels.map((hotel) => (
                        <SelectItem key={hotel.id} value={hotel.id}>
                          {hotel.name} · {hotel.category}
                          {hotel.isDefault ? " · Default" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Field label="Room type">
                  <OptionSelect
                    value={plan.travel.roomType}
                    options={selectedHotel?.roomTypes ?? legacyOption(plan.travel.roomType)}
                    placeholder="Select room"
                    onChange={(roomType) => update({ roomType })}
                  />
                </Field>
                <Field label="Board type">
                  <OptionSelect
                    value={plan.travel.boardType}
                    options={selectedHotel?.boardTypes ?? legacyOption(plan.travel.boardType)}
                    placeholder="Select board"
                    onChange={(boardType) => update({ boardType })}
                  />
                </Field>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {plan.travel.hotelName
                  ? `Legacy hotel: ${plan.travel.hotelName}`
                  : "No active hotels are configured. Add one in CRM Settings."}
              </p>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!plan.travel.companionIncluded}
                onCheckedChange={(value) => update({ companionIncluded: value === true })}
              />
              Companion included
            </label>
            {selectedHotel && <HotelPreview hotel={selectedHotel} />}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfers and flight</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <ServiceSwitch
            label="Airport Transfer"
            description="Airport pickup and drop-off"
            checked={plan.travel.includedServices.includes("Airport Transfer")}
            onChange={(checked) => setService("Airport Transfer", checked)}
          />
          <ServiceSwitch
            label="Hotel Transfer"
            description="Hotel and clinic transfers"
            checked={plan.travel.includedServices.includes("Hotel Transfer")}
            onChange={(checked) => setService("Hotel Transfer", checked)}
          />
          <ServiceSwitch
            label="Flight Included"
            description="Flight cost included in package"
            checked={plan.travel.includedServices.includes("Flight Included")}
            onChange={(checked) => setService("Flight Included", checked)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Included services</CardTitle>
          <Badge variant="secondary">{plan.travel.includedServices.length} selected</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <ServiceGroup
            title="Clinical"
            services={CLINICAL_SERVICES}
            selected={plan.travel.includedServices}
            onChange={setService}
          />
          <ServiceGroup
            title="Travel"
            services={TRAVEL_SERVICES}
            selected={plan.travel.includedServices}
            onChange={setService}
          />
          <div className="flex gap-2">
            <Input
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="Custom included service"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const value = custom.trim();
                if (!value) return;
                setService(value, true);
                setCustom("");
              }}
            >
              <Plus className="size-4" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {plan.travel.includedServices
              .filter((item) => !KNOWN_SERVICES.includes(item))
              .map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setService(item, false)}
                >
                  {item}
                  <Trash2 className="size-3" />
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-warning/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="size-4" />
            Internal clinic notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={plan.travel.internalNotes ?? ""}
            onChange={(event) => update({ internalNotes: event.target.value })}
            rows={3}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Private clinic-only information. Never shown on patient quotes or preliminary roadmaps.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function HotelPreview({ hotel }: { hotel: HotelOption }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{hotel.name}</p>
            <Badge variant="outline">{hotel.category}</Badge>
          </div>
          <p className="text-sm">
            {hotel.pricePerNight} {hotel.currency} / night
          </p>
          {hotel.companionPolicy && (
            <p className="text-xs text-muted-foreground">Companion: {hotel.companionPolicy}</p>
          )}
          {hotel.description && (
            <p className="mt-1 text-sm text-muted-foreground">{hotel.description}</p>
          )}
        </div>
        {hotel.images
          .slice(0, 4)
          .map(
            (image) =>
              image.dataUrl && (
                <img
                  key={image.id}
                  src={image.dataUrl}
                  alt={image.name}
                  className="h-20 w-28 rounded-md border object-cover"
                />
              ),
          )}
      </div>
    </div>
  );
}
function ServiceGroup({
  title,
  services,
  selected,
  onChange,
}: {
  title: string;
  services: string[];
  selected: string[];
  onChange: (service: string, checked: boolean) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <label
            key={service}
            className="flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <Checkbox
              checked={selected.includes(service)}
              onCheckedChange={(value) => onChange(service, value === true)}
            />
            {service}
          </label>
        ))}
      </div>
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
    <label className="flex min-h-20 items-center justify-between gap-3 rounded-lg border p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
function OptionSelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value?: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
function legacyOption(value?: string) {
  return value ? [value] : [];
}
