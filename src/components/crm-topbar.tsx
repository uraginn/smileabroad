import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  ClipboardPlus,
  Menu,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth/mock-auth";
import { deriveClinicNotifications } from "@/lib/crm-notifications";
import { buildCrmSearchIndex } from "@/lib/crm-search";
import { formatCrmDate } from "@/lib/format";
import { useMockStore } from "@/lib/mock/store";

export function CrmTopbar({
  activeLabel,
  onOpenNavigation,
}: {
  activeLabel: string;
  onOpenNavigation: () => void;
}) {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const clinicId = user?.clinic_id ?? "";
  const clinics = useMockStore((state) => state.clinics);
  const leads = useMockStore((state) => state.leads);
  const patients = useMockStore((state) => state.patients);
  const plans = useMockStore((state) => state.treatmentPlans);
  const tasks = useMockStore((state) => state.tasks);
  const appointments = useMockStore((state) => state.appointments);
  const applications = useMockStore((state) => state.applications);
  const followUps = useMockStore((state) => state.followUps);
  const notifications = useMockStore((state) => state.notifications);
  const syncNotifications = useMockStore((state) => state.syncNotifications);
  const markRead = useMockStore((state) => state.markNotificationRead);
  const markAllRead = useMockStore((state) => state.markAllNotificationsRead);
  const [searchOpen, setSearchOpen] = useState(false);
  const clinic = clinics.find((item) => item.id === clinicId);
  const searchResults = useMemo(
    () => buildCrmSearchIndex({ clinicId, leads, patients, plans }),
    [clinicId, leads, patients, plans],
  );
  const derivedNotifications = useMemo(
    () =>
      clinicId && user?.id
        ? deriveClinicNotifications({
            clinicId,
            userId: user.id,
            userRole: user.role,
            applications,
            leads,
            tasks,
            followUps,
            plans,
            appointments,
          })
        : [],
    [appointments, applications, clinicId, followUps, leads, plans, tasks, user?.id, user?.role],
  );
  useEffect(() => {
    if (clinicId && user?.id) syncNotifications(clinicId, user.id, derivedNotifications);
  }, [clinicId, derivedNotifications, syncNotifications, user?.id]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const visibleNotifications = notifications
    .filter((item) => item.clinic_id === clinicId && (!item.user_id || item.user_id === user?.id))
    .sort(
      (a, b) =>
        Number(Boolean(a.read_at)) - Number(Boolean(b.read_at)) ||
        +new Date(b.created_at) - +new Date(a.created_at),
    );
  const unread = visibleNotifications.filter((item) => !item.read_at).length;
  const canCreatePlan = ["clinic_owner", "clinic_admin", "coordinator", "dentist"].includes(
    user?.role ?? "",
  );
  const canManageIntake = ["clinic_owner", "clinic_admin", "coordinator", "sales"].includes(
    user?.role ?? "",
  );

  return (
    <>
      <header className="flex h-14 items-center justify-between gap-2 border-b bg-card px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onOpenNavigation}
            aria-label="Open CRM navigation"
          >
            <Menu className="size-4" />
          </Button>
          <span className="truncate text-sm font-medium md:hidden">{activeLabel}</span>
          <Button
            variant="outline"
            className="h-9 min-w-0 justify-start text-muted-foreground sm:w-72"
            onClick={() => setSearchOpen(true)}
            aria-label="Search patients, leads and treatment plans"
          >
            <Search className="size-4" />
            <span className="hidden truncate sm:inline">Search patients, leads and plans…</span>
            <kbd className="ml-auto hidden text-[10px] lg:inline">Ctrl K</kbd>
          </Button>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Quick actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canCreatePlan && (
                <DropdownMenuItem asChild>
                  <Link to="/pro/treatment-plans" search={{ create: true }}>
                    <ClipboardPlus />
                    Create Treatment Plan
                  </Link>
                </DropdownMenuItem>
              )}
              {canManageIntake && (
                <DropdownMenuItem asChild>
                  <Link to="/pro/leads">
                    <Plus />
                    Add New Lead
                  </Link>
                </DropdownMenuItem>
              )}
              {canManageIntake && (
                <DropdownMenuItem asChild>
                  <Link to="/pro/patients">
                    <UserPlus />
                    Add Patient
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/pro/tasks">
                  <CheckSquare />
                  Create Task
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/pro/appointments">
                  <CalendarPlus />
                  Book Appointment
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={`${unread} unread notifications`}
              >
                <Bell className="size-4" />
                {unread > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 text-[10px]">
                    {unread}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
              <div className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">{unread} unread</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!unread}
                  onClick={() => markAllRead(clinicId, user?.id)}
                >
                  Mark all read
                </Button>
              </div>
              <Separator />
              <ScrollArea className="h-80">
                {visibleNotifications.length ? (
                  visibleNotifications.slice(0, 20).map((item) => (
                    <a
                      key={item.id}
                      href={item.action_url}
                      onClick={() => markRead(item.id, clinicId, user?.id)}
                      className="block border-b p-3 hover:bg-muted/50"
                    >
                      <div className="flex gap-2">
                        <span
                          className={`mt-1 size-2 shrink-0 rounded-full ${item.read_at ? "bg-muted" : "bg-primary"}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {item.title}
                            {!item.read_at && <span className="sr-only">, unread</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{item.message}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatCrmDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    No notifications need your attention.
                  </p>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 max-w-48 gap-2 px-2">
                <span className="hidden truncate text-left sm:block">
                  <span className="block truncate text-xs font-medium">{user?.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {user?.role.replace(/_/g, " ")}
                  </span>
                </span>
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <span className="block truncate">{clinic?.name}</span>
                <span className="font-normal text-muted-foreground">
                  {user?.name} · {user?.role.replace(/_/g, " ")}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["clinic_owner", "clinic_admin"].includes(user?.role ?? "") && (
                <DropdownMenuItem asChild>
                  <Link to="/pro/settings">Settings</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  void navigate({ to: "/login" });
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search by name, email, phone or plan…" />
        <CommandList>
          <CommandEmpty>No clinic records found.</CommandEmpty>
          {(["Leads", "Patients", "Treatment Plans"] as const).map((group) => (
            <CommandGroup key={group} heading={group}>
              {searchResults
                .filter((item) => item.group === group)
                .slice(0, 5)
                .map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.subtitle} ${item.keywords}`}
                    onSelect={() => {
                      setSearchOpen(false);
                      window.location.assign(item.href);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                    {item.status && (
                      <Badge variant="outline" className="capitalize">
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
