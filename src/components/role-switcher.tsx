import { useAuth, demoUsers } from "@/lib/auth/mock-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import type { Role } from "@/types/models";
import { UserCog } from "lucide-react";

const roleLabels: Record<Role, string> = {
  clinic_owner: "Clinic Owner",
  clinic_admin: "Clinic Admin",
  coordinator: "Coordinator",
  dentist: "Dentist",
  viewer: "Viewer",
  sales: "Sales",
  platform_admin: "Platform Admin",
};

const roleRoutes: Record<Role, string> = {
  clinic_owner: "/pro/dashboard",
  clinic_admin: "/pro/dashboard",
  coordinator: "/pro/dashboard",
  dentist: "/pro/dashboard",
  viewer: "/pro/dashboard",
  sales: "/pro/dashboard",
  platform_admin: "/admin/dashboard",
};

export function RoleSwitcher() {
  const { user, loginAs, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserCog className="size-4" />
          <span className="hidden sm:inline">Demo: {user ? roleLabels[user.role] : "Guest"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Sign in as demo user</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(demoUsers) as Role[]).map((r) => (
          <DropdownMenuItem
            key={r}
            onClick={() => {
              loginAs(r);
              navigate({ to: roleRoutes[r] });
            }}
          >
            {roleLabels[r]}
            <span className="ml-auto text-xs text-muted-foreground">{demoUsers[r].name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout();
            navigate({ to: "/" });
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
