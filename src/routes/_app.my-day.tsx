import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { differenceInCalendarDays, format, isToday, parseISO } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Flame, Star, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import type { Status, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/my-day")({
  component: MyDay,
});

const COLUMNS: Status[] = ["Not Started", "In Progress", "Completed"];

function MyDay() {
  const { user } = useAuth();
  const { data, updateTaskStatus } = useStore();
  const navigate = useNavigate();
  const [dragId, setDragId] = useState<string | null>(null);

  const myTasks = useMemo(() => data.tasks.filter((t) => t.assigneeId === user?.id), [data.tasks, user]);

  const overdue = myTasks.filter((t) => t.status !== "Completed" && differenceInCalendarDays(parseISO(t.dueDate), new Date()) < 0);
  const dueToday = myTasks.filter((t) => t.status !== "Completed" && isToday(parseISO(t.dueDate)));
  const critical = myTasks.filter((t) => t.priority === "Critical" && t.status !== "Completed");
  const open = myTasks.filter((t) => t.status !== "Completed");
  const completion = myTasks.length === 0 ? 0 : Math.round((myTasks.filter((t) => t.status === "Completed").length / myTasks.length) * 100);

  const favorites = data.favorites.filter((f) => f.userId === user?.id);
  const notifications = data.notifications.filter((n) => n.userId === user?.id).slice(0, 5);

  const kpis = [
    { label: "Open Tasks", value: open.length, icon: Clock, accent: "text-info" },
    { label: "Due Today", value: dueToday.length, icon: Clock, accent: "text-warning" },
    { label: "Critical", value: critical.length, icon: Flame, accent: "text-destructive" },
    { label: "Overdue", value: overdue.length, icon: AlertTriangle, accent: "text-destructive" },
    { label: "Completion", value: `${completion}%`, icon: CheckCircle2, accent: "text-success" },
    { label: "Coverage", value: 0, icon: Users, accent: "text-muted-foreground" },
  ];

  function onDrop(status: Status) {
    if (dragId) {
      updateTaskStatus(dragId, status);
      setDragId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Day</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")} — your personal command center</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
                  <Icon className={cn("h-4 w-4", k.accent)} />
                </div>
                <div className="mt-2 text-2xl font-semibold">{k.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = myTasks.filter((t) => t.status === col);
            return (
              <div
                key={col}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(col)}
                className="flex min-h-[400px] flex-col rounded-lg border border-border bg-card/40 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium">{col}</div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
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
                    >
                      <TaskCard task={t} onOpen={() => navigate({ to: "/work/$taskId", params: { taskId: t.id } })} entityCode={data.entities.find((e) => e.id === t.entityId)?.code} />
                    </div>
                  ))}
                  {items.length === 0 && <div className="rounded-md border border-dashed border-border py-8 text-center text-xs text-muted-foreground">Drop tasks here</div>}
                </div>
              </div>
            );
          })}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Star className="h-4 w-4 text-warning" /> Favorites</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {favorites.length === 0 && <div className="text-xs text-muted-foreground">Nothing favorited yet</div>}
              {favorites.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent">
                  <span className="truncate">{f.label}</span>
                  <span className="ml-2 text-[10px] uppercase text-muted-foreground">{f.refType}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent notifications</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {notifications.length === 0 && <div className="text-xs text-muted-foreground">All caught up</div>}
              {notifications.map((n) => (
                <div key={n.id} className="rounded border border-border/50 p-2">
                  <div className="text-xs font-medium">{n.title}</div>
                  <div className="text-[11px] text-muted-foreground">{n.body}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Quick links</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <button onClick={() => navigate({ to: "/work" })} className="block w-full rounded px-2 py-1.5 text-left hover:bg-accent">→ All tasks</button>
              <button onClick={() => navigate({ to: "/mec" })} className="block w-full rounded px-2 py-1.5 text-left hover:bg-accent">→ MEC command center</button>
              <button onClick={() => navigate({ to: "/knowledge" })} className="block w-full rounded px-2 py-1.5 text-left hover:bg-accent">→ Knowledge Base</button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function TaskCard({ task, entityCode, onOpen }: { task: Task; entityCode?: string; onOpen: () => void }) {
  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 group">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">{task.number}</span>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 rounded border border-primary bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary shadow-sm transition hover:bg-primary/20 hover:text-foreground"
          title="Open task"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </button>
      </div>
      <div onClick={onOpen} className="text-sm font-medium leading-snug cursor-pointer hover:text-primary transition-colors">{task.name}</div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{entityCode}</span>
        <span>Due {format(parseISO(task.dueDate), "MMM d")}</span>
      </div>
      <div className="mt-2">
        <PriorityBadge priority={task.priority} />
      </div>
    </div>
  );
}
