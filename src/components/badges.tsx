import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Priority, Status } from "@/lib/types";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    Low: "bg-muted text-muted-foreground",
    Medium: "bg-info/15 text-info border-info/30",
    High: "bg-warning/15 text-warning border-warning/30",
    Critical: "bg-destructive/15 text-destructive border-destructive/40",
  };
  return <Badge variant="outline" className={cn("font-medium", map[priority])}>{priority}</Badge>;
}

export function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    "Not Started": "bg-muted text-muted-foreground",
    "In Progress": "bg-info/15 text-info border-info/30",
    Completed: "bg-success/15 text-success border-success/30",
  };
  return <Badge variant="outline" className={cn("font-medium", map[status])}>{status}</Badge>;
}
