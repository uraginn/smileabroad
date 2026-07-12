import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
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
  UserRound,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth, useAuthHydrated } from "@/lib/auth/mock-auth";
import { PageLoading } from "@/components/ui-bits";

export const Route = createFileRoute("/pro")({ component: ProLayout });

const items = [
  { to: "/pro/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "overview" as const },

  { to: "/pro/leads", label: "Leads", icon: Kanban, group: "sales" as const },
  { to: "/pro/patients", label: "Patients", icon: Users, group: "sales" as const },
  { to: "/pro/tasks", label: "Tasks", icon: CheckSquare, group: "sales" as const },
  { to: "/pro/appointments", label: "Appointments", icon: CalendarCheck, group: "sales" as const },

  {
    to: "/pro/treatment-plans",
    label: "Treatment Plans",
    icon: ClipboardList,
    group: "clinical" as const,
  },
  { to: "/pro/quotes", label: "Quotes", icon: FileText, group: "clinical" as const },

  { to: "/pro/team", label: "Team", icon: UserRound, group: "clinic" as const },
  { to: "/pro/templates", label: "Templates", icon: FileBox, group: "clinic" as const },
  { to: "/pro/branding", label: "Branding", icon: Palette, group: "clinic" as const },
  { to: "/pro/settings", label: "Settings", icon: Settings, group: "clinic" as const, exact: true },
  {
    to: "/pro/settings/dental-planner",
    label: "Dental Planner",
    icon: SlidersHorizontal,
    group: "clinic" as const,
  },
];

function ProLayout() {
  const hydrated = useAuthHydrated();
  const user = useAuth((state) => state.user);
  if (!hydrated) return <PageLoading label="Loading clinic workspace" />;
  if (!user || user.role === "platform_admin") return <Navigate to="/login" replace />;
  return (
    <SidebarShell items={items} section="Clinic CRM">
      <Outlet />
    </SidebarShell>
  );
}
