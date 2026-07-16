import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/mock-auth";
import { canUser } from "@/lib/auth/permissions";
import { LEAD_PIPELINE_STAGES } from "@/lib/lead-workflow";
import { useMockStore } from "@/lib/mock/store";
import { makeId } from "@/lib/mock/seed";
import {
  resolveSharedViewColors,
  SHARED_VIEW_ACCENT,
  SHARED_VIEW_PRIMARY,
} from "@/lib/shared-view-colors";
import type {
  Clinic,
  ClinicBranding,
  CrmPipelineStage,
  CrmSourceDefinition,
  Role,
  User,
} from "@/types/models";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PageHeader } from "@/components/ui-bits";
import { LocalPlannerAssetAdapter } from "@/features/dentalplan/adapters/LocalPlannerAssetAdapter";
import { usePlannerAssetUrl } from "@/features/dentalplan/adapters/plannerAssetStorage";

export const Route = createFileRoute("/pro/settings/")({ component: ClinicSettings });
const settingsAssetAdapter = new LocalPlannerAssetAdapter();
const DEFAULT_SOURCES: CrmSourceDefinition[] = [
  { key: "assessment", label: "SmileAbroad Application", active: true },
  { key: "manual", label: "Manual", active: true },
  { key: "referral", label: "Referral", active: true },
  { key: "campaign", label: "Campaign", active: true },
  { key: "website", label: "Website", active: true },
  { key: "whatsapp", label: "WhatsApp", active: true },
  { key: "instagram", label: "Instagram", active: true },
];
function ClinicSettings() {
  const actor = useAuth((s) => s.user);
  const clinicId = actor?.clinic_id ?? "";
  const clinics = useMockStore((s) => s.clinics);
  const branding = useMockStore((s) => s.branding);
  const users = useMockStore((s) => s.users);
  const tasks = useMockStore((s) => s.tasks);
  const appointments = useMockStore((s) => s.appointments);
  const settings = useMockStore((s) => s.crmSettings);
  const templates = useMockStore((s) => s.communicationTemplates);
  const updateClinic = useMockStore((s) => s.updateClinic);
  const updateBranding = useMockStore((s) => s.updateBranding);
  const saveUser = useMockStore((s) => s.saveClinicUser);
  const saveSettings = useMockStore((s) => s.saveCrmSettings);
  const saveTemplate = useMockStore((s) => s.saveCommunicationTemplate);
  const deleteTemplate = useMockStore((s) => s.deleteCommunicationTemplate);
  const clinic = clinics.find((x) => x.id === clinicId);
  const brand = branding.find((x) => x.clinic_id === clinicId);
  const clinicUsers = useMemo(
    () => users.filter((x) => x.clinic_id === clinicId),
    [users, clinicId],
  );
  const config = settings.find((x) => x.clinic_id === clinicId);
  const pipeline = config?.pipeline.length
    ? config.pipeline
    : LEAD_PIPELINE_STAGES.map((x) => ({
        key: x.key,
        label: x.label,
        active: true,
        terminal:
          x.key === "lost"
            ? ("lost" as const)
            : x.key === "booked"
              ? ("converted" as const)
              : ("none" as const),
      }));
  const sources = config?.sources.length ? config.sources : DEFAULT_SOURCES;
  const [userOpen, setUserOpen] = useState(false);
  const [editing, setEditing] = useState<User>();
  if (!clinic) return null;
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Settings"
        description="Manage clinic identity, access and CRM-wide operational configuration."
      />
      <Tabs defaultValue="profile">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="profile">Clinic Profile</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="planner">Dental Planner</TabsTrigger>
          <TabsTrigger value="workflow">CRM Workflow</TabsTrigger>
          <TabsTrigger value="templates">Communication</TabsTrigger>
          <TabsTrigger value="security">Security & Data</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Profile
            clinic={clinic}
            brand={brand}
            save={(clinicPatch, brandPatch) => {
              updateClinic(clinicId, clinicPatch, actor?.id);
              if (brand) updateBranding(clinicId, brandPatch, actor?.id);
              toast.success("Clinic profile saved");
            }}
          />
        </TabsContent>
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Users & Roles</CardTitle>
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setUserOpen(true);
                }}
              >
                <Plus />
                Create user
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {clinicUsers.map((u) => {
                const workload =
                  tasks.filter(
                    (t) =>
                      t.clinic_id === clinicId &&
                      (t.assigned_user_id ?? t.assigned_to) === u.id &&
                      !t.done,
                  ).length +
                  appointments.filter(
                    (a) =>
                      a.clinic_id === clinicId &&
                      (a.dentist_id === u.id || a.coordinator_id === u.id) &&
                      !["completed", "cancelled"].includes(a.appointment_status ?? "scheduled"),
                  ).length;
                return (
                  <div
                    key={u.id}
                    className="flex flex-col gap-2 border-b py-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {u.email} · {workload} active assignments
                      </p>
                    </div>
                    <Badge variant="outline">{u.role.replace(/_/g, " ")}</Badge>
                    <Badge variant={u.active === false ? "secondary" : "default"}>
                      {u.active === false ? "Inactive" : "Active"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(u);
                        setUserOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <UserDialog
            key={editing?.id ?? "new"}
            open={userOpen}
            onOpenChange={setUserOpen}
            user={editing}
            clinicId={clinicId}
            save={(record) => {
              saveUser(record, actor?.id);
              toast.success("User saved");
              setUserOpen(false);
            }}
          />
        </TabsContent>
        <TabsContent value="planner">
          <Card>
            <CardHeader>
              <CardTitle>Dental Planner configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Treatment Library, dentist profiles, hotels and Included Services are managed in one
                clinic-scoped workspace.
              </p>
              <Button className="mt-4" asChild>
                <Link to="/pro/settings/dental-planner">Open Dental Planner settings</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="workflow">
          <div className="space-y-5">
            <Pipeline
              rows={pipeline}
              save={(rows) => saveSettings(clinicId, { pipeline: rows, sources }, actor?.id)}
            />
            <Sources
              rows={sources}
              save={(rows) => saveSettings(clinicId, { pipeline, sources: rows }, actor?.id)}
            />
          </div>
        </TabsContent>
        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Canonical communication templates</CardTitle>
              <Badge variant="outline">
                {templates.filter((t) => t.clinic_id === clinicId).length} templates
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates
                .filter((t) => t.clinic_id === clinicId)
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-3 border-b py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{t.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{t.body}</p>
                    </div>
                    <Badge variant="outline">{t.channel}</Badge>
                    <Switch
                      checked={t.active}
                      onCheckedChange={(active) => saveTemplate({ ...t, active }, actor?.id)}
                      aria-label={`Activate ${t.name}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(t.id, clinicId)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              <p className="pt-3 text-sm text-muted-foreground">
                Create and use templates from Communication. This view manages the same
                clinic-scoped records.
              </p>
              <Button className="mt-2" asChild>
                <Link to="/pro/communication">Open Communication templates</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <Alert>
            <AlertTitle>Development data environment</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                CRM records are persisted in this browser. Files, authentication, authorization and
                audit records are development-only mock implementations.
              </p>
              <p>
                No production medical-data backend, invitation delivery, communication delivery,
                backups or retention controls are currently connected. This application does not
                claim HIPAA or GDPR compliance.
              </p>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
function Profile({
  clinic,
  brand,
  save,
}: {
  clinic: Clinic;
  brand?: ClinicBranding;
  save: (a: Partial<Clinic>, b: Partial<ClinicBranding>) => void;
}) {
  const [name, setName] = useState(clinic.name);
  const [website, setWebsite] = useState(clinic.website ?? brand?.website ?? "");
  const [country, setCountry] = useState(clinic.country);
  const [city, setCity] = useState(clinic.city);
  const [description, setDescription] = useState(clinic.short_description);
  const [phone, setPhone] = useState(brand?.phone ?? "");
  const [email, setEmail] = useState(brand?.email ?? "");
  const [sharedLogo, setSharedLogo] = useState(
    brand?.logo_url ?? brand?.shared_view_logo_url ?? "",
  );
  const [sharedLogoAssetId, setSharedLogoAssetId] = useState(brand?.logo_asset_id);
  const storedLogoUrl = usePlannerAssetUrl(
    brand?.logo_asset_id,
    brand?.logo_url ?? brand?.shared_view_logo_url,
  );
  useEffect(() => {
    if (sharedLogoAssetId === brand?.logo_asset_id && storedLogoUrl !== sharedLogo)
      setSharedLogo(storedLogoUrl ?? "");
  }, [brand?.logo_asset_id, sharedLogo, sharedLogoAssetId, storedLogoUrl]);
  const [logoUploadError, setLogoUploadError] = useState("");
  const [sharedBanner, setSharedBanner] = useState(
    brand?.shared_view_banner_url || clinic.cover_image || "",
  );
  const [sharedTagline, setSharedTagline] = useState(brand?.shared_view_tagline ?? "");
  const [sharedIntroduction, setSharedIntroduction] = useState(
    brand?.shared_view_introduction ?? "",
  );
  const [sharedClinicImage, setSharedClinicImage] = useState(
    brand?.shared_view_clinic_image_url ?? "",
  );
  const [sharedClinicDescription, setSharedClinicDescription] = useState(
    brand?.shared_view_clinic_description ?? clinic.short_description,
  );
  const [primaryColor, setPrimaryColor] = useState(brand?.primary_color ?? "#0A1626");
  const [secondaryColor, setSecondaryColor] = useState(brand?.secondary_color ?? "#415469");
  const [sharedAccent, setSharedAccent] = useState(
    brand?.shared_view_accent_color ?? SHARED_VIEW_ACCENT,
  );
  const sharedPreviewColors = resolveSharedViewColors(primaryColor, sharedAccent);
  const logoIsSvg = !sharedLogo || !!sharedLogoAssetId || isSvgLogoUrl(sharedLogo);
  const colorsAreValid = [primaryColor, secondaryColor, sharedAccent].every(isHexColor);
  const savedSignature = JSON.stringify({
    name: clinic.name,
    website: clinic.website ?? brand?.website ?? "",
    country: clinic.country,
    city: clinic.city,
    description: clinic.short_description,
    phone: brand?.phone ?? "",
    email: brand?.email ?? "",
    logo: brand?.logo_asset_id ? "" : (brand?.logo_url ?? brand?.shared_view_logo_url ?? ""),
    logoAssetId: brand?.logo_asset_id,
    banner: brand?.shared_view_banner_url || clinic.cover_image || "",
    tagline: brand?.shared_view_tagline ?? "",
    introduction: brand?.shared_view_introduction ?? "",
    clinicImage: brand?.shared_view_clinic_image_url ?? "",
    clinicDescription: brand?.shared_view_clinic_description ?? clinic.short_description,
    primaryColor: normalizeHex(brand?.primary_color ?? "#0A1626"),
    secondaryColor: normalizeHex(brand?.secondary_color ?? "#415469"),
    accent: normalizeHex(brand?.shared_view_accent_color ?? SHARED_VIEW_ACCENT),
  });
  const currentSignature = JSON.stringify({
    name,
    website,
    country,
    city,
    description,
    phone,
    email,
    logo: sharedLogoAssetId ? "" : sharedLogo,
    logoAssetId: sharedLogoAssetId,
    banner: sharedBanner,
    tagline: sharedTagline,
    introduction: sharedIntroduction,
    clinicImage: sharedClinicImage,
    clinicDescription: sharedClinicDescription,
    primaryColor: normalizeHex(primaryColor),
    secondaryColor: normalizeHex(secondaryColor),
    accent: normalizeHex(sharedAccent),
  });
  const dirty = savedSignature !== currentSignature;
  const submit = () => {
    if (!dirty || !logoIsSvg || !colorsAreValid || !name.trim()) return;
    save(
      {
        name: name.trim(),
        website: website.trim() || undefined,
        country: country.trim(),
        city: city.trim(),
        short_description: description.trim(),
      },
      {
        website: website.trim(),
        phone: phone.trim(),
        email: email.trim(),
        logo_url: sharedLogoAssetId ? undefined : sharedLogo.trim() || undefined,
        logo_asset_id: sharedLogoAssetId,
        shared_view_banner_url: sharedBanner.trim() || undefined,
        shared_view_tagline: sharedTagline.trim() || undefined,
        shared_view_introduction: sharedIntroduction.trim() || undefined,
        shared_view_clinic_image_url: sharedClinicImage.trim() || undefined,
        shared_view_clinic_description: sharedClinicDescription.trim() || undefined,
        primary_color: normalizeHex(primaryColor),
        secondary_color: normalizeHex(secondaryColor),
        shared_view_accent_color: normalizeHex(sharedAccent),
      },
    );
  };
  return (
    <Card>
      <CardHeader className="gap-1 border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Clinic Profile</CardTitle>
          <Badge variant={dirty ? "default" : "secondary"}>
            {dirty ? "Unsaved changes" : "Saved"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage the clinic identity and patient-facing information used across Shared Treatment
          Plans.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="details" className="min-w-0">
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-transparent px-4 py-2">
            <TabsTrigger value="details">Clinic Details</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="shared">Shared Patient View</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="m-0 grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            <Field label="Clinic name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Website">
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
            </Field>
            <Field label="Country">
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </Field>
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Public description">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
            </div>
          </TabsContent>
          <TabsContent value="branding" className="m-0 grid gap-6 p-4 lg:grid-cols-2 sm:p-6">
            <div className="space-y-5">
              <Field label="Clinic logo URL (SVG only)">
                <Input
                  value={sharedLogoAssetId ? "Stored SVG logo" : sharedLogo}
                  disabled={Boolean(sharedLogoAssetId)}
                  placeholder="https://example.com/clinic-logo.svg"
                  aria-invalid={!logoIsSvg}
                  onChange={(e) => setSharedLogo(e.target.value)}
                />
                {!logoIsSvg && (
                  <p className="mt-1 text-xs text-destructive">
                    Shared Treatment Plan logos must use an SVG URL.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Input
                    type="file"
                    accept=".svg,image/svg+xml"
                    className="max-w-sm"
                    aria-label="Upload clinic SVG logo"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const asset = await settingsAssetAdapter.readSvgLogo(file);
                        setSharedLogo(asset.data_url ?? "");
                        setSharedLogoAssetId(asset.storage_key);
                        setLogoUploadError("");
                      } catch (error) {
                        setLogoUploadError(
                          error instanceof Error
                            ? error.message
                            : "The SVG logo could not be saved.",
                        );
                        event.target.value = "";
                      }
                    }}
                  />
                  {sharedLogoAssetId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSharedLogo("");
                        setSharedLogoAssetId(undefined);
                      }}
                    >
                      Remove logo
                    </Button>
                  )}
                </div>
                {logoUploadError && (
                  <p className="mt-1 text-xs text-destructive">{logoUploadError}</p>
                )}
              </Field>
              <Field label="Shared View banner URL">
                <Input value={sharedBanner} onChange={(e) => setSharedBanner(e.target.value)} />
              </Field>
              <CompactPaletteEditor
                primary={primaryColor}
                secondary={secondaryColor}
                accent={sharedAccent}
                onPrimary={setPrimaryColor}
                onSecondary={setSecondaryColor}
                onAccent={setSharedAccent}
              />
              <p className="max-w-md text-xs leading-5 text-muted-foreground">
                Shared Patient View uses Primary and Accent with neutral surfaces. Secondary remains
                saved for other clinic materials but is not used in Shared Patient View. Gold or
                amber values are replaced in the Shared View only; saved branding is not
                overwritten.
              </p>
            </div>
            <BrandPreview
              clinicName={name}
              tagline={sharedTagline || description}
              logo={sharedLogo}
              banner={sharedBanner}
              primary={sharedPreviewColors.primary}
              accent={sharedPreviewColors.accent}
            />
          </TabsContent>
          <TabsContent value="shared" className="m-0 space-y-5 p-4 sm:p-6">
            <Field label="Clinic tagline">
              <Input value={sharedTagline} onChange={(e) => setSharedTagline(e.target.value)} />
            </Field>
            <Field label="Patient-facing introduction">
              <Textarea
                value={sharedIntroduction}
                maxLength={250}
                rows={4}
                placeholder="A short, reassuring welcome shown at the beginning of each patient Treatment Plan."
                onChange={(e) => setSharedIntroduction(e.target.value)}
              />
            </Field>
            <p className="text-right text-xs text-muted-foreground">
              {sharedIntroduction.length}/250
            </p>
            <Field label="Shared View clinic image URL">
              <Input
                value={sharedClinicImage}
                placeholder="https://example.com/clinic.jpg"
                onChange={(event) => setSharedClinicImage(event.target.value)}
              />
            </Field>
            <Field label="Patient-facing clinic description">
              <Textarea
                value={sharedClinicDescription}
                maxLength={400}
                rows={5}
                onChange={(event) => setSharedClinicDescription(event.target.value)}
              />
            </Field>
            <p className="text-right text-xs text-muted-foreground">
              {sharedClinicDescription.length}/400
            </p>
            <Alert>
              <AlertTitle>Automatic clinic details</AlertTitle>
              <AlertDescription>
                Clinic name, logo, website and coordinator profile are taken automatically from
                Clinic Profile and the assigned clinic user. They are not duplicated here.
              </AlertDescription>
            </Alert>
          </TabsContent>
          <TabsContent value="contact" className="m-0 grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            <Field label="Public phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Public email">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Website">
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
              </Field>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 sm:px-6">
          <p className="text-xs text-muted-foreground">
            {!colorsAreValid
              ? "Use a valid six-digit hex value for each brand color."
              : !logoIsSvg
                ? "Use an SVG logo URL or upload an SVG file."
                : dirty
                  ? "Review and save your changes."
                  : "Clinic Profile is up to date."}
          </p>
          <Button
            disabled={!dirty || !logoIsSvg || !colorsAreValid || !name.trim()}
            onClick={submit}
          >
            Save Clinic Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactPaletteEditor({
  primary,
  secondary,
  accent,
  onPrimary,
  onSecondary,
  onAccent,
}: {
  primary: string;
  secondary: string;
  accent: string;
  onPrimary: (value: string) => void;
  onSecondary: (value: string) => void;
  onAccent: (value: string) => void;
}) {
  const rows = [
    ["Primary", primary, onPrimary, SHARED_VIEW_PRIMARY],
    ["Secondary", secondary, onSecondary, "#415469"],
    ["Accent", accent, onAccent, SHARED_VIEW_ACCENT],
  ] as const;
  return (
    <div className="w-full max-w-md space-y-3 font-sans">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-center text-lg font-bold tracking-[0.35em] text-slate-900">PALETTE</p>
          <Label className="sr-only">Patient-facing palette</Label>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            onPrimary(SHARED_VIEW_PRIMARY);
            onSecondary("#415469");
            onAccent(SHARED_VIEW_ACCENT);
          }}
        >
          <RotateCcw className="size-4" /> Reset
        </Button>
      </div>
      <div className="overflow-hidden rounded-md shadow-sm">
        {rows.map(([label, value, onChange, fallback], index) => {
          const preview = isHexColor(value) ? value : fallback;
          const foreground = readableForeground(preview);
          return (
            <div
              key={label}
              className="flex min-h-16 items-center justify-between gap-3 px-5 py-3"
              style={{ background: preview, color: foreground }}
            >
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
                <Input
                  type="color"
                  className="size-8 cursor-pointer border-white/40 bg-transparent p-0.5"
                  value={preview}
                  aria-label={`${label} color swatch`}
                  onChange={(event) => onChange(event.target.value.toUpperCase())}
                />
                {label}
              </label>
              <Input
                value={value}
                className="h-9 w-28 border-current bg-transparent text-right font-mono uppercase text-current placeholder:text-current/60"
                maxLength={7}
                aria-invalid={!isHexColor(value)}
                aria-label={`${label} hex color`}
                onBlur={() => isHexColor(value) && onChange(normalizeHex(value))}
                onChange={(event) => onChange(event.target.value.toUpperCase())}
              />
              <span className="sr-only">Palette row {index + 1}</span>
            </div>
          );
        })}
      </div>
      {!rows.every(([, value]) => isHexColor(value)) && (
        <p className="text-xs text-destructive">Enter colors as six-digit hex values.</p>
      )}
    </div>
  );
}

function BrandPreview({
  clinicName,
  tagline,
  logo,
  banner,
  primary,
  accent,
}: {
  clinicName: string;
  tagline: string;
  logo?: string;
  banner?: string;
  primary: string;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="relative grid min-h-64 place-items-center overflow-hidden p-6 text-center">
        {banner && <img src={banner} alt="" className="absolute inset-0 size-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/90 to-white/55" />
        <div className="relative max-w-sm">
          {logo ? (
            <img
              src={logo}
              alt={`${clinicName} logo preview`}
              className="mx-auto max-h-24 max-w-full object-contain"
            />
          ) : (
            <span
              className="mx-auto grid size-14 place-items-center rounded-full text-xl font-semibold text-white"
              style={{ background: primary }}
            >
              {clinicName.charAt(0) || "C"}
            </span>
          )}
          <p className="mt-4 text-lg font-semibold" style={{ color: primary }}>
            {clinicName || "Clinic name"}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
            {tagline || "Your clinic tagline"}
          </p>
          <span
            className="mx-auto mt-4 block h-1 w-16 rounded-full"
            style={{ background: accent }}
          />
        </div>
      </div>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Compact Shared Patient View preview
      </p>
    </div>
  );
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

function normalizeHex(value: string) {
  return value.trim().toUpperCase();
}

function readableForeground(value: string) {
  const hex = value.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? "#1A2332" : "#FFFFFF";
}

function isSvgLogoUrl(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("data:image/svg+xml") || /\.svg(?:[?#].*)?$/.test(normalized);
}
function UserDialog({
  open,
  onOpenChange,
  user,
  clinicId,
  save,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user?: User;
  clinicId: string;
  save: (u: Omit<User, "created_at" | "updated_at" | "created_by">) => void;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "coordinator");
  const [active, setActive] = useState(user?.active !== false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Create user"}</DialogTitle>
          <DialogDescription>
            This creates local CRM access details; no invitation email is sent.
          </DialogDescription>
        </DialogHeader>
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Role">
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["clinic_admin", "coordinator", "dentist", "viewer"].map((r) => (
                <SelectItem key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-center justify-between">
          <Label>Active access</Label>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim() || !email.trim()) return toast.error("Enter name and email");
              save({
                ...user,
                id: user?.id ?? makeId("user"),
                clinic_id: clinicId,
                name: name.trim(),
                email: email.trim(),
                role,
                active,
                status: active ? "active" : "inactive",
                avatar_url: user?.avatar_url,
                title: user?.title,
                specialty: user?.specialty,
                languages: user?.languages,
                default_planner_dentist: user?.default_planner_dentist,
                patient_bio: user?.patient_bio,
                profile_image_name: user?.profile_image_name,
              });
            }}
          >
            Save user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Pipeline({
  rows,
  save,
}: {
  rows: CrmPipelineStage[];
  save: (r: CrmPipelineStage[]) => void;
}) {
  const [draft, setDraft] = useState(rows);
  const move = (i: number, d: number) => {
    const next = [...draft];
    const [row] = next.splice(i, 1);
    next.splice(i + d, 0, row);
    setDraft(next);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {draft.map((row, i) => (
          <div key={row.key} className="flex flex-wrap items-center gap-2 border-b py-2">
            <Badge variant="outline">{row.key}</Badge>
            <Input
              className="min-w-44 flex-1"
              value={row.label}
              onChange={(e) =>
                setDraft(
                  draft.map((x) => (x.key === row.key ? { ...x, label: e.target.value } : x)),
                )
              }
            />
            <Badge>{row.terminal === "none" ? "Stage" : row.terminal}</Badge>
            <Switch
              checked={row.active}
              disabled={row.terminal !== "none"}
              onCheckedChange={(active) =>
                setDraft(draft.map((x) => (x.key === row.key ? { ...x, active } : x)))
              }
            />
            <Button
              size="icon"
              variant="ghost"
              aria-label="Move stage up"
              disabled={!i || row.terminal !== "none"}
              onClick={() => move(i, -1)}
            >
              <ArrowUp />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Move stage down"
              disabled={i === draft.length - 1 || row.terminal !== "none"}
              onClick={() => move(i, 1)}
            >
              <ArrowDown />
            </Button>
          </div>
        ))}
        <Button
          onClick={() => {
            save(draft);
            toast.success("Pipeline saved");
          }}
        >
          Save workflow
        </Button>
      </CardContent>
    </Card>
  );
}
function Sources({
  rows,
  save,
}: {
  rows: CrmSourceDefinition[];
  save: (r: CrmSourceDefinition[]) => void;
}) {
  const [draft, setDraft] = useState(rows);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {draft.map((row) => (
          <div key={row.key} className="flex items-center gap-3 border-b py-2">
            <Badge variant="outline">{row.key}</Badge>
            <Input
              className="flex-1"
              value={row.label}
              onChange={(e) =>
                setDraft(
                  draft.map((x) => (x.key === row.key ? { ...x, label: e.target.value } : x)),
                )
              }
            />
            <Switch
              checked={row.active}
              onCheckedChange={(active) =>
                setDraft(draft.map((x) => (x.key === row.key ? { ...x, active } : x)))
              }
            />
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() =>
            setDraft([
              ...draft,
              { key: `custom_${draft.length + 1}`, label: "New source", active: true },
            ])
          }
        >
          <Plus />
          Add source
        </Button>
        <Button
          className="ml-2"
          onClick={() => {
            save(draft);
            toast.success("Sources saved");
          }}
        >
          Save sources
        </Button>
      </CardContent>
    </Card>
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
