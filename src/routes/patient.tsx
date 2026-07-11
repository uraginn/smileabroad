import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarShell } from "@/components/sidebar-shell";
import { LayoutDashboard, FileHeart, Inbox, MessageSquare, User, Map } from "lucide-react";

export const Route = createFileRoute("/patient")({ component: PatientLayout });

const items = [
  { to: "/patient/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patient/applications", label: "Applications", icon: FileHeart },
  { to: "/patient/offers", label: "Offers", icon: Inbox },
  { to: "/patient/roadmaps", label: "Roadmaps", icon: Map },
  { to: "/patient/messages", label: "Messages", icon: MessageSquare },
  { to: "/patient/profile", label: "Profile", icon: User },
];

function PatientLayout() {
  return <SidebarShell items={items} section="Patient portal"><Outlet /></SidebarShell>;
}
