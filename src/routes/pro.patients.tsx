import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMockStore, selectClinicPatients } from "@/lib/mock/store";
import { useAuth } from "@/lib/auth/mock-auth";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/pro/patients")({ component: Patients });

function Patients() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const clinicId = useAuth((s) => s.user?.clinic_id) ?? "clinic_istanbul";
  const patients = useMockStore(useShallow(selectClinicPatients(clinicId)));
  const leads = useMockStore(useShallow((s) => s.leads.filter((l) => l.clinic_id === clinicId)));
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((patient) => {
      const name = `${patient.first_name} ${patient.last_name}`.toLowerCase();
      const treatment = (patient.treatment_interest ?? "").toLowerCase();
      return (
        name.includes(q) ||
        patient.email.toLowerCase().includes(q) ||
        (patient.phone ?? "").toLowerCase().includes(q) ||
        patient.country.toLowerCase().includes(q) ||
        treatment.includes(q)
      );
    });
  }, [patients, query]);

  if (pathname !== "/pro/patients") return <Outlet />;
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Patients"
        description="Clinic-owned patient records from applications and CRM operations."
        actions={
          <Button disabled title="Manual patient creation is not implemented yet">
            Add patient (unavailable)
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by patient, email, country or treatment"
              className="sm:max-w-md"
              aria-label="Search patients"
            />
            <p className="text-sm text-muted-foreground">
              {filtered.length} of {patients.length} patients
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No matching patients"
                description="Try a different keyword or clear filters."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Treatment</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recent activity</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((patient) => {
                  const lead = leads.find((item) => item.clinic_patient_id === patient.id);
                  return (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        {patient.first_name} {patient.last_name}
                      </TableCell>
                      <TableCell>{patient.country}</TableCell>
                      <TableCell>
                        {patient.treatment_interest ?? lead?.treatment ?? "Not specified"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {patient.source ?? lead?.source ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="space-y-1">
                          <p>{patient.email}</p>
                          {patient.phone && <p className="text-xs">{patient.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {patient.status ?? "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead?.last_activity_at
                          ? format(new Date(lead.last_activity_at), "MMM d, yyyy")
                          : format(new Date(patient.updated_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/pro/patients/$id" params={{ id: patient.id }}>
                            Open →
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
