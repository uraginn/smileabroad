import { createFileRoute } from "@tanstack/react-router";
import { useMockStore } from "@/lib/mock/store";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/clinics")({ component: AdminClinics });

function AdminClinics() {
  const clinics = useMockStore((s) => s.clinics);
  return (
    <div className="p-6 max-w-6xl">
      <PageHeader title="Clinics" description="All clinics on the platform." />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Clinic</TableHead><TableHead>Country</TableHead><TableHead>Verified</TableHead><TableHead>Rating</TableHead></TableRow></TableHeader>
          <TableBody>{clinics.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>{c.city}, {c.country}</TableCell>
              <TableCell>{c.verified ? <Badge>Verified</Badge> : <Badge variant="outline">Pending</Badge>}</TableCell>
              <TableCell>★ {c.google_rating}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
