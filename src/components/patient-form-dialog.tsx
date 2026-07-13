import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/lib/auth/mock-auth";
import { useMockStore } from "@/lib/mock/store";
import type { Patient } from "@/types/models";

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient;
  onSaved?: (patient: Patient) => void;
}) {
  const user = useAuth((state) => state.user);
  const users = useMockStore((state) => state.users);
  const addPatient = useMockStore((state) => state.addPatient);
  const updatePatient = useMockStore((state) => state.updatePatient);
  const updateAssignment = useMockStore((state) => state.updatePatientAssignment);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [dentistId, setDentistId] = useState("");
  useEffect(() => {
    if (!open) return;
    setFullName(patient ? `${patient.first_name} ${patient.last_name}`.trim() : "");
    setEmail(patient?.email ?? "");
    setPhone(patient?.phone ?? "");
    setWhatsapp(patient?.whatsapp ?? "");
    setCountry(patient?.country ?? "");
    setLanguage(patient?.language ?? "");
    setDateOfBirth(patient?.date_of_birth ?? "");
    setContactMethod(patient?.preferred_contact_method ?? "");
    setCoordinatorId(patient?.coordinator_id ?? "");
    setDentistId(patient?.dentist_id ?? "");
  }, [open, patient]);
  const clinicId = user?.clinic_id;
  const clinicUsers = users.filter((item) => item.clinic_id === clinicId && item.active !== false);
  const submit = () => {
    if (!clinicId || !fullName.trim() || !email.trim() || !country.trim()) return;
    const originalName = patient ? `${patient.first_name} ${patient.last_name}`.trim() : "";
    const parts = fullName.trim().split(/\s+/);
    const firstName =
      patient && fullName.trim() === originalName
        ? patient.first_name
        : parts.length > 1
          ? parts.slice(0, -1).join(" ")
          : parts[0];
    const lastName =
      patient && fullName.trim() === originalName
        ? patient.last_name
        : parts.length > 1
          ? parts.at(-1)!
          : "";
    if (patient) {
      updatePatient(patient.id, {
        first_name: firstName,
        last_name: lastName,
        email: email.trim(),
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        country: country.trim(),
        language: language.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
        preferred_contact_method: contactMethod || undefined,
      });
      updateAssignment(
        patient.id,
        clinicId,
        { coordinator_id: coordinatorId || undefined, dentist_id: dentistId || undefined },
        user?.id,
      );
      toast.success("Patient updated");
      onSaved?.({
        ...patient,
        first_name: firstName,
        last_name: lastName,
        email: email.trim(),
        country: country.trim(),
        coordinator_id: coordinatorId || undefined,
        dentist_id: dentistId || undefined,
      });
    } else {
      const saved = addPatient(
        {
          clinic_id: clinicId,
          first_name: firstName,
          last_name: lastName,
          email: email.trim(),
          phone: phone.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          country: country.trim(),
          language: language.trim() || undefined,
          date_of_birth: dateOfBirth || undefined,
          preferred_contact_method: contactMethod || undefined,
          coordinator_id: coordinatorId || undefined,
          dentist_id: dentistId || undefined,
          source: "manual",
        },
        user?.id,
      );
      toast.success("Patient record ready");
      onSaved?.(saved);
    }
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{patient ? "Edit patient" : "Add patient"}</DialogTitle>
          <DialogDescription>Identity, contact and current clinic assignment.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </Field>
          <Field label="Date of birth">
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="WhatsApp / phone">
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Phone"
                placeholder="Phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <Input
                aria-label="WhatsApp"
                placeholder="WhatsApp"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
              />
            </div>
          </Field>
          <Field label="Country">
            <Input value={country} onChange={(event) => setCountry(event.target.value)} />
          </Field>
          <Field label="Preferred language">
            <Input value={language} onChange={(event) => setLanguage(event.target.value)} />
          </Field>
          <Field label="Preferred contact">
            <Select value={contactMethod} onValueChange={setContactMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {["WhatsApp", "Phone", "Email"].map((item) => (
                  <SelectItem key={item} value={item.toLowerCase()}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Coordinator">
            <TeamSelect
              value={coordinatorId}
              onChange={setCoordinatorId}
              users={clinicUsers.filter((item) =>
                ["coordinator", "clinic_owner", "clinic_admin"].includes(item.role),
              )}
            />
          </Field>
          <Field label="Dentist">
            <TeamSelect
              value={dentistId}
              onChange={setDentistId}
              users={clinicUsers.filter((item) => item.role === "dentist")}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!fullName.trim() || !email.trim() || !country.trim()} onClick={submit}>
            {patient ? "Save changes" : "Add patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function TeamSelect({
  value,
  onChange,
  users,
}: {
  value: string;
  onChange: (value: string) => void;
  users: Array<{ id: string; name: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Not assigned" />
      </SelectTrigger>
      <SelectContent>
        {users.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
