import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AvailabilityType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/availability")({
  component: AvailabilityPage,
});

const TYPES: { value: AvailabilityType; color: string }[] = [
  { value: "Available", color: "bg-success/70 text-success-foreground" },
  { value: "WFH", color: "bg-info/70 text-info-foreground" },
  { value: "Leave", color: "bg-destructive/70 text-destructive-foreground" },
  { value: "Training", color: "bg-warning/70 text-warning-foreground" },
  { value: "Business Travel", color: "bg-accent text-accent-foreground" },
];

function AvailabilityPage() {
  const { data, setAvailability } = useStore();
  const { user } = useAuth();
  const [tab, setTab] = useState("my");
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  function getEntry(uid: string, date: string) {
    return data.availability.find((a) => a.userId === uid && a.date === date);
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="text-sm text-muted-foreground">Track team capacity and coverage</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="my">My Availability</TabsTrigger>
          <TabsTrigger value="team">Team Availability</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Planning</TabsTrigger>
          <TabsTrigger value="summary">Leave Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          <Card><CardContent className="p-5">
            <div className="grid grid-cols-7 gap-2">
              {days.map((d) => {
                const date = format(d, "yyyy-MM-dd");
                const entry = user ? getEntry(user.id, date) : undefined;
                return (
                  <div key={date} className="rounded-md border border-border p-3 text-center">
                    <div className="text-xs text-muted-foreground">{format(d, "EEE")}</div>
                    <div className="text-lg font-semibold">{format(d, "d")}</div>
                    <select
                      value={entry?.type ?? "Available"}
                      onChange={(e) => user && setAvailability(user.id, date, e.target.value as AvailabilityType)}
                      className="mt-2 w-full rounded border border-border bg-background px-1 py-1 text-xs"
                    >
                      {TYPES.map((t) => <option key={t.value} value={t.value}>{t.value}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Team member</th>
                    {days.map((d) => <th key={d.toISOString()} className="px-2 py-2 text-center font-medium">{format(d, "EEE d")}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-t border-border/50">
                      <td className="px-3 py-2"><div className="font-medium">{u.name}</div><div className="text-xs text-muted-foreground">{u.role}</div></td>
                      {days.map((d) => {
                        const date = format(d, "yyyy-MM-dd");
                        const entry = getEntry(u.id, date);
                        const t = TYPES.find((x) => x.value === (entry?.type ?? "Available"));
                        return (
                          <td key={date} className="px-2 py-2 text-center">
                            <span className={cn("inline-block rounded px-2 py-0.5 text-[10px] font-medium", t?.color)}>{(entry?.type ?? "—").slice(0, 4)}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <Card><CardContent className="p-5 text-sm text-muted-foreground">
            Coverage planning is generated from team availability and task assignments. Use the team tab to see who's available, then reassign tasks via the task workspace.
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <div className="space-y-4">
            <LeaveSummary days={days} getEntry={getEntry} users={data.users} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface LeaveSummaryProps {
  days: Date[];
  getEntry: (uid: string, date: string) => any;
  users: any[];
}

function LeaveSummary({ days, getEntry, users }: LeaveSummaryProps) {
  const totalDays = days.length;
  
  const leaveStats = useMemo(() => {
    return users.map((user) => {
      const leaveCount = days.reduce((count, day) => {
        const date = format(day, "yyyy-MM-dd");
        const entry = getEntry(user.id, date);
        return count + (entry?.type === "Leave" ? 1 : 0);
      }, 0);

      const wfhCount = days.reduce((count, day) => {
        const date = format(day, "yyyy-MM-dd");
        const entry = getEntry(user.id, date);
        return count + (entry?.type === "WFH" ? 1 : 0);
      }, 0);

      const trainingCount = days.reduce((count, day) => {
        const date = format(day, "yyyy-MM-dd");
        const entry = getEntry(user.id, date);
        return count + (entry?.type === "Training" ? 1 : 0);
      }, 0);

      const travelCount = days.reduce((count, day) => {
        const date = format(day, "yyyy-MM-dd");
        const entry = getEntry(user.id, date);
        return count + (entry?.type === "Business Travel" ? 1 : 0);
      }, 0);

      const availableCount = days.reduce((count, day) => {
        const date = format(day, "yyyy-MM-dd");
        const entry = getEntry(user.id, date);
        return count + ((entry?.type === "Available" || !entry) ? 1 : 0);
      }, 0);

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        leaveCount,
        wfhCount,
        trainingCount,
        travelCount,
        availableCount,
        leavePercentage: ((leaveCount / totalDays) * 100).toFixed(1),
        availablePercentage: ((availableCount / totalDays) * 100).toFixed(1),
      };
    });
  }, [days, getEntry, users, totalDays]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leave Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveStats.reduce((sum, s) => sum + s.leaveCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Leave per Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(leaveStats.reduce((sum, s) => sum + s.leaveCount, 0) / Math.max(users.length, 1)).toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveStats.filter((s) => s.leaveCount === 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Details by Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Member</th>
                  <th className="px-3 py-2 text-center font-medium">Leave Days</th>
                  <th className="px-3 py-2 text-center font-medium">Available Days</th>
                  <th className="px-3 py-2 text-center font-medium">WFH Days</th>
                  <th className="px-3 py-2 text-center font-medium">Leave %</th>
                </tr>
              </thead>
              <tbody>
                {leaveStats.map((stat) => (
                  <tr key={stat.id} className="border-t border-border/50 hover:bg-muted/40">
                    <td className="px-3 py-3">
                      <div className="font-medium">{stat.name}</div>
                      <div className="text-xs text-muted-foreground">{stat.role}</div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        "inline-block rounded px-2 py-1 text-sm font-semibold",
                        stat.leaveCount > 0 
                          ? "bg-destructive/20 text-destructive"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {stat.leaveCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        "inline-block rounded px-2 py-1 text-sm font-semibold",
                        "bg-success/20 text-success"
                      )}>
                        {stat.availableCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        "inline-block rounded px-2 py-1 text-sm font-semibold",
                        stat.wfhCount > 0
                          ? "bg-info/20 text-info"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {stat.wfhCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-sm font-medium">{stat.leavePercentage}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
