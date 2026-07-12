import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DENTAL_PLANNER_COUNTRIES } from "@/features/dentalplan/data/countries";
import { TREATMENT_DEFINITIONS } from "@/features/dentalplan/data/treatmentDefinitions";
import { useAuth } from "@/lib/auth/mock-auth";
import { useMockStore } from "@/lib/mock/store";
import { formatQuoteMoney } from "@/lib/quote";
import type {
  QuoteCurrency,
  RoadmapCountryTreatmentPrice,
  RoadmapTreatmentContent,
} from "@/types/models";

export const Route = createFileRoute("/pro/settings/roadmap")({ component: RoadmapSettings });

function RoadmapSettings() {
  const user = useAuth((state) => state.user);
  const prices = useMockStore((state) => state.roadmapCountryPrices);
  const contents = useMockStore((state) => state.roadmapTreatmentContent);
  const savePrice = useMockStore((state) => state.saveRoadmapCountryPrice);
  const saveContent = useMockStore((state) => state.saveRoadmapTreatmentContent);
  const [country, setCountry] = useState("Turkey");
  const [priceDraft, setPriceDraft] = useState<RoadmapCountryTreatmentPrice | null>(null);
  const [contentDraft, setContentDraft] = useState<RoadmapTreatmentContent | null>(null);
  const clinicId = user?.clinic_id;
  const effectivePrices = useMemo(() => {
    const platform = prices.filter((item) => !item.clinic_id && item.country === country);
    const overrides = prices.filter(
      (item) => item.clinic_id === clinicId && item.country === country,
    );
    return platform
      .map(
        (item) =>
          overrides.find((override) => override.treatment_key === item.treatment_key) ?? item,
      )
      .concat(
        overrides.filter(
          (item) => !platform.some((base) => base.treatment_key === item.treatment_key),
        ),
      );
  }, [prices, country, clinicId]);
  const effectiveContent = useMemo(() => {
    const platform = contents.filter((item) => !item.clinic_id);
    const overrides = contents.filter((item) => item.clinic_id === clinicId);
    return platform
      .map(
        (item) =>
          overrides.find((override) => override.treatment_key === item.treatment_key) ?? item,
      )
      .concat(
        overrides.filter(
          (item) => !platform.some((base) => base.treatment_key === item.treatment_key),
        ),
      );
  }, [contents, clinicId]);
  if (!user || !clinicId || !["clinic_owner", "clinic_admin"].includes(user.role))
    return <div className="p-6">Clinic owner or administrator access is required.</div>;
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Roadmap Settings"
        description="Configure clinic-specific preliminary treatment information and destination estimates. Platform defaults remain available when no clinic override exists."
      />
      <Tabs defaultValue="pricing">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="pricing">Country Pricing</TabsTrigger>
          <TabsTrigger value="content">Treatment Information</TabsTrigger>
          <TabsTrigger value="journey">Treatment Journey</TabsTrigger>
          <TabsTrigger value="general">General Roadmap Content</TabsTrigger>
        </TabsList>
        <TabsContent value="pricing">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Country Pricing</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Clinic overrides are private to this tenant. Public Roadmaps use active platform
                  defaults.
                </p>
              </div>
              <Button onClick={() => setPriceDraft(blankPrice(clinicId, country))}>
                Add price
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-sm">
                <Combobox
                  value={country}
                  options={DENTAL_PLANNER_COUNTRIES.map((item) => ({ value: item, label: item }))}
                  onValueChange={setCountry}
                  placeholder="Select country"
                  searchPlaceholder="Search countries..."
                />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Treatment</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {effectivePrices.map((item) => (
                      <TableRow key={`${item.clinic_id ?? "platform"}_${item.id}`}>
                        <TableCell>{treatmentLabel(item.treatment_key)}</TableCell>
                        <TableCell>
                          {formatQuoteMoney(item.minimum_price, item.currency)}–
                          {formatQuoteMoney(item.maximum_price, item.currency)}
                        </TableCell>
                        <TableCell>{item.unit.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.active ? "Active" : "Inactive"}</Badge>{" "}
                          {item.clinic_id ? (
                            <Badge>Clinic override</Badge>
                          ) : (
                            <Badge variant="secondary">Platform default</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPriceDraft({
                                ...item,
                                id: item.clinic_id ? item.id : crypto.randomUUID(),
                                clinic_id: clinicId,
                              })
                            }
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Treatment Information</CardTitle>
              <p className="text-sm text-muted-foreground">
                Patient-friendly explanations shown only when a treatment is estimated.
              </p>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {effectiveContent.map((item) => (
                <div
                  key={item.treatment_key}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.short_description}</p>
                  </div>
                  <Badge variant="outline">{item.active ? "Active" : "Inactive"}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setContentDraft({
                        ...item,
                        id: item.clinic_id ? item.id : crypto.randomUUID(),
                        clinic_id: clinicId,
                      })
                    }
                  >
                    Edit
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="journey">
          <Info
            title="Treatment Journey"
            text="Journey steps are derived centrally from the estimated treatment mix: diagnostics, preliminary care, surgical stages, healing, restorations and aftercare. Exact steps remain subject to clinical review."
          />
        </TabsContent>
        <TabsContent value="general">
          <Info
            title="General Roadmap Content"
            text="Roadmaps use cautious preliminary language, never display tooth numbers or a Dental Planner diagram, and guide the patient toward clinic comparison and confirmed clinical review."
          />
        </TabsContent>
      </Tabs>
      <PriceDialog
        value={priceDraft}
        onClose={() => setPriceDraft(null)}
        onSave={(record) => {
          savePrice(record, user.id);
          setPriceDraft(null);
          toast.success("Roadmap price saved");
        }}
      />
      <ContentDialog
        value={contentDraft}
        onClose={() => setContentDraft(null)}
        onSave={(record) => {
          saveContent(record, user.id);
          setContentDraft(null);
          toast.success("Treatment information saved");
        }}
      />
    </div>
  );
}

function PriceDialog({
  value,
  onClose,
  onSave,
}: {
  value: RoadmapCountryTreatmentPrice | null;
  onClose: () => void;
  onSave: (value: RoadmapCountryTreatmentPrice) => void;
}) {
  const [draft, setDraft] = useState(value);
  if (value?.id !== draft?.id) setDraft(value);
  if (!draft) return null;
  const patch = (next: Partial<RoadmapCountryTreatmentPrice>) => setDraft({ ...draft, ...next });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Country treatment price</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country">
            <Combobox
              value={draft.country}
              options={DENTAL_PLANNER_COUNTRIES.map((item) => ({ value: item, label: item }))}
              onValueChange={(country) => patch({ country })}
            />
          </Field>
          <Field label="Treatment">
            <Combobox
              value={draft.treatment_key}
              options={TREATMENT_DEFINITIONS.map((item) => ({
                value: item.type,
                label: item.label,
              }))}
              onValueChange={(treatment_key) => patch({ treatment_key })}
            />
          </Field>
          <Field label="Currency">
            <Select
              value={draft.currency}
              onValueChange={(currency) => patch({ currency: currency as QuoteCurrency })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["GBP", "EUR", "USD", "TRY"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Pricing unit">
            <Select
              value={draft.unit}
              onValueChange={(unit) =>
                patch({ unit: unit as RoadmapCountryTreatmentPrice["unit"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["per_tooth", "per_implant", "per_arch", "per_case"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Minimum">
            <Input
              type="number"
              min={0}
              value={draft.minimum_price}
              onChange={(event) =>
                patch({ minimum_price: Math.max(0, Number(event.target.value)) })
              }
            />
          </Field>
          <Field label="Maximum">
            <Input
              type="number"
              min={draft.minimum_price}
              value={draft.maximum_price}
              onChange={(event) =>
                patch({ maximum_price: Math.max(draft.minimum_price, Number(event.target.value)) })
              }
            />
          </Field>
          <Field label="Active">
            <Switch checked={draft.active} onCheckedChange={(active) => patch({ active })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContentDialog({
  value,
  onClose,
  onSave,
}: {
  value: RoadmapTreatmentContent | null;
  onClose: () => void;
  onSave: (value: RoadmapTreatmentContent) => void;
}) {
  const [draft, setDraft] = useState(value);
  if (value?.id !== draft?.id) setDraft(value);
  if (!draft) return null;
  const patch = (next: Partial<RoadmapTreatmentContent>) => setDraft({ ...draft, ...next });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Treatment information</DialogTitle>
        </DialogHeader>
        <Field label="Title">
          <Input value={draft.title} onChange={(event) => patch({ title: event.target.value })} />
        </Field>
        <Field label="Short description">
          <Textarea
            value={draft.short_description}
            onChange={(event) => patch({ short_description: event.target.value })}
          />
        </Field>
        <Field label="Why it may be needed">
          <Textarea
            value={draft.why_it_may_be_needed}
            onChange={(event) => patch({ why_it_may_be_needed: event.target.value })}
          />
        </Field>
        <Field label="Procedure steps (one per line)">
          <Textarea
            value={draft.procedure_steps.join("\n")}
            onChange={(event) =>
              patch({
                procedure_steps: event.target.value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="Usual visits">
          <Input
            value={draft.usual_visits ?? ""}
            onChange={(event) => patch({ usual_visits: event.target.value })}
          />
        </Field>
        <Field label="Typical timeline">
          <Input
            value={draft.typical_timeline ?? ""}
            onChange={(event) => patch({ typical_timeline: event.target.value })}
          />
        </Field>
        <Field label="Active">
          <Switch checked={draft.active} onCheckedChange={(active) => patch({ active })} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
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
function Info({ title, text }: { title: string; text: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  );
}
function treatmentLabel(key: string) {
  return TREATMENT_DEFINITIONS.find((item) => item.type === key)?.label ?? key.replace(/-/g, " ");
}
function blankPrice(clinicId: string, country: string): RoadmapCountryTreatmentPrice {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    clinic_id: clinicId,
    country,
    currency: "EUR",
    treatment_key: "dental-implant",
    minimum_price: 0,
    maximum_price: 0,
    unit: "per_implant",
    active: true,
    created_at: now,
    updated_at: now,
    created_by: "system",
  };
}
