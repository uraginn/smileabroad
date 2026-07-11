import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarShell } from "@/components/sidebar-shell";
import { LayoutDashboard, Building2, Users, Settings } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const items = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/clinics", label: "Clinics", icon: Building2 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  return <SidebarShell items={items} section="Platform admin"><Outlet /></SidebarShell>;
}
