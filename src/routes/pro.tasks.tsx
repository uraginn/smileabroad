import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/mock-auth";
import { canUser } from "@/lib/auth/permissions";
import { useMockStore } from "@/lib/mock/store";
import type { Task, TaskType } from "@/types/models";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/pro/tasks")({ component: Tasks });

export const TASK_TYPES: { value: TaskType; label: string }[] = [
  ["call_patient", "Call patient"],
  ["send_reminder", "Send reminder"],
  ["request_photos", "Request dental photos"],
  ["request_xray", "Request X-ray"],
  ["review_medical", "Review medical information"],
  ["doctor_review", "Doctor review"],
  ["prepare_plan", "Prepare Treatment Plan"],
  ["plan_follow_up", "Follow up after plan"],
  ["confirm_appointment", "Confirm appointment"],
  ["confirm_arrival", "Confirm arrival"],
  ["book_hotel", "Book hotel"],
  ["arrange_transfer", "Arrange transfer"],
  ["other", "Other"],
].map(([value, label]) => ({ value: value as TaskType, label }));

function Tasks() {
  const user = useAuth((s) => s.user);
  const clinicId = user?.clinic_id ?? "";
  const tasks = useMockStore((s) => s.tasks);
  const patients = useMockStore((s) => s.patients);
  const leads = useMockStore((s) => s.leads);
  const users = useMockStore((s) => s.users);
  const addTask = useMockStore((s) => s.addTask);
  const updateTask = useMockStore((s) => s.updateTask);
  const [view, setView] = useState("today");
  const [search, setSearch] = useState("");
  const [assigned, setAssigned] = useState("all");
  const [priority, setPriority] = useState("all");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const canManage = canUser(user, "tasks.manage");
  const clinicTasks = useMemo(
    () => tasks.filter((item) => item.clinic_id === clinicId),
    [tasks, clinicId],
  );
  const clinicPatients = useMemo(
    () => patients.filter((item) => item.clinic_id === clinicId),
    [patients, clinicId],
  );
  const clinicLeads = useMemo(
    () => leads.filter((item) => item.clinic_id === clinicId),
    [leads, clinicId],
  );
  const clinicUsers = useMemo(
    () => users.filter((item) => item.clinic_id === clinicId),
    [users, clinicId],
  );
  const now = new Date();
  const filtered = clinicTasks.filter((task) => {
    const due = task.due_at ? new Date(task.due_at) : undefined;
    const status = task.task_status ?? (task.done ? "completed" : "pending");
    const inView =
      view === "all" ||
      (view === "completed"
        ? status === "completed"
        : status !== "completed" &&
          (view === "today"
            ? Boolean(due && isToday(due))
            : view === "overdue"
              ? Boolean(due && due < now && !isToday(due))
              : Boolean(!due || due > now)));
    const person = clinicPatients.find(
      (item) => item.id === (task.patient_id ?? task.patient_user_id),
    );
    const lead = clinicLeads.find((item) => item.id === task.lead_id);
    return (
      inView &&
      (assigned === "all" || (task.assigned_user_id ?? task.assigned_to) === assigned) &&
      (priority === "all" || (task.priority ?? "normal") === priority) &&
      (type === "all" || (task.type ?? "other") === type) &&
      `${task.title} ${person?.first_name ?? ""} ${person?.last_name ?? ""} ${lead?.patient_name ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Tasks"
        description="Plan and complete clinic work without mixing it with patient follow-ups."
        actions={
          canManage ? (
            <Button onClick={() => setOpen(true)}>
              <Plus />
              Create task
            </Button>
          ) : undefined
        }
      />
      <Tabs value={view} onValueChange={setView}>
        <TabsList className="max-w-full overflow-x-auto">
          {["today", "upcoming", "overdue", "completed", "all"].map((item) => (
            <TabsTrigger key={item} value={item}>
              {item[0].toUpperCase() + item.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks or patients"
          />
        </div>
        <Filter
          value={assigned}
          onChange={setAssigned}
          placeholder="Assigned user"
          options={clinicUsers.map((item) => ({ value: item.id, label: item.name }))}
        />
        <Filter
          value={priority}
          onChange={setPriority}
          placeholder="Priority"
          options={["low", "normal", "high", "urgent"].map((x) => ({ value: x, label: x }))}
        />
        <Filter value={type} onChange={setType} placeholder="Task type" options={TASK_TYPES} />
      </div>
      {!filtered.length ? (
        <EmptyState
          title="No tasks in this view"
          description="Adjust the filters or create the next operational task."
          action={
            canManage ? <Button onClick={() => setOpen(true)}>Create task</Button> : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const patient = clinicPatients.find(
              (p) => p.id === (task.patient_id ?? task.patient_user_id),
            );
            const lead = clinicLeads.find((l) => l.id === task.lead_id);
            const assignee = clinicUsers.find(
              (u) => u.id === (task.assigned_user_id ?? task.assigned_to),
            );
            return (
              <Card key={task.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <Checkbox
                    disabled={!canManage}
                    aria-label={`Complete ${task.title}`}
                    checked={task.task_status === "completed" || task.done}
                    onCheckedChange={() =>
                      updateTask(
                        task.id,
                        clinicId,
                        {
                          task_status:
                            task.task_status === "completed" || task.done ? "pending" : "completed",
                        },
                        user?.id,
                      )
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{task.title}</p>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>
                        {TASK_TYPES.find((x) => x.value === (task.type ?? "other"))?.label}
                      </span>
                      <span>{assignee?.name ?? "Unassigned"}</span>
                      {task.due_at && (
                        <span>{format(new Date(task.due_at), "dd MMM yyyy HH:mm")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{task.priority ?? "normal"}</Badge>
                    {patient ? (
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/pro/patients/$id" params={{ id: patient.id }}>
                          {patient.first_name} {patient.last_name}
                        </Link>
                      </Button>
                    ) : lead ? (
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/pro/leads/$id" params={{ id: lead.id }}>
                          {lead.patient_name}
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No related record</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <TaskDialog
        open={open}
        onOpenChange={setOpen}
        clinicId={clinicId}
        patients={clinicPatients}
        leads={clinicLeads}
        users={clinicUsers}
        onSave={(record) => {
          addTask(record, user?.id);
          toast.success("Task created");
          setOpen(false);
        }}
      />
    </div>
  );
}

function Filter({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder.toLowerCase()}s</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TaskDialog({
  open,
  onOpenChange,
  clinicId,
  patients,
  leads,
  users,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clinicId: string;
  patients: { id: string; first_name: string; last_name: string }[];
  leads: { id: string; patient_name: string }[];
  users: { id: string; name: string }[];
  onSave: (r: Omit<Task, "id" | "created_at" | "updated_at" | "created_by">) => void;
}) {
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("call_patient");
  const [related, setRelated] = useState("none");
  const [assigned, setAssigned] = useState("none");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<NonNullable<Task["priority"]>>("normal");
  const [description, setDescription] = useState("");
  const submit = () => {
    if (!title.trim()) return toast.error("Enter a task title");
    const isPatient = related.startsWith("patient:");
    onSave({
      clinic_id: clinicId,
      title: title.trim(),
      type: taskType,
      description,
      patient_id: isPatient ? related.slice(8) : undefined,
      patient_user_id: isPatient ? related.slice(8) : undefined,
      lead_id: related.startsWith("lead:") ? related.slice(5) : undefined,
      assigned_user_id: assigned === "none" ? undefined : assigned,
      assigned_to: assigned === "none" ? undefined : assigned,
      due_at: due ? new Date(due).toISOString() : undefined,
      priority,
      task_status: "pending",
      done: false,
      category: "task",
    });
    setTitle("");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>Assign operational work to a clinic team member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Task type">
            <Filter
              value={taskType}
              onChange={(v) => setTaskType(v as TaskType)}
              placeholder="Task type"
              options={TASK_TYPES}
            />
          </Field>
          <Field label="Related Lead or patient">
            <Select value={related} onValueChange={setRelated}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No related record</SelectItem>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={`patient:${p.id}`}>
                    {p.first_name} {p.last_name}
                  </SelectItem>
                ))}
                {leads.map((l) => (
                  <SelectItem key={l.id} value={`lead:${l.id}`}>
                    Lead · {l.patient_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Assigned user">
            <Select value={assigned} onValueChange={setAssigned}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Due date and time">
            <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Priority">
            <Filter
              value={priority}
              onChange={(value) => setPriority(value as NonNullable<Task["priority"]>)}
              placeholder="Priority"
              options={["low", "normal", "high", "urgent"].map((x) => ({ value: x, label: x }))}
            />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Create task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
