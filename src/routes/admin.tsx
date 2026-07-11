import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { SidebarShell } from "@/components/sidebar-shell";
import { LayoutDashboard, Building2, Users, Settings } from "lucide-react";
import { useAuth, useAuthHydrated } from "@/lib/auth/mock-auth";
import { PageLoading } from "@/components/ui-bits";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const items = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/clinics", label: "Clinics", icon: Building2 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const hydrated = useAuthHydrated();
  const user = useAuth((state) => state.user);
  if (!hydrated) return <PageLoading label="Loading admin workspace" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "platform_admin") return <Navigate to="/pro/dashboard" replace />;
  return <SidebarShell items={items} section="Platform admin"><Outlet /></SidebarShell>;
}
