import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/mock-auth";
import { canUser } from "@/lib/auth/permissions";
import { LEAD_PIPELINE_STAGES } from "@/lib/lead-workflow";
import { useMockStore } from "@/lib/mock/store";
import { makeId } from "@/lib/mock/seed";
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

export const Route = createFileRoute("/pro/settings/")({ component: ClinicSettings });
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
          <TabsTrigger value="templates">Communication Templates</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="security">Security & Data</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Profile
            clinic={clinic}
            brand={brand}
            save={(clinicPatch, brandPatch) => {
              updateClinic(clinicId, clinicPatch, actor?.id);
              if (brand) updateBranding(clinicId, brandPatch);
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
                Treatments, dentist profiles, clinical templates and hotels remain in the existing
                planner settings workspace.
              </p>
              <Button className="mt-4" asChild>
                <Link to="/pro/settings/dental-planner">Open Dental Planner settings</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="workflow">
          <Pipeline
            rows={pipeline}
            save={(rows) => saveSettings(clinicId, { pipeline: rows, sources }, actor?.id)}
          />
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
        <TabsContent value="sources">
          <Sources
            rows={sources}
            save={(rows) => saveSettings(clinicId, { pipeline, sources: rows }, actor?.id)}
          />
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
  const [logoUploadError, setLogoUploadError] = useState("");
  const [sharedBanner, setSharedBanner] = useState(
    clinic.cover_image || brand?.shared_view_banner_url || "",
  );
  const [sharedTagline, setSharedTagline] = useState(brand?.shared_view_tagline ?? "");
  const [sharedIntroduction, setSharedIntroduction] = useState(
    brand?.shared_view_introduction ?? "",
  );
  const [primaryColor, setPrimaryColor] = useState(brand?.primary_color ?? "#0f766e");
  const [secondaryColor, setSecondaryColor] = useState(brand?.secondary_color ?? "#334155");
  const [sharedAccent, setSharedAccent] = useState(
    brand?.shared_view_accent_color ?? brand?.primary_color ?? "#0f766e",
  );
  const logoIsSvg = !sharedLogo || isSvgLogoUrl(sharedLogo);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinic Profile</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Clinic name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Website">
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
        </Field>
        <Field label="Public phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Public email">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
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
        <div className="sm:col-span-2 border-t pt-4">
          <h3 className="font-medium">Clinic branding</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your clinic identity is used automatically across patient-facing Treatment Plans.
          </p>
        </div>
        <Field label="Clinic logo URL (SVG only)">
          <Input
            value={sharedLogo}
            placeholder="https://example.com/clinic-logo.svg"
            aria-invalid={!logoIsSvg}
            onChange={(e) => setSharedLogo(e.target.value)}
          />
          {!logoIsSvg && (
            <p className="mt-1 text-xs text-destructive">
              Shared Treatment Plan logos must use an SVG URL.
            </p>
          )}
          <div className="mt-2">
            <Input
              type="file"
              accept=".svg,image/svg+xml"
              aria-label="Upload clinic SVG logo"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.type !== "image/svg+xml" || !file.name.toLowerCase().endsWith(".svg")) {
                  setLogoUploadError("Choose an SVG file with the image/svg+xml MIME type.");
                  event.target.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    setSharedLogo(reader.result);
                    setLogoUploadError("");
                  }
                };
                reader.onerror = () => setLogoUploadError("The SVG logo could not be read.");
                reader.readAsDataURL(file);
              }}
            />
            {logoUploadError && <p className="mt-1 text-xs text-destructive">{logoUploadError}</p>}
          </div>
        </Field>
        <Field label="Clinic banner URL">
          <Input value={sharedBanner} onChange={(e) => setSharedBanner(e.target.value)} />
        </Field>
        <Field label="Tagline">
          <Input value={sharedTagline} onChange={(e) => setSharedTagline(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Shared Treatment Plan introduction">
            <Textarea
              value={sharedIntroduction}
              maxLength={250}
              rows={4}
              placeholder="A short, reassuring welcome shown at the beginning of each patient Treatment Plan."
              onChange={(e) => setSharedIntroduction(e.target.value)}
            />
          </Field>
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {sharedIntroduction.length}/250
          </p>
        </div>
        <Field label="Primary color">
          <Input
            type="color"
            className="h-10"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
          />
        </Field>
        <Field label="Secondary color">
          <Input
            type="color"
            className="h-10"
            value={secondaryColor}
            onChange={(e) => setSecondaryColor(e.target.value)}
          />
        </Field>
        <Field label="Accent color">
          <Input
            type="color"
            className="h-10"
            value={sharedAccent}
            onChange={(e) => setSharedAccent(e.target.value)}
          />
        </Field>
        {sharedBanner && (
          <img
            src={sharedBanner}
            alt="Shared Treatment Plan banner preview"
            className="sm:col-span-2 h-32 w-full rounded-lg object-cover"
          />
        )}
        <Button
          className="sm:col-span-2 sm:w-fit"
          disabled={!logoIsSvg}
          onClick={() =>
            save(
              {
                name,
                website,
                country,
                city,
                cover_image: sharedBanner,
                short_description: description,
              },
              {
                website,
                phone,
                email,
                logo_url: sharedLogo || undefined,
                shared_view_tagline: sharedTagline || undefined,
                shared_view_introduction: sharedIntroduction.trim() || undefined,
                primary_color: primaryColor,
                secondary_color: secondaryColor,
                shared_view_accent_color: sharedAccent,
              },
            )
          }
        >
          Save profile
        </Button>
      </CardContent>
    </Card>
  );
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
