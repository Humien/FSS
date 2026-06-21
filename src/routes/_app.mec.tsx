import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { differenceInCalendarDays, parseISO, startOfMonth, addMonths, getDate } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, Flame } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TaskPhase } from "@/lib/types";

export const Route = createFileRoute("/_app/mec")({
  component: MEC,
});

const TABS: { id: string; label: string; phase: TaskPhase }[] = [
  { id: "pre", label: "Pre-Close", phase: "Pre-Close" },
  { id: "d1", label: "Day 1", phase: "Day 1" },
  { id: "d2", label: "Day 2", phase: "Day 2" },
  { id: "d3", label: "Day 3", phase: "Day 3" },
  { id: "d4", label: "Day 4", phase: "Day 4" },
  { id: "d5", label: "Day 5", phase: "Day 5" },
  { id: "post", label: "Post-Close", phase: "Post-Close" },
];

const MONTHS = [
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

function MEC() {
  const { data } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState("pre");
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));

  const yearOptions = useMemo(() => {
    const selected = Number(selectedYear);
    return Array.from(new Set([currentYear - 1, currentYear, currentYear + 1, selected])).sort(
      (a, b) => b - a,
    );
  }, [currentYear, selectedYear]);

  const mecTasks = useMemo(
    () =>
      data.tasks.filter((t) => {
        if (t.categoryId !== "c-2") return false;
        if (!t.phase) return false;
        const due = parseISO(t.dueDate);
        // The selected month is the pre-close month. For Pre-Close tasks, they are for the selected month.
        // For Day 1-5 and Post-Close, they are for the next month (the cycle month).
        const tabPhase = TABS.find((ta) => ta.id === tab)?.phase;
        if (tabPhase === "Pre-Close") {
          return (
            t.phase === "Pre-Close" &&
            due.getMonth() === Number(selectedMonth) &&
            due.getFullYear() === Number(selectedYear)
          );
        } else {
          // For Day 1-5 and Post-Close, check if the task is for the next month
          const cycleMonth = addMonths(new Date(Number(selectedYear), Number(selectedMonth), 1), 1);
          return (
            t.phase === tabPhase &&
            due.getMonth() === cycleMonth.getMonth() &&
            due.getFullYear() === cycleMonth.getFullYear()
          );
        }
      }),
    [data.tasks, selectedMonth, selectedYear, tab],
  );
  const tabPhase = TABS.find((t) => t.id === tab)?.phase;
  const tabTasks = mecTasks.filter((t) => t.phase === tabPhase);

  const kpis = {
    open: mecTasks.filter((t) => t.status !== "Completed").length,
    done: mecTasks.filter((t) => t.status === "Completed").length,
    critical: mecTasks.filter((t) => t.priority === "Critical" && t.status !== "Completed").length,
    overdue: mecTasks.filter(
      (t) =>
        t.status !== "Completed" && differenceInCalendarDays(parseISO(t.dueDate), new Date()) < 0,
    ).length,
    completion: mecTasks.length
      ? Math.round(
          (mecTasks.filter((t) => t.status === "Completed").length / mecTasks.length) * 100,
        )
      : 0,
  };

  const entityRollup = data.entities.map((e) => {
    const tasks = mecTasks.filter((t) => t.entityId === e.id);
    const done = tasks.filter((t) => t.status === "Completed").length;
    return {
      entity: e,
      total: tasks.length,
      done,
      pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    };
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Month-End Close</h1>
        <p className="text-sm text-muted-foreground">
          Dedicated command center for the close cycle
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Open" value={kpis.open} icon={Clock} accent="text-info" />
        <Kpi label="Completed" value={kpis.done} icon={CheckCircle2} accent="text-success" />
        <Kpi label="Critical" value={kpis.critical} icon={Flame} accent="text-destructive" />
        <Kpi label="Overdue" value={kpis.overdue} icon={AlertTriangle} accent="text-destructive" />
        <Kpi
          label="Completion"
          value={`${kpis.completion}%`}
          icon={CheckCircle2}
          accent="text-success"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tabTasks.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: `/work?editTaskId=${t.id}` })}
                  >
                    <TableCell className="font-mono text-xs">{t.number}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{t.name}</TableCell>
                    <TableCell>{data.entities.find((e) => e.id === t.entityId)?.code}</TableCell>
                    <TableCell>
                      <PriorityBadge priority={t.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {tabTasks.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No tasks for this day.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 text-sm font-medium">
                Entity drilldown · {MONTHS[Number(selectedMonth)]?.label} {selectedYear}
              </div>
              <div className="space-y-2">
                {entityRollup.map((r) => (
                  <div key={r.entity.id}>
                    <div className="flex justify-between text-xs">
                      <span>
                        {r.entity.code} — {r.entity.name}
                      </span>
                      <span className="text-muted-foreground">
                        {r.done}/{r.total}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full", r.pct === 100 ? "bg-success" : "bg-primary")}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 text-sm font-medium">Risk center</div>
              <ul className="space-y-2 text-xs">
                <li className="flex justify-between">
                  <span>Critical tasks open</span>
                  <span className="font-mono">{kpis.critical}</span>
                </li>
                <li className="flex justify-between">
                  <span>Overdue tasks</span>
                  <span className="font-mono">{kpis.overdue}</span>
                </li>
                <li className="flex justify-between">
                  <span>Tasks not started</span>
                  <span className="font-mono">
                    {mecTasks.filter((t) => t.status === "Not Started").length}
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className={cn("h-4 w-4", accent)} />
        </div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
