import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { RoleSwitcher } from "@/components/role-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/mock-auth";
import { useMockStore } from "@/lib/mock/store";
import { cn } from "@/lib/utils";
import { Bell, ChevronsLeftRight, Menu, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface SidebarItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  group?: "overview" | "sales" | "clinical" | "clinic";
}

const SIDEBAR_GROUPS: Array<{
  key: NonNullable<SidebarItem["group"]>;
  title: string;
  order: number;
}> = [
  { key: "overview", title: "Overview", order: 1 },
  { key: "sales", title: "Sales & Patients", order: 2 },
  { key: "clinical", title: "Clinical", order: 3 },
  { key: "clinic", title: "Clinic Management", order: 4 },
];

export function SidebarShell({
  items,
  children,
  section,
  title,
}: {
  items: SidebarItem[];
  children: ReactNode;
  section: string;
  title?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuth((s) => s.user);
  const clinic = useMockStore((s) => s.clinics.find((item) => item.id === user?.clinic_id));
  const activeItem = useMemo(
    () =>
      items.find(
        (item) => pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to)),
      ),
    [items, pathname],
  );
  const grouped = useMemo(
    () =>
      SIDEBAR_GROUPS.map((group) => ({
        ...group,
        items: items.filter((item) => item.group === group.key),
      })).filter((group) => group.items.length > 0),
    [items],
  );

  const ungroupedItems = useMemo(() => items.filter((item) => item.group == null), [items]);

  const navList = (
    <>
      {grouped.map((group, index) => (
        <div key={group.key}>
          {index > 0 && <Separator className="bg-sidebar-border/70 my-3" />}
          <NavGroup
            title={group.title}
            items={group.items}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      ))}
      {ungroupedItems.length > 0 && (
        <>
          {grouped.length > 0 && <Separator className="bg-sidebar-border/70 my-3" />}
          <NavGroup
            title="Navigation"
            items={ungroupedItems}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={() => setMobileOpen(false)}
          />
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside
        className={cn(
          "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all",
          collapsed ? "w-20" : "w-72",
        )}
      >
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between gap-2">
            <Logo invert className={cn(collapsed && "justify-center")} />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-sidebar-foreground hover:bg-sidebar-accent/80"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronsLeftRight className="size-4" />
            </Button>
          </div>
          {!collapsed && (
            <>
              <p className="mt-3 text-xs uppercase tracking-wider text-sidebar-foreground/70">
                {section}
              </p>
              {clinic && (
                <p className="text-sm mt-1 text-sidebar-foreground/90 truncate">{clinic.name}</p>
              )}
            </>
          )}
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">{navList}</nav>
        <div className="p-3 border-t border-sidebar-border space-y-3">
          {!collapsed && <RoleSwitcher />}
          <Link to="/" className="text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground">
            ← Back to site
          </Link>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[92vw] max-w-xs p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-left">
              <Logo />
            </SheetTitle>
            <SheetDescription className="text-left">
              {clinic ? clinic.name : section}
            </SheetDescription>
          </SheetHeader>
          <div className="h-[calc(100dvh-9rem)] overflow-y-auto p-3">{navList}</div>
          <div className="p-3 border-t">
            <RoleSwitcher />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold truncate">
                {title ?? activeItem?.label ?? section}
              </h1>
              {clinic && (
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  {clinic.name}
                </p>
              )}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 w-full max-w-sm">
            <Search className="size-4 text-muted-foreground" />
            <Input
              readOnly
              value="Search (placeholder)"
              aria-label="Search placeholder"
              className="h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              Overview
            </Badge>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Notifications placeholder"
            >
              <Bell className="size-4" />
            </Button>
            <div className="md:hidden">
              <RoleSwitcher />
            </div>
          </div>
        </header>
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function NavGroup({
  title,
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  title: string;
  items: SidebarItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-2 pb-1 text-[11px] uppercase tracking-wider text-sidebar-foreground/60">
          {title}
        </p>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge != null && (
                  <span className="text-xs bg-accent text-accent-foreground rounded-full px-2 py-0.5">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        );
      })}
    </div>
  );
}
