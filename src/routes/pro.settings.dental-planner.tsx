import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/ui-bits";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Attachment } from "@/components/ui/attachment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { DEFAULT_CLINICAL_SERVICES } from "@/features/dentalplan/data/serviceDefinitions";
import { createDentalPlan } from "@/features/dentalplan/utils/createDentalPlan";
import { Tooth } from "@/features/dentalplan/components/Tooth";
import type { TreatmentType } from "@/features/dentalplan/types/dental-plan.types";
import { LocalPlannerAssetAdapter } from "@/features/dentalplan/adapters/LocalPlannerAssetAdapter";
import {
  HOTEL_CATEGORY_DEFAULTS,
  normalizedTreatmentCategory,
  treatmentCategories,
} from "@/features/dentalplan-settings/categories";
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
  const clinic = useMockStore((state) => state.clinics.find((item) => item.id === clinicId));
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
  const updateClinic = useMockStore((state) => state.updateClinic);
  const [treatment, setTreatment] = useState<ClinicTreatmentDefinition | null>(null);
  const [dentist, setDentist] = useState<Partial<User> | null>(null);
  const [dentistToDelete, setDentistToDelete] = useState<User | null>(null);
  const [template, setTemplate] = useState<DentalPlanTemplate | null>(null);
  const [hotel, setHotel] = useState<ClinicHotel | null>(null);
  const [hotelCategories, setHotelCategories] = useState<string[]>([]);
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const [treatmentStatus, setTreatmentStatus] = useState("all");
  const [treatmentKind, setTreatmentKind] = useState("all");
  const [hotelSearch, setHotelSearch] = useState("");
  const [hotelStatus, setHotelStatus] = useState("all");
  const [serviceName, setServiceName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    title: string;
    description: string;
    action: () => void;
    message: string;
  } | null>(null);
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
  const visibleTreatments = rows.filter(
    (item) =>
      item.display_name.toLowerCase().includes(treatmentSearch.trim().toLowerCase()) &&
      (treatmentStatus === "all" || (treatmentStatus === "active" ? item.active : !item.active)) &&
      (treatmentKind === "all" || (treatmentKind === "system" ? item.system : !item.system)),
  );
  const groupedTreatments = treatmentCategories(rows)
    .map((category) => ({
      category,
      items: visibleTreatments.filter((item) => normalizedTreatmentCategory(item) === category),
    }))
    .filter((group) => group.items.length > 0);
  const availableHotelCategories = [
    ...new Set([...HOTEL_CATEGORY_DEFAULTS, ...clinicHotels.flatMap((item) => item.categories)]),
  ];
  const configuredServices = clinic?.planner_included_services ?? DEFAULT_CLINICAL_SERVICES;
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Dental Planner"
        description="Configure reusable clinic treatments, dentists, services and hotels."
      />
      <Tabs defaultValue="treatments">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="treatments">Treatments</TabsTrigger>
          <TabsTrigger value="dentists">Dentists</TabsTrigger>
          <TabsTrigger value="services">Included Services</TabsTrigger>
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
        </TabsList>
        <TabsContent value="treatments">
          <Tabs defaultValue="library">
            <TabsList>
              <TabsTrigger value="library">Treatment Library</TabsTrigger>
              <TabsTrigger value="templates">Plan Templates</TabsTrigger>
            </TabsList>
            <TabsContent value="library">
              <Section
                title="Treatment Library"
                description="Browse clinic treatments, pricing defaults and planner behaviour."
                action={() => setTreatment(blankTreatment(clinicId))}
              >
                <div className="grid gap-2 border-b p-4 sm:grid-cols-[1fr_10rem_10rem_auto]">
                  <Input
                    value={treatmentSearch}
                    onChange={(event) => setTreatmentSearch(event.target.value)}
                    placeholder="Search treatments"
                  />
                  <Select value={treatmentStatus} onValueChange={setTreatmentStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={treatmentKind} onValueChange={setTreatmentKind}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">System & custom</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {(treatmentSearch || treatmentStatus !== "all" || treatmentKind !== "all") && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setTreatmentSearch("");
                        setTreatmentStatus("all");
                        setTreatmentKind("all");
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Accordion type="multiple" className="px-4">
                  {groupedTreatments.map((group) => (
                    <AccordionItem key={group.category} value={group.category}>
                      <AccordionTrigger>
                        <span>
                          {group.category}{" "}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {group.items.length} treatments ·{" "}
                            {group.items.filter((item) => item.active).length} active ·{" "}
                            {group.items.filter((item) => !item.system).length} custom
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="divide-y">
                        {group.items.map((item) => (
                          <Row
                            key={item.id}
                            title={item.display_name}
                            description={`Appears as: ${treatmentName(item.visual_key)} · Behaves like: ${treatmentName(item.base_treatment_key)}`}
                            badges={[
                              item.system ? "System" : "Custom",
                              item.active ? "Active" : "Inactive",
                              priceSummary(item.prices),
                            ]}
                            onEdit={() => setTreatment(item)}
                            onDelete={
                              !item.system
                                ? () =>
                                    setPendingDelete({
                                      title: "Delete treatment?",
                                      description: `${item.display_name} will be removed from this clinic's library.`,
                                      action: () => deleteDefinition(item.id, clinicId),
                                      message: "Treatment removed",
                                    })
                                : undefined
                            }
                          />
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Section>
            </TabsContent>
            <TabsContent value="templates">
              <Section
                title="Plan Templates"
                description="Create reusable clinical plans and edit them in the real Dental Planner."
                action={() => {
                  const record = blankTemplate(clinicId, user.id);
                  saveTemplate(record, user.id);
                  navigate({
                    to: "/dentalplan",
                    search: { mode: "template", templateId: record.id },
                  });
                }}
                actionLabel="Create template"
              >
                {clinicTemplates.map((item) => (
                  <Row
                    key={item.id}
                    title={item.name}
                    description={templateSummary(item)}
                    badges={[item.category, item.active ? "Active" : "Inactive"]}
                    onEdit={() =>
                      navigate({
                        to: "/dentalplan",
                        search: { mode: "template", templateId: item.id },
                      })
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
                      setPendingDelete({
                        title: "Delete template?",
                        description: `${item.name} will be permanently removed.`,
                        action: () => deleteTemplate(item.id, clinicId),
                        message: "Template removed",
                      })
                    }
                  />
                ))}
              </Section>
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="dentists">
          <Section
            title="Dentists"
            description="Manage the clinicians available to new Dental Plans."
            action={() => setDentist({ role: "dentist", active: true, languages: [] })}
          >
            {dentists.map((item) => (
              <Row
                key={item.id}
                title={item.name}
                description={
                  [item.title, item.specialty, item.languages?.join(", ")]
                    .filter(Boolean)
                    .join(" · ") || "Dentist"
                }
                badges={[
                  item.default_planner_dentist ? "Default" : "Dentist",
                  item.active === false ? "Inactive" : "Active",
                ]}
                onEdit={() => setDentist(item)}
                onSecondary={
                  !item.default_planner_dentist
                    ? () => {
                        dentists.forEach((dentistItem) =>
                          updateDentist(dentistItem.id, clinicId, {
                            default_planner_dentist: dentistItem.id === item.id,
                          }),
                        );
                        toast.success(`${item.name} is now the default planner dentist`);
                      }
                    : undefined
                }
                secondaryLabel="Set as default"
                onDelete={() => setDentistToDelete(item)}
              />
            ))}
          </Section>
        </TabsContent>
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Included services</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure the clinical services coordinators can select in the planner. Patient
                plans keep their existing selections if a service is removed here.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={serviceName}
                  onChange={(event) => setServiceName(event.target.value)}
                  placeholder="Add an included service"
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const value = serviceName.trim();
                    if (!value || configuredServices.includes(value)) return;
                    updateClinic(
                      clinicId,
                      { planner_included_services: [...configuredServices, value] },
                      user.id,
                    );
                    setServiceName("");
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    const value = serviceName.trim();
                    if (!value || configuredServices.includes(value)) return;
                    updateClinic(
                      clinicId,
                      { planner_included_services: [...configuredServices, value] },
                      user.id,
                    );
                    setServiceName("");
                    toast.success("Service added");
                  }}
                >
                  <Plus className="size-4" /> Add
                </Button>
              </div>
              <div className="divide-y rounded-lg border">
                {configuredServices.map((service) => (
                  <div key={service} className="flex items-center justify-between gap-3 p-3">
                    <span className="text-sm font-medium">{service}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${service}`}
                      onClick={() =>
                        updateClinic(
                          clinicId,
                          {
                            planner_included_services: configuredServices.filter(
                              (item) => item !== service,
                            ),
                          },
                          user.id,
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="hotels">
          <Section
            title="Hotels"
            description="Hotels configured here become selectable in the planner Package step."
            action={() => setHotel(blankHotel(clinicId, user.id))}
          >
            <div className="grid gap-2 border-b p-4 sm:grid-cols-[1fr_16rem_10rem_auto]">
              <Input
                value={hotelSearch}
                onChange={(event) => setHotelSearch(event.target.value)}
                placeholder="Search hotels"
              />
              <MultiCategoryPicker
                values={hotelCategories}
                options={availableHotelCategories}
                onChange={setHotelCategories}
                label="Filter categories"
              />
              <Select value={hotelStatus} onValueChange={setHotelStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {(hotelSearch || hotelCategories.length > 0 || hotelStatus !== "all") && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setHotelSearch("");
                    setHotelCategories([]);
                    setHotelStatus("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
            {clinicHotels
              // Multiple category filters use OR semantics: a match in any selected category is shown.
              .filter(
                (item) =>
                  item.name.toLowerCase().includes(hotelSearch.trim().toLowerCase()) &&
                  (hotelCategories.length === 0 ||
                    item.categories.some((category) => hotelCategories.includes(category))) &&
                  (hotelStatus === "all" ||
                    (hotelStatus === "active" ? item.active : !item.active)),
              )
              .map((item) => (
                <Row
                  key={item.id}
                  title={item.name}
                  thumbnail={item.images[0]?.data_url}
                  description={`${item.images.length}/4 photos`}
                  badges={[
                    item.is_default ? "Default" : "Hotel",
                    ...item.categories,
                    item.active ? "Active" : "Inactive",
                    formatQuoteMoney(item.price_per_night, item.currency),
                  ]}
                  secondaryHref={item.website}
                  secondaryLabel="Website"
                  onEdit={() => setHotel(item)}
                  onDelete={() =>
                    setPendingDelete({
                      title: "Delete hotel?",
                      description: `${item.name} will be removed from the hotel library.`,
                      action: () => deleteHotel(item.id, clinicId),
                      message: "Hotel removed",
                    })
                  }
                />
              ))}
          </Section>
        </TabsContent>
      </Tabs>
      <TreatmentDialog
        value={treatment}
        categories={treatmentCategories(rows)}
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
      <AlertDialog
        open={!!dentistToDelete}
        onOpenChange={(open) => !open && setDentistToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {plans.some((plan) => plan.dentist_id === dentistToDelete?.id)
                ? "Deactivate dentist?"
                : "Delete dentist?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {plans.some((plan) => plan.dentist_id === dentistToDelete?.id)
                ? "This dentist has historical treatment plans and will be deactivated. Existing assignments will be preserved."
                : "This dentist has no treatment-plan references and will be permanently removed from this clinic."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!dentistToDelete) return;
                const referenced = plans.some((plan) => plan.dentist_id === dentistToDelete.id);
                deleteDentist(dentistToDelete.id, clinicId);
                toast.success(referenced ? "Dentist deactivated" : "Dentist removed");
                setDentistToDelete(null);
              }}
            >
              {plans.some((plan) => plan.dentist_id === dentistToDelete?.id)
                ? "Deactivate"
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pendingDelete?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pendingDelete?.action();
                if (pendingDelete) toast.success(pendingDelete.message);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  description,
  action,
  actionLabel = "Add",
  children,
}: {
  title: string;
  description?: string;
  action: () => void;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <Button size="sm" onClick={action}>
          <Plus className="size-4" /> {actionLabel}
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
  thumbnail,
  description,
  badges,
  onEdit,
  onDelete,
  editLabel = "Edit",
  onSecondary,
  secondaryHref,
  secondaryLabel,
  onDuplicate,
}: {
  title: string;
  thumbnail?: string;
  description: string;
  badges: string[];
  onEdit: () => void;
  onDelete?: () => void;
  editLabel?: string;
  onSecondary?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
  onDuplicate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      {thumbnail && (
        <img src={thumbnail} alt="" className="h-14 w-20 rounded-md border object-cover" />
      )}
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
      <div className="flex items-center gap-2">
        {secondaryHref && (
          <Button size="sm" variant="ghost" asChild>
            <a href={secondaryHref} target="_blank" rel="noopener noreferrer">
              {secondaryLabel}
            </a>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label={`Actions for ${title}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>{editLabel}</DropdownMenuItem>
            {onSecondary && (
              <DropdownMenuItem onSelect={onSecondary}>{secondaryLabel}</DropdownMenuItem>
            )}
            {onDuplicate && <DropdownMenuItem onSelect={onDuplicate}>Duplicate</DropdownMenuItem>}
            {onDelete && (
              <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
  categories,
  onClose,
  onSave,
}: {
  value: ClinicTreatmentDefinition | null;
  categories: string[];
  onClose: () => void;
  onSave: (value: ClinicTreatmentDefinition) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [pricesOpen, setPricesOpen] = useState(false);
  if (value?.id !== draft?.id) setDraft(value);
  if (!draft) return null;
  const patch = (next: Partial<ClinicTreatmentDefinition>) => setDraft({ ...draft, ...next });
  return (
    <DialogFrame open title="Treatment" onClose={onClose} onSave={() => onSave(draft)}>
      <Field label="Treatment name">
        <Input
          value={draft.display_name}
          onChange={(e) => patch({ display_name: e.target.value })}
        />
      </Field>
      <Field label="Treatment category">
        <Combobox
          value={draft.category}
          options={categories.map((category) => ({ value: category, label: category }))}
          onValueChange={(category) => patch({ category })}
          searchPlaceholder="Search categories..."
          emptyText="No categories found"
        />
      </Field>
      <Field label="Description" wide>
        <Textarea
          value={draft.description ?? ""}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </Field>
      <Field label="Default prices" wide>
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
          <span className="flex-1 text-sm">{priceSummary(draft.prices)}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setPricesOpen(true)}>
            Manage prices
          </Button>
        </div>
      </Field>
      <Field label="Treatment behaviour" wide>
        <p className="mb-2 text-xs text-muted-foreground">
          Choose which existing treatment this should behave like. This controls where it can be
          applied, conflicts and price quantity rules.
        </p>
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
      <Field label="Diagram appearance" wide>
        <p className="mb-2 text-xs text-muted-foreground">
          Choose how this treatment will appear on the dental diagram. You can reuse an existing
          visual such as Implant, Crown or Extraction.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TREATMENT_DEFINITIONS.filter((item) => item.supported).map((item) => (
            <Button
              key={item.type}
              type="button"
              variant={draft.visual_key === item.type ? "default" : "outline"}
              className="h-auto justify-start gap-2 py-2"
              onClick={() => patch({ visual_key: item.type })}
            >
              <Tooth
                toothNumber={11}
                currentConditions={{}}
                proposedTreatments={[
                  {
                    id: `preview-${item.type}`,
                    toothNumbers: [11],
                    treatmentType: item.type,
                    visualKey: item.type,
                  },
                ]}
                mode="proposed"
                selected={false}
                readOnly
                onSelect={() => {}}
              />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>
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
      <TreatmentPriceManager
        open={pricesOpen}
        prices={draft.prices}
        onClose={() => setPricesOpen(false)}
        onSave={(prices) => {
          patch({ prices });
          setPricesOpen(false);
        }}
      />
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
  useEffect(() => setDraft(value), [value]);
  if (!draft) return null;
  const patch = (next: Partial<User>) => setDraft({ ...draft, ...next });
  return (
    <DialogFrame
      open
      title="Dentist"
      onClose={onClose}
      onSave={() => {
        if (!draft.name?.trim()) return toast.error("Enter the dentist's full name");
        if (draft.email && !/^\S+@\S+\.\S+$/.test(draft.email))
          return toast.error("Enter a valid email or leave it empty");
        onSave({ ...draft, name: draft.name.trim(), email: draft.email?.trim() ?? "" });
      }}
    >
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
    if (draft.images.length >= 4) {
      toast.error("A hotel can have up to four images");
      return;
    }
    try {
      patch({ images: [...draft.images, await assetAdapter.readHotelImage(file)] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid image");
    }
  };
  return (
    <DialogFrame
      open
      title="Hotel"
      onClose={onClose}
      onSave={() => {
        const website = normalizeWebsite(draft.website);
        if (website && !isValidWebsite(website)) return toast.error("Enter a valid hotel website");
        onSave({ ...draft, website });
      }}
    >
      <Field label="Hotel name">
        <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>
      <Field label="Hotel website">
        <Input
          type="url"
          value={draft.website ?? ""}
          placeholder="https://hotel.example"
          onChange={(event) => patch({ website: event.target.value })}
          onBlur={() => patch({ website: normalizeWebsite(draft.website) })}
        />
      </Field>
      <Field label="Hotel categories" wide>
        <MultiCategoryPicker
          values={draft.categories}
          options={[...new Set([...HOTEL_CATEGORY_DEFAULTS, ...draft.categories])]}
          onChange={(categories) => patch({ categories })}
          label="Select categories"
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
      <Field label="Photos" wide>
        <Attachment
          items={draft.images.map((image) => ({
            id: image.id,
            name: image.name,
            dataUrl: image.data_url,
          }))}
          onAdd={addImage}
          onRemove={(id) => patch({ images: draft.images.filter((image) => image.id !== id) })}
          onMove={(from, to) => patch({ images: move(draft.images, from, to) })}
          maxFiles={4}
        />
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
    </DialogFrame>
  );
}

function TreatmentPriceManager({
  open,
  prices,
  onClose,
  onSave,
}: {
  open: boolean;
  prices: Partial<Record<PlannerCurrency, number>>;
  onClose: () => void;
  onSave: (prices: Partial<Record<PlannerCurrency, number>>) => void;
}) {
  const [draft, setDraft] = useState(prices);
  const [nextCurrency, setNextCurrency] = useState<PlannerCurrency>("EUR");
  useEffect(() => {
    if (open) setDraft(prices);
  }, [open, prices]);
  const configured = currencies.filter((currency) => draft[currency] !== undefined);
  const available = currencies.filter((currency) => draft[currency] === undefined);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage default prices</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {configured.map((currency) => (
            <div key={currency} className="grid grid-cols-[6rem_1fr_auto] items-center gap-2">
              <span className="text-sm font-medium">
                {currencySymbol(currency)} {currency}
              </span>
              <Input
                type="number"
                min={0}
                value={draft[currency] ?? ""}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value))
                    setDraft({ ...draft, [currency]: Math.max(0, value) });
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove ${currency} price`}
                onClick={() => {
                  const next = { ...draft };
                  delete next[currency];
                  setDraft(next);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {available.length > 0 && (
            <div className="flex gap-2">
              <Select
                value={available.includes(nextCurrency) ? nextCurrency : available[0]}
                onValueChange={(value) => setNextCurrency(value as PlannerCurrency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {available.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currencySymbol(currency)} {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const currency = available.includes(nextCurrency) ? nextCurrency : available[0];
                  setDraft({ ...draft, [currency]: 0 });
                }}
              >
                Add price
              </Button>
            </div>
          )}
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

function MultiCategoryPicker({
  values,
  options,
  onChange,
  label,
}: {
  values: string[];
  options: readonly string[];
  onChange: (values: string[]) => void;
  label: string;
}) {
  const [query, setQuery] = useState("");
  const visibleOptions = options.filter((option) =>
    option.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-start">
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search categories..."
          />
          <p className="mb-2 text-xs text-muted-foreground">
            Multiple selections match any category.
          </p>
          {visibleOptions.length ? (
            visibleOptions.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={values.includes(option)}
                  onCheckedChange={(checked) =>
                    onChange(
                      checked
                        ? [...new Set([...values, option])]
                        : values.filter((value) => value !== option),
                    )
                  }
                />
                {option}
              </label>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No categories found</p>
          )}
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-1">
        {values.map((value) => (
          <Badge key={value} variant="secondary">
            {value}
            <button
              type="button"
              className="ml-1"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((item) => item !== value))}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function priceSummary(prices: Partial<Record<PlannerCurrency, number>>) {
  const entries = currencies.filter((currency) => prices[currency] !== undefined);
  return entries.length
    ? entries.map((currency) => formatQuoteMoney(prices[currency] ?? 0, currency)).join(" · ")
    : "No default prices";
}
function treatmentName(key: string) {
  return TREATMENT_DEFINITIONS.find((item) => item.type === key)?.label ?? "Other";
}
function templateSummary(template: DentalPlanTemplate) {
  const plan = createDentalPlan(template.plan_data as never);
  const upper = plan.proposedTreatments.some((item) =>
    item.toothNumbers.some((tooth) => tooth < 30),
  );
  const lower = plan.proposedTreatments.some((item) =>
    item.toothNumbers.some((tooth) => tooth > 30),
  );
  return `${upper && lower ? "Both arches" : upper ? "Upper arch" : lower ? "Lower arch" : "No arch"} · ${plan.proposedTreatments.length} treatments · ${plan.treatmentGroups.length} linked groups`;
}
function currencySymbol(currency: PlannerCurrency) {
  return { GBP: "£", EUR: "€", USD: "$", TRY: "₺" }[currency];
}
function normalizeWebsite(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
function isValidWebsite(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
    categories: ["Standard"],
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
