import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
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
import { canUser, permissionForProPath } from "@/lib/auth/permissions";

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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (!hydrated) return <PageLoading label="Loading clinic workspace" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "platform_admin") return <Navigate to="/admin/dashboard" replace />;
  if (!canUser(user, permissionForProPath(pathname)))
    return <Navigate to="/pro/dashboard" replace />;
  const visibleItems = items.filter((item) => canUser(user, permissionForProPath(item.to)));
  return (
    <SidebarShell items={visibleItems} section="Clinic CRM">
      <Outlet />
    </SidebarShell>
  );
}
