import { Bell, LogOut, Plus, Search, Sparkles, User as UserIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useTheme, THEMES } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, signOut } = useAuth();
  const { data, markNotificationRead } = useStore();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const notifications = data.notifications.filter((n) => n.userId === user?.id);
  const unread = notifications.filter((n) => !n.read).length;

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const term = q.toLowerCase();
    const tasks = data.tasks
      .filter((t) => t.name.toLowerCase().includes(term) || t.number.toLowerCase().includes(term))
      .slice(0, 5)
      .map((t) => ({ kind: "Task", label: `${t.number} — ${t.name}`, to: `/work/${t.id}` }));
    const articles = data.articles
      .filter((a) => a.title.toLowerCase().includes(term) || a.code.toLowerCase().includes(term))
      .slice(0, 3)
      .map((a) => ({ kind: "Article", label: `${a.code} ${a.title}`, to: `/knowledge?article=${a.id}` }));
    const users = data.users
      .filter((u) => u.name.toLowerCase().includes(term))
      .slice(0, 3)
      .map((u) => ({ kind: "User", label: u.name, to: `/availability?user=${u.id}` }));
    return [...tasks, ...articles, ...users];
  }, [q, data]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/40 px-4 backdrop-blur">
      <div className="relative w-full max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tasks, knowledge, users…"
          className="h-9 pl-9 bg-background/60"
        />
        {q && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  navigate({ to: r.to });
                  setQ("");
                }}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="truncate">{r.label}</span>
                <span className="ml-3 text-[10px] uppercase tracking-wider text-muted-foreground">{r.kind}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => navigate({ to: "/work" })}>
          <Plus className="h-4 w-4" /> New Task
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Theme">
              <Sparkles className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as never)}>
              {THEMES.map((t) => (
                <DropdownMenuRadioItem key={t.id} value={t.id}>
                  {t.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b border-border px-3 py-2 text-sm font-medium">Notifications</div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={cn(
                    "block w-full border-b border-border/50 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent",
                    !n.read && "bg-accent/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{n.body}</div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {user?.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
              <div className="hidden text-left text-xs leading-tight sm:block">
                <div className="font-medium">{user?.name}</div>
                <div className="text-muted-foreground">{user?.role}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
              <UserIcon className="mr-2 h-4 w-4" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { signOut(); navigate({ to: "/login" }); }}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Badge variant="outline" className="hidden xl:inline-flex">{user?.role}</Badge>
      </div>
    </header>
  );
}
