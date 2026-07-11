import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarShell } from "@/components/sidebar-shell";
import {
  LayoutDashboard,
  Kanban,
  Users,
  ClipboardList,
  FileText,
  CalendarCheck,
  CheckSquare,
  FileBox,
  Settings,
  Palette,
} from "lucide-react";

export const Route = createFileRoute("/pro")({ component: ProLayout });

const items = [
  { to: "/pro/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pro/leads", label: "Leads", icon: Kanban },
  { to: "/pro/patients", label: "Patients", icon: Users },
  { to: "/pro/treatment-plans", label: "Treatment Plans", icon: ClipboardList },
  { to: "/pro/quotes", label: "Quotes", icon: FileText },
  { to: "/pro/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/pro/appointments", label: "Appointments", icon: CalendarCheck },
  { to: "/pro/templates", label: "Templates", icon: FileBox },
  { to: "/pro/branding", label: "Branding", icon: Palette, group: "settings" as const },
  { to: "/pro/settings", label: "Settings", icon: Settings, group: "settings" as const },
];

function ProLayout() {
  return (
    <SidebarShell items={items} section="Clinic CRM">
      <Outlet />
    </SidebarShell>
  );
}
