import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TREATMENT_DEFINITIONS } from "@/features/dentalplan/data/treatmentDefinitions";
import { createDentalPlan } from "@/features/dentalplan/utils/createDentalPlan";
import { Tooth } from "@/features/dentalplan/components/Tooth";
import type { TreatmentType } from "@/features/dentalplan/types/dental-plan.types";
import { LocalPlannerAssetAdapter } from "@/features/dentalplan/adapters/LocalPlannerAssetAdapter";
import { useAuth } from "@/lib/auth/mock-auth";
import { useMockStore } from "@/lib/mock/store";
import { formatQuoteMoney } from "@/lib/quote";
import type {
  ClinicHotel,
  ClinicTreatmentDefinition,
  DentalPlanTemplate,
  PlannerCurrency,
  User,
} from "@/types/models";

export const Route = createFileRoute("/pro/settings/dental-planner")({
  component: DentalPlannerSettings,
});
const currencies: PlannerCurrency[] = ["GBP", "EUR", "USD", "TRY"];
const assetAdapter = new LocalPlannerAssetAdapter();

function DentalPlannerSettings() {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();
  const clinicId = user?.clinic_id;
  const definitions = useMockStore((state) => state.clinicTreatmentDefinitions);
  const templates = useMockStore((state) => state.dentalPlanTemplates);
  const hotels = useMockStore((state) => state.clinicHotels);
  const users = useMockStore((state) => state.users);
  const plans = useMockStore((state) => state.treatmentPlans);
  const saveDefinition = useMockStore((state) => state.saveClinicTreatmentDefinition);
  const deleteDefinition = useMockStore((state) => state.deleteClinicTreatmentDefinition);
  const saveTemplate = useMockStore((state) => state.saveDentalPlanTemplate);
  const deleteTemplate = useMockStore((state) => state.deleteDentalPlanTemplate);
  const saveHotel = useMockStore((state) => state.saveClinicHotel);
  const deleteHotel = useMockStore((state) => state.deleteClinicHotel);
  const addDentist = useMockStore((state) => state.addClinicDentist);
  const updateDentist = useMockStore((state) => state.updateClinicDentist);
  const deleteDentist = useMockStore((state) => state.deleteClinicDentist);
  const [treatment, setTreatment] = useState<ClinicTreatmentDefinition | null>(null);
  const [dentist, setDentist] = useState<Partial<User> | null>(null);
  const [template, setTemplate] = useState<DentalPlanTemplate | null>(null);
  const [hotel, setHotel] = useState<ClinicHotel | null>(null);
  const [hotelCategory, setHotelCategory] = useState("all");
  const clinicDefinitions = useMemo(
    () => definitions.filter((item) => item.clinic_id === clinicId),
    [definitions, clinicId],
  );
  const clinicTemplates = useMemo(
    () => templates.filter((item) => item.clinic_id === clinicId),
    [templates, clinicId],
  );
  const clinicHotels = useMemo(
    () => hotels.filter((item) => item.clinic_id === clinicId),
    [hotels, clinicId],
  );
  const dentists = useMemo(
    () => users.filter((item) => item.clinic_id === clinicId && item.role === "dentist"),
    [users, clinicId],
  );
  if (!clinicId || !user) return <div className="p-6">Clinic settings are unavailable.</div>;
  if (!["clinic_owner", "clinic_admin"].includes(user.role))
    return (
      <div className="p-6">
        <PageHeader
          title="Dental Planner"
          description="Clinic owner or administrator access is required to manage planner settings."
        />
      </div>
    );
  const rows = [
    ...TREATMENT_DEFINITIONS.map(
      (base) =>
        clinicDefinitions.find((item) => item.treatment_key === base.type && item.system) ??
        systemTreatment(clinicId, base.type, base.label, base.perTooth),
    ),
    ...clinicDefinitions.filter((item) => !item.system),
  ];
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Dental Planner"
        description="Configure reusable clinic treatments, dentists, templates and hotels."
      />
      <Tabs defaultValue="treatments">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="treatments">Treatments</TabsTrigger>
          <TabsTrigger value="dentists">Dentists</TabsTrigger>
          <TabsTrigger value="templates">Dental Templates</TabsTrigger>
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
        </TabsList>
        <TabsContent value="treatments">
          <Section title="Treatments" action={() => setTreatment(blankTreatment(clinicId))}>
            {rows.map((item) => (
              <Row
                key={item.id}
                title={item.display_name}
                description={`${item.category} · ${item.unit_type}`}
                badges={[
                  item.system ? "System" : "Custom",
                  item.active ? "Active" : "Inactive",
                  formatQuoteMoney(item.prices.EUR ?? 0, "EUR"),
                ]}
                onEdit={() => setTreatment(item)}
                onDelete={
                  !item.system
                    ? () =>
                        confirmDelete(
                          () => deleteDefinition(item.id, clinicId),
                          "Treatment removed",
                        )
                    : undefined
                }
              />
            ))}
          </Section>
        </TabsContent>
        <TabsContent value="dentists">
          <Section
            title="Dentists"
            action={() => setDentist({ role: "dentist", active: true, languages: [] })}
          >
            {dentists.map((item) => (
              <Row
                key={item.id}
                title={item.name}
                description={[item.title, item.specialty].filter(Boolean).join(" · ") || "Dentist"}
                badges={[
                  item.default_planner_dentist ? "Default" : "Dentist",
                  item.active === false ? "Inactive" : "Active",
                ]}
                onEdit={() => setDentist(item)}
                onDelete={() =>
                  confirmDelete(
                    () => deleteDentist(item.id, clinicId),
                    plans.some((plan) => plan.dentist_id === item.id)
                      ? "Dentist is assigned and was deactivated"
                      : "Dentist removed",
                  )
                }
              />
            ))}
          </Section>
        </TabsContent>
        <TabsContent value="templates">
          <Section
            title="Dental Templates"
            action={() => setTemplate(blankTemplate(clinicId, user.id))}
          >
            {clinicTemplates.map((item) => (
              <Row
                key={item.id}
                title={item.name}
                description={item.description || item.category}
                badges={[item.category, item.active ? "Active" : "Inactive"]}
                onEdit={() =>
                  navigate({ to: "/dentalplan", search: { mode: "template", templateId: item.id } })
                }
                editLabel="Edit in Planner"
                onSecondary={() => setTemplate(item)}
                secondaryLabel="Details"
                onDuplicate={() => {
                  saveTemplate(
                    {
                      ...item,
                      id: crypto.randomUUID(),
                      name: `${item.name} copy`,
                      plan_data: createDentalPlan(item.plan_data as never),
                    },
                    user.id,
                  );
                  toast.success("Template duplicated");
                }}
                onDelete={() =>
                  confirmDelete(() => deleteTemplate(item.id, clinicId), "Template removed")
                }
              />
            ))}
          </Section>
        </TabsContent>
        <TabsContent value="hotels">
          <Section title="Hotels" action={() => setHotel(blankHotel(clinicId, user.id))}>
            <div className="p-4">
              <Select value={hotelCategory} onValueChange={setHotelCategory}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Filter category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {[...new Set(clinicHotels.map((item) => item.category))].map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {clinicHotels
              .filter((item) => hotelCategory === "all" || item.category === hotelCategory)
              .map((item) => (
                <Row
                  key={item.id}
                  title={item.name}
                  description={`${item.city}, ${item.country} · ${item.images.length}/4 images`}
                  badges={[
                    item.is_default ? "Default" : "Hotel",
                    item.category,
                    item.active ? "Active" : "Inactive",
                    formatQuoteMoney(item.price_per_night, item.currency),
                  ]}
                  onEdit={() => setHotel(item)}
                  onDelete={() =>
                    confirmDelete(() => deleteHotel(item.id, clinicId), "Hotel removed")
                  }
                />
              ))}
          </Section>
        </TabsContent>
      </Tabs>
      <TreatmentDialog
        value={treatment}
        onClose={() => setTreatment(null)}
        onSave={(record) => {
          saveDefinition(record, user.id);
          setTreatment(null);
          toast.success("Treatment saved");
        }}
      />
      <DentistDialog
        value={dentist}
        onClose={() => setDentist(null)}
        onSave={(record) => {
          const existing = record.id && dentists.find((item) => item.id === record.id);
          if (record.default_planner_dentist)
            dentists
              .filter((item) => item.id !== record.id)
              .forEach((item) =>
                updateDentist(item.id, clinicId, { default_planner_dentist: false }),
              );
          if (existing) updateDentist(existing.id, clinicId, record);
          else
            addDentist(
              {
                email: record.email ?? "",
                name: record.name ?? "New dentist",
                role: "dentist",
                clinic_id: clinicId,
                active: record.active !== false,
                title: record.title,
                specialty: record.specialty,
                languages: record.languages ?? [],
                default_planner_dentist: record.default_planner_dentist,
                patient_bio: record.patient_bio,
                profile_image_name: record.profile_image_name,
                status: "active",
              },
              user.id,
            );
          setDentist(null);
          toast.success("Dentist saved");
        }}
      />
      <TemplateDialog
        value={template}
        dentists={dentists}
        onClose={() => setTemplate(null)}
        onSave={(record) => {
          saveTemplate(record, user.id);
          setTemplate(null);
          toast.success("Template saved");
        }}
      />
      <HotelDialog
        value={hotel}
        onClose={() => setHotel(null)}
        onSave={(record) => {
          saveHotel(record, user.id);
          setHotel(null);
          toast.success(record.is_default ? "Default hotel updated" : "Hotel saved");
        }}
      />
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button size="sm" onClick={action}>
          <Plus className="size-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {children || (
          <p className="p-6 text-sm text-muted-foreground">No records yet. Add the first one.</p>
        )}
      </CardContent>
    </Card>
  );
}
function Row({
  title,
  description,
  badges,
  onEdit,
  onDelete,
  editLabel = "Edit",
  onSecondary,
  secondaryLabel,
  onDuplicate,
}: {
  title: string;
  description: string;
  badges: string[];
  onEdit: () => void;
  onDelete?: () => void;
  editLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
  onDuplicate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {badges.map((badge) => (
            <Badge key={badge} variant="outline">
              {badge}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          {editLabel}
        </Button>
        {onSecondary && (
          <Button size="sm" variant="ghost" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
        {onDuplicate && (
          <Button size="sm" variant="ghost" onClick={onDuplicate}>
            Duplicate
          </Button>
        )}
        {onDelete && (
          <Button size="icon" variant="ghost" aria-label={`Delete ${title}`} onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
function DialogFrame({
  open,
  title,
  onClose,
  onSave,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function TreatmentDialog({
  value,
  onClose,
  onSave,
}: {
  value: ClinicTreatmentDefinition | null;
  onClose: () => void;
  onSave: (value: ClinicTreatmentDefinition) => void;
}) {
  const [draft, setDraft] = useState(value);
  if (value?.id !== draft?.id) setDraft(value);
  if (!draft) return null;
  const patch = (next: Partial<ClinicTreatmentDefinition>) => setDraft({ ...draft, ...next });
  return (
    <DialogFrame open title="Treatment definition" onClose={onClose} onSave={() => onSave(draft)}>
      <Field label="Internal identifier">
        <Input
          value={draft.treatment_key}
          disabled={draft.system}
          onChange={(e) => patch({ treatment_key: e.target.value })}
        />
      </Field>
      <Field label="Display name">
        <Input
          value={draft.display_name}
          onChange={(e) => patch({ display_name: e.target.value })}
        />
      </Field>
      <Field label="Category">
        <Input value={draft.category} onChange={(e) => patch({ category: e.target.value })} />
      </Field>
      <Field label="Unit type">
        <Select
          value={draft.unit_type}
          onValueChange={(unit_type) =>
            patch({ unit_type: unit_type as ClinicTreatmentDefinition["unit_type"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tooth">Tooth</SelectItem>
            <SelectItem value="arch">Arch</SelectItem>
            <SelectItem value="case">Case</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Description" wide>
        <Textarea
          value={draft.description ?? ""}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </Field>
      {currencies.map((currency) => (
        <Field key={currency} label={`${currency} default price`}>
          <Input
            type="number"
            min={0}
            value={draft.prices[currency] ?? 0}
            onChange={(e) =>
              patch({
                prices: { ...draft.prices, [currency]: Math.max(0, Number(e.target.value)) },
              })
            }
          />
        </Field>
      ))}
      <Field label="Patient-facing label">
        <Input
          value={draft.patient_label ?? ""}
          onChange={(e) => patch({ patient_label: e.target.value })}
        />
      </Field>
      <Field label="Internal label">
        <Input
          value={draft.internal_label ?? ""}
          onChange={(e) => patch({ internal_label: e.target.value })}
        />
      </Field>
      <Field label="Base clinical behaviour">
        <Select
          value={draft.base_treatment_key}
          onValueChange={(base_treatment_key) => {
            const definition = TREATMENT_DEFINITIONS.find(
              (item) => item.type === base_treatment_key,
            );
            patch({
              base_treatment_key,
              rule_profile_key: base_treatment_key,
              unit_type: definition?.perTooth === false ? "arch" : "tooth",
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TREATMENT_DEFINITIONS.map((item) => (
              <SelectItem key={item.type} value={item.type}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Existing diagram visual">
        <Select value={draft.visual_key} onValueChange={(visual_key) => patch({ visual_key })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TREATMENT_DEFINITIONS.filter((item) => item.supported).map((item) => (
              <SelectItem key={item.type} value={item.type}>
                {item.label} visual
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-3 text-sm sm:col-span-2">
        <Tooth
          toothNumber={11}
          currentConditions={{}}
          proposedTreatments={[
            {
              id: "visual-preview",
              toothNumbers: [11],
              treatmentType: draft.base_treatment_key as TreatmentType,
              visualKey: draft.visual_key as TreatmentType,
            },
          ]}
          mode="proposed"
          selected={false}
          readOnly
          onSelect={() => {}}
        />
        <div>
          <p>
            <b>Behaves like:</b>{" "}
            {TREATMENT_DEFINITIONS.find((item) => item.type === draft.base_treatment_key)?.label ??
              draft.base_treatment_key}
          </p>
          <p>
            <b>Uses visual:</b>{" "}
            {TREATMENT_DEFINITIONS.find((item) => item.type === draft.visual_key)?.label ??
              draft.visual_key}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Compatibility rules are inherited from the base treatment and cannot be bypassed.
          </p>
        </div>
      </div>
      <Field label="Active">
        <Switch checked={draft.active} onCheckedChange={(active) => patch({ active })} />
      </Field>
    </DialogFrame>
  );
}

function DentistDialog({
  value,
  onClose,
  onSave,
}: {
  value: Partial<User> | null;
  onClose: () => void;
  onSave: (value: Partial<User>) => void;
}) {
  const [draft, setDraft] = useState(value);
  if (value?.id !== draft?.id) setDraft(value);
  if (!draft) return null;
  const patch = (next: Partial<User>) => setDraft({ ...draft, ...next });
  return (
    <DialogFrame open title="Dentist" onClose={onClose} onSave={() => onSave(draft)}>
      <Field label="Full name">
        <Input value={draft.name ?? ""} onChange={(e) => patch({ name: e.target.value })} />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          value={draft.email ?? ""}
          onChange={(e) => patch({ email: e.target.value })}
        />
      </Field>
      <Field label="Title">
        <Input value={draft.title ?? ""} onChange={(e) => patch({ title: e.target.value })} />
      </Field>
      <Field label="Specialty">
        <Input
          value={draft.specialty ?? ""}
          onChange={(e) => patch({ specialty: e.target.value })}
        />
      </Field>
      <Field label="Languages">
        <Input
          value={(draft.languages ?? []).join(", ")}
          onChange={(e) => patch({ languages: split(e.target.value) })}
        />
      </Field>
      <Field label="Profile image metadata">
        <Input
          value={draft.profile_image_name ?? ""}
          onChange={(e) => patch({ profile_image_name: e.target.value })}
        />
      </Field>
      <Field label="Patient-facing biography" wide>
        <Textarea
          value={draft.patient_bio ?? ""}
          onChange={(e) => patch({ patient_bio: e.target.value })}
        />
      </Field>
      <Field label="Active">
        <Switch checked={draft.active !== false} onCheckedChange={(active) => patch({ active })} />
      </Field>
      <Field label="Default planner dentist">
        <Switch
          checked={!!draft.default_planner_dentist}
          onCheckedChange={(default_planner_dentist) => patch({ default_planner_dentist })}
        />
      </Field>
    </DialogFrame>
  );
}

function TemplateDialog({
  value,
  dentists,
  onClose,
  onSave,
}: {
  value: DentalPlanTemplate | null;
  dentists: User[];
  onClose: () => void;
  onSave: (value: DentalPlanTemplate) => void;
}) {
  const [draft, setDraft] = useState(value);
  if (value?.id !== draft?.id) setDraft(value);
  if (!draft) return null;
  const patch = (next: Partial<DentalPlanTemplate>) => setDraft({ ...draft, ...next });
  return (
    <DialogFrame open title="Dental plan template" onClose={onClose} onSave={() => onSave(draft)}>
      <Field label="Template name">
        <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>
      <Field label="Category">
        <Input value={draft.category} onChange={(e) => patch({ category: e.target.value })} />
      </Field>
      <Field label="Description" wide>
        <Textarea
          value={draft.description ?? ""}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </Field>
      <Field label="Default dentist">
        <Select
          value={draft.default_dentist_id ?? "none"}
          onValueChange={(id) => patch({ default_dentist_id: id === "none" ? undefined : id })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No default</SelectItem>
            {dentists.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Active">
        <Switch checked={draft.active} onCheckedChange={(active) => patch({ active })} />
      </Field>
      <Field label="Patient-facing summary" wide>
        <Textarea
          value={draft.patient_summary ?? ""}
          onChange={(e) => patch({ patient_summary: e.target.value })}
        />
      </Field>
      <Field label="Internal notes" wide>
        <Textarea
          value={draft.internal_notes ?? ""}
          onChange={(e) => patch({ internal_notes: e.target.value })}
        />
      </Field>
    </DialogFrame>
  );
}

function HotelDialog({
  value,
  onClose,
  onSave,
}: {
  value: ClinicHotel | null;
  onClose: () => void;
  onSave: (value: ClinicHotel) => void;
}) {
  const [draft, setDraft] = useState(value);
  if (value?.id !== draft?.id) setDraft(value);
  if (!draft) return null;
  const patch = (next: Partial<ClinicHotel>) => setDraft({ ...draft, ...next });
  const addImage = async (file?: File) => {
    if (!file) return;
    if (draft.images.length >= 4) return toast.error("A hotel can have up to four images");
    try {
      patch({ images: [...draft.images, await assetAdapter.readHotelImage(file)] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid image");
    }
  };
  return (
    <DialogFrame open title="Hotel" onClose={onClose} onSave={() => onSave(draft)}>
      <Field label="Hotel name">
        <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>
      <Field label="Category">
        <Select value={draft.category} onValueChange={(category) => patch({ category })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              "Budget",
              "Standard",
              "Premium",
              "Luxury",
              "Apartment",
              "Clinic Residence",
              "Other",
            ].map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="City">
        <Input value={draft.city} onChange={(e) => patch({ city: e.target.value })} />
      </Field>
      <Field label="Country">
        <Input value={draft.country} onChange={(e) => patch({ country: e.target.value })} />
      </Field>
      <Field label="Address">
        <Input value={draft.address ?? ""} onChange={(e) => patch({ address: e.target.value })} />
      </Field>
      <Field label="Distance from clinic">
        <Input
          value={draft.distance_from_clinic ?? ""}
          onChange={(e) => patch({ distance_from_clinic: e.target.value })}
        />
      </Field>
      <Field label="Default nights">
        <Input
          type="number"
          min={0}
          value={draft.default_nights}
          onChange={(e) => patch({ default_nights: Math.max(0, Number(e.target.value)) })}
        />
      </Field>
      <Field label="Room types">
        <Input
          value={draft.room_types.join(", ")}
          onChange={(e) => patch({ room_types: split(e.target.value) })}
        />
      </Field>
      <Field label="Board types">
        <Input
          value={draft.board_types.join(", ")}
          onChange={(e) => patch({ board_types: split(e.target.value) })}
        />
      </Field>
      <Field label="Price per night">
        <Input
          type="number"
          min={0}
          value={draft.price_per_night}
          onChange={(e) => patch({ price_per_night: Math.max(0, Number(e.target.value)) })}
        />
      </Field>
      <Field label="Currency">
        <Select
          value={draft.currency}
          onValueChange={(currency) => patch({ currency: currency as PlannerCurrency })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Description" wide>
        <Textarea
          value={draft.description ?? ""}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </Field>
      <Field label="Companion policy">
        <Input
          value={draft.companion_policy ?? ""}
          onChange={(e) => patch({ companion_policy: e.target.value })}
        />
      </Field>
      <Field label="Contact">
        <Input value={draft.contact ?? ""} onChange={(e) => patch({ contact: e.target.value })} />
      </Field>
      <Field label="Images" wide>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {draft.images.map((image, index) => (
            <div key={image.id} className="relative">
              <img
                src={image.data_url}
                alt={image.name}
                className="aspect-video w-full rounded border object-cover"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute right-1 top-1 size-7"
                onClick={() => patch({ images: draft.images.filter((_, i) => i !== index) })}
              >
                <Trash2 className="size-3" />
              </Button>
              <div className="mt-1 flex justify-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => patch({ images: move(draft.images, index, index - 1) })}
                >
                  ←
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === draft.images.length - 1}
                  onClick={() => patch({ images: move(draft.images, index, index + 1) })}
                >
                  →
                </Button>
              </div>
            </div>
          ))}
          {draft.images.length < 4 && (
            <Button asChild variant="outline" className="aspect-video h-auto">
              <label>
                <Upload className="size-4" /> Add image
                <input
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => addImage(e.target.files?.[0])}
                />
              </label>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{draft.images.length}/4 images</p>
      </Field>
      <Field label="Active">
        <Switch checked={draft.active} onCheckedChange={(active) => patch({ active })} />
      </Field>
      <Field label="Default hotel">
        <Switch
          checked={draft.is_default}
          onCheckedChange={(is_default) => patch({ is_default })}
        />
      </Field>
      <Field label="Internal notes" wide>
        <Textarea
          value={draft.internal_notes ?? ""}
          onChange={(e) => patch({ internal_notes: e.target.value })}
        />
      </Field>
    </DialogFrame>
  );
}

function systemTreatment(
  clinicId: string,
  key: string,
  label: string,
  perTooth: boolean,
): ClinicTreatmentDefinition {
  return {
    id: `${clinicId}_system_${key}`,
    clinic_id: clinicId,
    treatment_key: key,
    system: true,
    display_name: label,
    category: "System treatments",
    prices: {},
    unit_type: perTooth ? "tooth" : "arch",
    availability: "proposed",
    active: true,
    base_treatment_key: key,
    visual_key: key,
    rule_profile_key: key,
    created_at: "",
    updated_at: "",
    created_by: "system",
  };
}
function blankTreatment(clinicId: string): ClinicTreatmentDefinition {
  return {
    ...systemTreatment(clinicId, `custom_${crypto.randomUUID()}`, "New treatment", true),
    id: crypto.randomUUID(),
    system: false,
    category: "Custom",
    base_treatment_key: "other",
    visual_key: "dental-implant",
    rule_profile_key: "other",
  };
}
function blankTemplate(clinicId: string, userId: string): DentalPlanTemplate {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    clinic_id: clinicId,
    name: "New template",
    category: "Custom",
    active: true,
    plan_data: createDentalPlan({ name: "Template" }),
    created_at: now,
    updated_at: now,
    created_by: userId,
  };
}
function blankHotel(clinicId: string, userId: string): ClinicHotel {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    clinic_id: clinicId,
    name: "New hotel",
    category: "Standard",
    city: "",
    country: "",
    room_types: [],
    board_types: [],
    default_nights: 0,
    price_per_night: 0,
    currency: "EUR",
    active: true,
    is_default: false,
    images: [],
    created_at: now,
    updated_at: now,
    created_by: userId,
  };
}
function split(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
function confirmDelete(action: () => void, message: string) {
  if (window.confirm("Are you sure?")) {
    action();
    toast.success(message);
  }
}
