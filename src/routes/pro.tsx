import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { SidebarShell } from "@/components/sidebar-shell";
import {
  LayoutDashboard,
  Kanban,
  Users,
  ClipboardList,
  CalendarCheck,
  CheckSquare,
  Settings,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { useAuth, useAuthHydrated } from "@/lib/auth/mock-auth";
import { PageLoading } from "@/components/ui-bits";

export const Route = createFileRoute("/pro")({ component: ProLayout });

const items = [
  { to: "/pro/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "work" as const },
  { to: "/pro/leads", label: "Leads", icon: Kanban, group: "work" as const },
  { to: "/pro/patients", label: "Patients", icon: Users, group: "work" as const },
  {
    to: "/pro/treatment-plans",
    label: "Treatment Plans",
    icon: ClipboardList,
    group: "work" as const,
  },
  { to: "/pro/tasks", label: "Tasks", icon: CheckSquare, group: "operations" as const },
  {
    to: "/pro/appointments",
    label: "Appointments",
    icon: CalendarCheck,
    group: "operations" as const,
  },
  {
    to: "/pro/communication",
    label: "Communication",
    icon: MessageSquare,
    group: "operations" as const,
  },
  { to: "/pro/reports", label: "Reports", icon: BarChart3, group: "management" as const },
  { to: "/pro/settings", label: "Settings", icon: Settings, group: "management" as const },
];

function ProLayout() {
  const hydrated = useAuthHydrated();
  const user = useAuth((state) => state.user);
  if (!hydrated) return <PageLoading label="Loading clinic workspace" />;
  if (!user || user.role === "platform_admin") return <Navigate to="/login" replace />;
  const visibleItems = ["clinic_owner", "clinic_admin"].includes(user.role)
    ? items
    : items.filter((item) => item.to !== "/pro/settings");
  return (
    <SidebarShell items={visibleItems} section="Clinic CRM">
      <Outlet />
    </SidebarShell>
  );
}
