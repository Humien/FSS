import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Download, LayoutGrid, List, Plus, Search, Edit3, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { toast } from "sonner";
import type { Frequency, Priority, Status, Task, TaskPhase, Weekday } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/work")({
  component: WorkManagement,
});

const COLS: Status[] = ["Not Started", "In Progress", "Completed"];
const NONE_USER = "none";
const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];
const FREQUENCIES: Frequency[] = [
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Half Yearly",
  "Yearly",
  "One Time",
];
const WEEKDAYS: Weekday[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const PHASES: TaskPhase[] = [
  "Pre-Close",
  "Day 1",
  "Day 2",
  "Day 3",
  "Day 4",
  "Day 5",
  "Post-Close",
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function WorkManagement() {
  const { data, addTask, updateTaskStatus, updateTask, deleteTask } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "kanban">("grid");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [entity, setEntity] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [dragId, setDragId] = useState<string | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState(() => ({
    name: "",
    description: "",
    categoryId: data.categories[0]?.id ?? "",
    subCategoryId:
      data.subCategories.find((s) => s.categoryId === data.categories[0]?.id)?.id ?? "",
    entityId: data.entities[0]?.id ?? "",
    ownerId: user?.id ?? data.users[0]?.id ?? "",
    backup1Id: NONE_USER,
    backup2Id: NONE_USER,
    priority: "Medium" as Priority,
    frequency: "One Time" as Frequency,
    weeklyDay: null as Weekday | null,
    phase: null as TaskPhase | null,
    dueDate: todayInputValue(),
  }));
  const [editTask, setEditTask] = useState(() => ({
    id: "",
    name: "",
    description: "",
    categoryId: data.categories[0]?.id ?? "",
    subCategoryId:
      data.subCategories.find((s) => s.categoryId === data.categories[0]?.id)?.id ?? "",
    entityId: data.entities[0]?.id ?? "",
    ownerId: user?.id ?? data.users[0]?.id ?? "",
    backup1Id: NONE_USER,
    backup2Id: NONE_USER,
    priority: "Medium" as Priority,
    status: "Not Started" as Status,
    frequency: "One Time" as Frequency,
    weeklyDay: null as Weekday | null,
    phase: null as TaskPhase | null,
    dueDate: todayInputValue(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Task));

  const availableEditSubCategories = useMemo(
    () => data.subCategories.filter((s) => s.categoryId === editTask.categoryId),
    [data.subCategories, editTask.categoryId],
  );

  const availableSubCategories = useMemo(
    () => data.subCategories.filter((s) => s.categoryId === newTask.categoryId),
    [data.subCategories, newTask.categoryId],
  );

  const isMecCategory = (categoryId: string) =>
    data.categories.some((c) => c.id === categoryId && c.code === "MEC");

  const filtered = useMemo(() => {
    return data.tasks.filter((t) => {
      if (category !== "all" && t.categoryId !== category) return false;
      if (entity !== "all" && t.entityId !== entity) return false;
      if (status !== "all" && t.status !== status) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (
        q &&
        !t.name.toLowerCase().includes(q.toLowerCase()) &&
        !t.number.toLowerCase().includes(q.toLowerCase())
      )
        return false;
      return true;
    });
  }, [data.tasks, category, entity, status, priority, q]);

  function exportCsv() {
    const rows = [
      ["Number", "Name", "Entity", "Owner", "Priority", "Status", "Due Date"],
      ...filtered.map((t) => [
        t.number,
        t.name,
        data.entities.find((e) => e.id === t.entityId)?.code ?? "",
        data.users.find((u) => u.id === t.ownerId)?.name ?? "",
        t.priority,
        t.status,
        t.dueDate.slice(0, 10),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fss-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function updateNewTask<K extends keyof typeof newTask>(key: K, value: (typeof newTask)[K]) {
    setNewTask((current) => {
      const next = { ...current, [key]: value };
      if (key === "categoryId") {
        next.subCategoryId = data.subCategories.find((s) => s.categoryId === value)?.id ?? "";
        if (!isMecCategory(value as string)) {
          next.phase = null;
        }
      }
      if (key === "frequency") {
        if (value !== "Weekly") {
          next.weeklyDay = null;
        } else if (!next.weeklyDay && next.dueDate) {
          const weekdayNames: Weekday[] = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          next.weeklyDay = weekdayNames[new Date(next.dueDate).getDay()];
        }
      }
      return next;
    });
  }

  function updateEditTask<K extends keyof typeof editTask>(key: K, value: (typeof editTask)[K]) {
    setEditTask((current) => {
      const next = { ...current, [key]: value };
      if (key === "categoryId") {
        next.subCategoryId = data.subCategories.find((s) => s.categoryId === value)?.id ?? "";
        if (!isMecCategory(value as string)) {
          next.phase = null;
        }
      }
      if (key === "frequency") {
        if (value !== "Weekly") {
          next.weeklyDay = null;
        } else if (!next.weeklyDay && next.dueDate) {
          const weekdayNames: Weekday[] = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          next.weeklyDay = weekdayNames[new Date(next.dueDate).getDay()];
        }
      }
      return next;
    });
  }

  function resetNewTaskForm() {
    setNewTask({
      name: "",
      description: "",
      categoryId: data.categories[0]?.id ?? "",
      subCategoryId:
        data.subCategories.find((s) => s.categoryId === data.categories[0]?.id)?.id ?? "",
      entityId: data.entities[0]?.id ?? "",
      ownerId: user?.id ?? data.users[0]?.id ?? "",
      backup1Id: NONE_USER,
      backup2Id: NONE_USER,
      priority: "Medium" as Priority,
      frequency: "One Time" as Frequency,
      weeklyDay: null as Weekday | null,
      phase: null as TaskPhase | null,
      dueDate: todayInputValue(),
    });
  }

  function startEditTask(task: Task) {
    setEditingTask(task);
    setEditTask(task);
    setEditTaskOpen(true);
  }

  const search = Route.useSearch();
  useEffect(() => {
    const raw = (search as any).editTaskId;
    if (!raw) return;
    const editTaskId = Array.isArray(raw) ? raw[0] : raw;
    const found = data.tasks.find((t) => t.id === editTaskId);
    if (found) {
      startEditTask(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, data.tasks]);

  function saveEditedTask() {
    if (!editingTask) return;
    const name = editTask.name.trim();
    if (!name) {
      toast.error("Task name is required");
      return;
    }
    if (isMecCategory(editTask.categoryId) && !editTask.phase) {
      toast.error("Please select an MEC phase for month-end closing tasks");
      return;
    }
    if (!isMecCategory(editTask.categoryId) && editTask.frequency === "Weekly" && !editTask.weeklyDay) {
      toast.error("Please select a day of the week for weekly tasks");
      return;
    }

    updateTask(editingTask.id, {
      name,
      description: editTask.description?.trim() ?? "",
      categoryId: editTask.categoryId,
      subCategoryId: editTask.subCategoryId,
      entityId: editTask.entityId,
      ownerId: editTask.ownerId,
      backup1Id: editTask.backup1Id === NONE_USER ? null : editTask.backup1Id,
      backup2Id: editTask.backup2Id === NONE_USER ? null : editTask.backup2Id,
      priority: editTask.priority,
      status: editTask.status,
      frequency: editTask.frequency,
      weeklyDay: isMecCategory(editTask.categoryId) ? null : editTask.frequency === "Weekly" ? editTask.weeklyDay : null,
      phase: isMecCategory(editTask.categoryId) ? editTask.phase ?? null : null,
      dueDate: editTask.dueDate,
    });
    toast.success("Task updated");
    setEditTaskOpen(false);
    setEditingTask(null);
  }

  function deleteTaskById(taskId: string) {
    deleteTask(taskId);
    toast.success("Task deleted");
  }

  function createTask() {
    const name = newTask.name.trim();
    if (!name) {
      toast.error("Task name is required");
      return;
    }
    if (
      !newTask.categoryId ||
      !newTask.subCategoryId ||
      !newTask.entityId ||
      !newTask.ownerId ||
      !newTask.dueDate ||
      (isMecCategory(newTask.categoryId) && !newTask.phase) ||
      (!isMecCategory(newTask.categoryId) && newTask.frequency === "Weekly" && !newTask.weeklyDay)
    ) {
      toast.error("Please complete the required fields");
      return;
    }
    const task = addTask({
      ...newTask,
      name,
      description: newTask.description.trim(),
      backup1Id: newTask.backup1Id === NONE_USER ? null : newTask.backup1Id,
      backup2Id: newTask.backup2Id === NONE_USER ? null : newTask.backup2Id,
      phase: isMecCategory(newTask.categoryId) ? newTask.phase ?? null : null,
      weeklyDay: isMecCategory(newTask.categoryId) ? null : newTask.frequency === "Weekly" ? newTask.weeklyDay : null,
    });
    setNewTask((current) => ({
      ...current,
      name: "",
      description: "",
      weeklyDay: null,
      phase: null,
      dueDate: todayInputValue(),
    }));
    setNewTaskOpen(false);
    toast.success(`Created ${task.number}`);
    navigate({ to: "/work/$taskId", params: { taskId: task.id } });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work Management</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} task{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setNewTaskOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Task
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("grid")}
            >
              <List className="mr-1.5 h-4 w-4" /> Grid
            </Button>
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="mr-1.5 h-4 w-4" /> Kanban
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search task name or number"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <FilterSelect
          value={category}
          onChange={setCategory}
          placeholder="Category"
          options={data.categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <FilterSelect
          value={entity}
          onChange={setEntity}
          placeholder="Entity"
          options={data.entities.map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` }))}
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="Status"
          options={["Not Started", "In Progress", "Completed"].map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          value={priority}
          onChange={setPriority}
          placeholder="Priority"
          options={["Low", "Medium", "High", "Critical"].map((p) => ({ value: p, label: p }))}
        />
      </div>

      {view === "grid" ? (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Number</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const entityName = data.entities.find((e) => e.id === t.entityId);
                const assignee = data.users.find((u) => u.id === t.assigneeId) ??
                  data.users.find((u) => u.id === t.ownerId);
                return (
                  <TableRow key={t.id} className="group">
                    <TableCell
                      className="font-mono text-xs cursor-pointer"
                      onClick={() => navigate({ to: "/work/$taskId", params: { taskId: t.id } })}
                    >
                      {t.number}
                    </TableCell>
                    <TableCell
                      className="max-w-[320px] truncate cursor-pointer"
                      onClick={() => navigate({ to: "/work/$taskId", params: { taskId: t.id } })}
                    >
                      {t.name}
                    </TableCell>
                    <TableCell
                      className="cursor-pointer"
                      onClick={() => navigate({ to: "/work/$taskId", params: { taskId: t.id } })}
                    >
                      {entityName?.code}
                    </TableCell>
                    <TableCell
                      className="cursor-pointer"
                      onClick={() => navigate({ to: "/work/$taskId", params: { taskId: t.id } })}
                    >
                      {assignee?.name}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={t.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(parseISO(t.dueDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditTask(t);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingTask(t);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No tasks match those filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {COLS.map((col) => {
            const items = filtered.filter((t) => t.status === col);
            return (
              <div
                key={col}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) {
                    updateTaskStatus(dragId, col);
                    setDragId(null);
                  }
                }}
                className="flex min-h-[400px] flex-col rounded-lg border border-border bg-card/40 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium">{col}</div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragId) {
                          updateTaskStatus(dragId, col);
                          setDragId(null);
                        }
                      }}
                      className={cn(
                        "rounded-md border border-border bg-card p-3 hover:border-primary/40",
                      )}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => navigate({ to: "/work/$taskId", params: { taskId: t.id } })}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {t.number}
                          </span>
                          <PriorityBadge priority={t.priority} />
                        </div>
                        <div className="mt-1 text-sm font-medium">{t.name}</div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{data.entities.find((e) => e.id === t.entityId)?.code}</span>
                          <span>{format(parseISO(t.dueDate), "MMM d")}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-w-[36px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditTask(t);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-w-[36px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTask(t);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>Create a task and assign it to an owner.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task-name">Task name</Label>
              <Input
                id="task-name"
                value={newTask.name}
                onChange={(e) => updateNewTask("name", e.target.value)}
                placeholder="Enter task name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newTask.categoryId}
                onValueChange={(v) => updateNewTask("categoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Select
                value={newTask.subCategoryId}
                onValueChange={(v) => updateNewTask("subCategoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSubCategories.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entity</Label>
              <Select value={newTask.entityId} onValueChange={(v) => updateNewTask("entityId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.code} - {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={newTask.ownerId} onValueChange={(v) => updateNewTask("ownerId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.users
                    .filter((u) => u.role !== "ReadOnly")
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Backup 1</Label>
              <Select
                value={newTask.backup1Id}
                onValueChange={(v) => updateNewTask("backup1Id", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_USER}>None</SelectItem>
                  {data.users
                    .filter((u) => u.role !== "ReadOnly")
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Backup 2</Label>
              <Select
                value={newTask.backup2Id}
                onValueChange={(v) => updateNewTask("backup2Id", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_USER}>None</SelectItem>
                  {data.users
                    .filter((u) => u.role !== "ReadOnly")
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={newTask.priority}
                onValueChange={(v) => updateNewTask("priority", v as Priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isMecCategory(newTask.categoryId) ? (
              <div className="space-y-2">
                <Label>MEC Phase</Label>
                <Select
                  value={newTask.phase ?? "none"}
                  onValueChange={(v) => updateNewTask("phase", v === "none" ? null : (v as TaskPhase))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select MEC phase</SelectItem>
                    {PHASES.map((ph) => (
                      <SelectItem key={ph} value={ph}>
                        {ph}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={newTask.frequency}
                    onValueChange={(v) => updateNewTask("frequency", v as Frequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newTask.frequency === "Weekly" ? (
                  <div className="space-y-2">
                    <Label>Weekly day</Label>
                    <Select
                      value={newTask.weeklyDay ?? "none"}
                      onValueChange={(v) => updateNewTask("weeklyDay", v === "none" ? null : (v as Weekday))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a day</SelectItem>
                        {WEEKDAYS.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => updateNewTask("dueDate", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => updateNewTask("description", e.target.value)}
                rows={3}
                placeholder="Optional details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTaskOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createTask}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTaskOpen}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
          setEditTaskOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details or delete this task.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-task-name">Task name</Label>
              <Input
                id="edit-task-name"
                value={editTask.name}
                onChange={(e) => updateEditTask("name", e.target.value)}
                placeholder="Enter task name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={editTask.categoryId}
                onValueChange={(v) => updateEditTask("categoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Select
                value={editTask.subCategoryId}
                onValueChange={(v) => updateEditTask("subCategoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableEditSubCategories.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entity</Label>
              <Select
                value={editTask.entityId}
                onValueChange={(v) => updateEditTask("entityId", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.code} - {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={editTask.ownerId} onValueChange={(v) => updateEditTask("ownerId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.users
                    .filter((u) => u.role !== "ReadOnly")
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Backup 1</Label>
              <Select
                value={editTask.backup1Id ?? NONE_USER}
                onValueChange={(v) => updateEditTask("backup1Id", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_USER}>None</SelectItem>
                  {data.users
                    .filter((u) => u.role !== "ReadOnly")
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Backup 2</Label>
              <Select
                value={editTask.backup2Id ?? NONE_USER}
                onValueChange={(v) => updateEditTask("backup2Id", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_USER}>None</SelectItem>
                  {data.users
                    .filter((u) => u.role !== "ReadOnly")
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={editTask.priority}
                onValueChange={(v) => updateEditTask("priority", v as Priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editTask.status}
                onValueChange={(v) => updateEditTask("status", v as Status)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isMecCategory(editTask.categoryId) ? (
              <div className="space-y-2">
                <Label>MEC Phase</Label>
                <Select
                  value={editTask.phase ?? "none"}
                  onValueChange={(v) => updateEditTask("phase", v === "none" ? null : (v as TaskPhase))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select MEC phase</SelectItem>
                    {PHASES.map((ph) => (
                      <SelectItem key={ph} value={ph}>
                        {ph}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={editTask.frequency}
                    onValueChange={(v) => updateEditTask("frequency", v as Frequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editTask.frequency === "Weekly" ? (
                  <div className="space-y-2">
                    <Label>Weekly day</Label>
                    <Select
                      value={editTask.weeklyDay ?? "none"}
                      onValueChange={(v) => updateEditTask("weeklyDay", v === "none" ? null : (v as Weekday))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a day</SelectItem>
                        {WEEKDAYS.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-task-due-date">Due date</Label>
              <Input
                id="edit-task-due-date"
                type="date"
                value={editTask.dueDate.slice(0, 10)}
                onChange={(e) => updateEditTask("dueDate", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                value={editTask.description}
                onChange={(e) => updateEditTask("description", e.target.value)}
                rows={3}
                placeholder="Optional details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTaskOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (editingTask) {
                  setDeletingTask(editingTask);
                  setDeleteConfirmOpen(true);
                }
              }}
            >
              Delete
            </Button>
            <Button onClick={saveEditedTask}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task and its related comments, attachments, and
              subtasks will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingTask) {
                  deleteTaskById(deletingTask.id);
                  setDeleteConfirmOpen(false);
                }
              }}
            >
              Delete task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Outlet />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
