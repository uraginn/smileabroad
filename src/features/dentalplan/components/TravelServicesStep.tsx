import { useState } from "react";
import { LockKeyhole, Plus, Trash2 } from "lucide-react";
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
import type { DentalPlan } from "../types/dental-plan.types";
const SERVICES = [
  "Prescribed medications",
  "Panoramic X-ray",
  "3D X-ray / CBCT",
  "Initial clinical examination",
  "Digital dental scan",
  "Temporary teeth where required",
  "Airport transfer",
  "Local clinic and hotel transfer",
];
export function TravelServicesStep({
  plan,
  change,
}: {
  plan: DentalPlan;
  change: (patch: Partial<DentalPlan>) => void;
}) {
  const [custom, setCustom] = useState("");
  const update = (patch: Partial<DentalPlan["travel"]>) =>
    change({ travel: { ...plan.travel, ...patch } });
  const preference = (
    key: "visits" | "visitDuration" | "healingPeriod",
    mode: "automatic" | "custom",
    value: string,
  ) =>
    change({
      planningPreferences: { ...plan.planningPreferences, [key]: { mode, value } },
      travel: {
        ...plan.travel,
        ...(key === "visits" && Number(value) > 0 ? { visits: Number(value) } : {}),
        ...(key === "visitDuration" ? { visitDuration: value } : {}),
      },
    });
  const setTransfer = (
    key: "airportPickup" | "airportDropoff" | "localTransfer",
    checked: boolean,
  ) => {
    const next = { ...plan.travel, [key]: checked };
    const airport = key.startsWith("airport")
      ? checked || next.airportPickup || next.airportDropoff
      : next.airportPickup || next.airportDropoff;
    const local = key === "localTransfer" ? checked : next.localTransfer;
    const services = plan.travel.includedServices.filter(
      (item) => item !== "Airport transfer" && item !== "Local clinic and hotel transfer",
    );
    if (airport) services.push("Airport transfer");
    if (local) services.push("Local clinic and hotel transfer");
    update({ ...next, airportTransfer: airport, includedServices: services });
  };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Visits, healing and estimated dates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Preference
            label="Visit count"
            value={plan.planningPreferences.visits}
            automaticValue={plan.planningPreferences.visits.value}
            onChange={(mode, value) => preference("visits", mode, value)}
          />
          <Preference
            label="Visit duration / estimated stay"
            value={plan.planningPreferences.visitDuration}
            automaticValue={plan.planningPreferences.visitDuration.value}
            onChange={(mode, value) => preference("visitDuration", mode, value)}
          />
          <Preference
            label="Healing period"
            value={plan.planningPreferences.healingPeriod}
            automaticValue={plan.planningPreferences.healingPeriod.value}
            onChange={(mode, value) => preference("healingPeriod", mode, value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field label="First visit estimate">
              <Input
                type="date"
                value={plan.travel.firstVisitDate ?? ""}
                onChange={(e) => update({ firstVisitDate: e.target.value })}
              />
            </Field>
            {plan.travel.visits > 1 && (
              <Field label="Second visit estimate">
                <Input
                  type="date"
                  value={plan.travel.secondVisitDate ?? ""}
                  onChange={(e) => update({ secondVisitDate: e.target.value })}
                />
              </Field>
            )}
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <Checkbox
                checked={plan.travel.datesFlexible}
                onCheckedChange={(value) => update({ datesFlexible: value === true })}
              />
              Flexible / not confirmed
            </label>
          </div>
          <Field label="Timeline notes">
            <Textarea
              value={plan.travel.timelineNotes ?? ""}
              onChange={(e) => update({ timelineNotes: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Hotel</CardTitle>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={plan.travel.hotelIncluded}
                onCheckedChange={(hotelIncluded) =>
                  update({ hotelIncluded, hotelRequired: hotelIncluded })
                }
              />
              Included
            </label>
          </div>
        </CardHeader>
        {plan.travel.hotelIncluded && (
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="Hotel name">
              <Input
                value={plan.travel.hotelName ?? ""}
                onChange={(e) => update({ hotelName: e.target.value })}
              />
            </Field>
            <Field label="Room type">
              <Input
                value={plan.travel.roomType ?? ""}
                onChange={(e) => update({ roomType: e.target.value })}
              />
            </Field>
            <Field label="Nights">
              <Input
                type="number"
                min={0}
                value={plan.travel.hotelNights}
                onChange={(e) => update({ hotelNights: Math.max(0, Number(e.target.value)) })}
              />
            </Field>
            <Field label="Board type">
              <Select
                value={plan.travel.boardType}
                onValueChange={(boardType) => update({ boardType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select board" />
                </SelectTrigger>
                <SelectContent>
                  {["Room only", "Breakfast", "Half board", "Full board"].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-center gap-2 pt-7 text-sm">
              <Checkbox
                checked={plan.travel.companionIncluded}
                onCheckedChange={(value) => update({ companionIncluded: value === true })}
              />
              Companion included
            </label>
            <Field label="Image metadata">
              <Input
                value={plan.travel.hotelImageMetadata ?? ""}
                onChange={(e) => update({ hotelImageMetadata: e.target.value })}
                placeholder="Future image reference"
              />
            </Field>
            <div className="md:col-span-3">
              <Field label="Short hotel description">
                <Textarea
                  value={plan.travel.hotelDescription ?? ""}
                  onChange={(e) => update({ hotelDescription: e.target.value })}
                />
              </Field>
            </div>
          </CardContent>
        )}
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transfers</CardTitle>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={plan.travel.transferIncluded}
                onCheckedChange={(transferIncluded) => update({ transferIncluded })}
              />
              Included
            </label>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <ServiceCheck
            label="Airport pickup"
            checked={!!plan.travel.airportPickup}
            onChange={(value) => setTransfer("airportPickup", value)}
          />
          <ServiceCheck
            label="Airport drop-off"
            checked={!!plan.travel.airportDropoff}
            onChange={(value) => setTransfer("airportDropoff", value)}
          />
          <ServiceCheck
            label="Clinic / hotel local transfer"
            checked={plan.travel.localTransfer}
            onChange={(value) => setTransfer("localTransfer", value)}
          />
          <div className="md:col-span-3">
            <Field label="Transfer note">
              <Textarea
                value={plan.travel.transferNote ?? ""}
                onChange={(e) => update({ transferNote: e.target.value })}
              />
            </Field>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Included services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => (
              <ServiceCheck
                key={service}
                label={service}
                checked={plan.travel.includedServices.includes(service)}
                onChange={(checked) =>
                  update({
                    includedServices: checked
                      ? [...new Set([...plan.travel.includedServices, service])]
                      : plan.travel.includedServices.filter((item) => item !== service),
                    ...(service === "Airport transfer"
                      ? { airportTransfer: checked, airportPickup: checked }
                      : {}),
                    ...(service === "Local clinic and hotel transfer"
                      ? { localTransfer: checked }
                      : {}),
                  })
                }
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom included service"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (custom.trim()) {
                  update({
                    includedServices: [
                      ...new Set([...plan.travel.includedServices, custom.trim()]),
                    ],
                  });
                  setCustom("");
                }
              }}
            >
              <Plus />
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {plan.travel.includedServices
              .filter((item) => !SERVICES.includes(item))
              .map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    update({
                      includedServices: plan.travel.includedServices.filter(
                        (service) => service !== item,
                      ),
                    })
                  }
                >
                  {item}
                  <Trash2 />
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>
      <Card className="border-warning/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole />
            Internal clinic notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={plan.travel.internalNotes ?? ""}
            onChange={(e) => update({ internalNotes: e.target.value })}
            rows={4}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Private clinic-only information. Never shown on patient quotes or preliminary roadmaps.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
function Preference({
  label,
  value,
  automaticValue,
  onChange,
}: {
  label: string;
  value: { mode: "automatic" | "custom"; value: string };
  automaticValue: string;
  onChange: (mode: "automatic" | "custom", value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant={value.mode === "automatic" ? "secondary" : "outline"}
          onClick={() => onChange("automatic", automaticValue)}
        >
          Automatic
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value.mode === "custom" ? "secondary" : "outline"}
          onClick={() => onChange("custom", value.value || automaticValue)}
        >
          Custom
        </Button>
      </div>
      <Input
        value={value.value}
        disabled={value.mode === "automatic"}
        onChange={(e) => onChange("custom", e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Suggested from selected treatments — confirm clinically.
      </p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function ServiceCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      {label}
    </label>
  );
}
