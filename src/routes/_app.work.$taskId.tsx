import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ChevronRight, Paperclip, Plus, Star, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { toast } from "sonner";
import type { Priority, Status, TaskPhase } from "@/lib/types";

export const Route = createFileRoute("/_app/work/$taskId")({
  component: TaskWorkspace,
});

const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED = [".pdf", ".docx", ".xlsx", ".pptx", ".png", ".jpg", ".jpeg"];
const NONE_USER = "none";

function TaskWorkspace() {
  const { taskId } = Route.useParams();
  const {
    data,
    updateTask,
    updateTaskStatus,
    addComment,
    toggleSubTask,
    addSubTask,
    addAttachment,
    toggleFavorite,
  } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const task = data.tasks.find((t) => t.id === taskId);
  const [newComment, setNewComment] = useState("");
  const [newSub, setNewSub] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const subTasks = useMemo(
    () => data.subTasks.filter((s) => s.taskId === taskId),
    [data.subTasks, taskId],
  );
  const comments = data.comments
    .filter((c) => c.taskId === taskId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const attachments = data.attachments.filter((a) => a.taskId === taskId);
  const auditEntries = data.audit
    .filter((a) => a.taskId === taskId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const articles = data.articles;
  const fav = data.favorites.find(
    (f) => f.refType === "task" && f.refId === taskId && f.userId === user?.id,
  );

  if (!task) {
    return (
      <div className="p-6">
        <Link to="/work" className="text-sm text-primary hover:underline">
          ← Back to Work Management
        </Link>
        <div className="mt-8 text-center text-muted-foreground">Task not found.</div>
      </div>
    );
  }

  const entity = data.entities.find((e) => e.id === task.entityId);
  const owner = data.users.find((u) => u.id === task.ownerId);
  const assignee = data.users.find((u) => u.id === task.assigneeId) ?? owner;
  const backup1 = data.users.find((u) => u.id === task.backup1Id);
  const backup2 = data.users.find((u) => u.id === task.backup2Id);
  const assignableUsers = data.users.filter((u) => u.role !== "ReadOnly");
  const category = data.categories.find((c) => c.id === task.categoryId);
  const sub = data.subCategories.find((s) => s.id === task.subCategoryId);
  const done = subTasks.filter((s) => s.done).length;
  const pct = subTasks.length ? Math.round((done / subTasks.length) * 100) : 0;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    if (f.size > MAX_SIZE) return toast.error("File exceeds 25MB limit");
    const ok = ALLOWED.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) return toast.error(`Unsupported file type. Allowed: ${ALLOWED.join(", ")}`);
    addAttachment(taskId, f, user.id);
    toast.success("Attachment added");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/work" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Work
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-mono text-xs">{task.number}</span>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{category?.name}</span> · <span>{sub?.name}</span> ·{" "}
                <span>
                  {entity?.code} — {entity?.name}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{task.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
                <span className="text-xs text-muted-foreground">
                  Due {format(parseISO(task.dueDate), "MMM d, yyyy")}
                </span>
                <span className="text-xs text-muted-foreground">· Assigned {assignee?.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => user && toggleFavorite(user.id, "task", task.id, task.number)}
              >
                <Star className={fav ? "h-4 w-4 fill-warning text-warning" : "h-4 w-4"} />
              </Button>
              <Select
                value={task.status}
                onValueChange={(v) => updateTaskStatus(task.id, v as Status)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Not Started", "In Progress", "Completed"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="subtasks">Sub Tasks ({subTasks.length})</TabsTrigger>
          <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
          <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Owner">
                <Select
                  value={task.ownerId}
                  onValueChange={(v) => updateTask(task.id, { ownerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Backup 1">
                <Select
                  value={task.backup1Id ?? NONE_USER}
                  onValueChange={(v) =>
                    updateTask(task.id, { backup1Id: v === NONE_USER ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_USER}>None</SelectItem>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Backup 2">
                <Select
                  value={task.backup2Id ?? NONE_USER}
                  onValueChange={(v) =>
                    updateTask(task.id, { backup2Id: v === NONE_USER ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_USER}>None</SelectItem>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Priority">
                <Select
                  value={task.priority}
                  onValueChange={(v) => updateTask(task.id, { priority: v as Priority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High", "Critical"].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {category?.code === "MEC" ? (
                <Field label="Frequency">
                  <Select
                    value={task.phase ?? "none"}
                    onValueChange={(v) =>
                      updateTask(task.id, { phase: v === "none" ? null : (v as TaskPhase) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select phase</SelectItem>
                      {["Pre-Close", "Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Post-Close"].map((ph) => (
                        <SelectItem key={ph} value={ph}>
                          {ph}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <>
                  <Field label="Frequency">
                    <div className="text-sm">{task.frequency}</div>
                  </Field>
                  {task.frequency === "Weekly" && task.weeklyDay ? (
                    <Field label="Weekly day">
                      <div className="text-sm">{task.weeklyDay}</div>
                    </Field>
                  ) : null}
                </>
              )}
              <Field label="Due date">
                <Input
                  type="date"
                  value={task.dueDate.slice(0, 10)}
                  onChange={(e) =>
                    updateTask(task.id, { dueDate: new Date(e.target.value).toISOString() })
                  }
                />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <Textarea
                  value={task.description ?? ""}
                  onChange={(e) => updateTask(task.id, { description: e.target.value })}
                  rows={4}
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subtasks" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Checklist progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center gap-3">
                <Progress value={pct} className="h-2" />
                <span className="text-xs text-muted-foreground">
                  {done}/{subTasks.length}
                </span>
              </div>
              <div className="space-y-1">
                {subTasks.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-accent"
                  >
                    <Checkbox checked={s.done} onCheckedChange={() => toggleSubTask(s.id)} />
                    <span
                      className={s.done ? "text-sm text-muted-foreground line-through" : "text-sm"}
                    >
                      {s.title}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Add a sub task…"
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (newSub.trim()) {
                      addSubTask(task.id, newSub.trim());
                      setNewSub("");
                    }
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <div className="space-y-3">
                {comments.length === 0 && (
                  <div className="text-sm text-muted-foreground">No comments yet.</div>
                )}
                {comments.map((c) => {
                  const author = data.users.find((u) => u.id === c.authorId);
                  return (
                    <div key={c.id} className="rounded-md border border-border/60 bg-card/60 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{author?.name}</span>
                        <span className="text-muted-foreground">
                          {format(parseISO(c.createdAt), "MMM d, HH:mm")}
                        </span>
                      </div>
                      <div className="mt-1 text-sm whitespace-pre-wrap">{c.body}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Write a comment. Use @ to mention someone."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newComment.trim() && user) {
                        addComment(task.id, user.id, newComment.trim());
                        setNewComment("");
                        toast.success("Comment posted");
                      }
                    }}
                  >
                    Post comment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  PDF, DOCX, XLSX, PPTX, PNG, JPG, JPEG — max 25MB
                </div>
                <Button size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1 h-4 w-4" /> Upload
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  onChange={onFile}
                  accept={ALLOWED.join(",")}
                />
              </div>
              <div className="mt-3 space-y-1">
                {attachments.length === 0 && (
                  <div className="text-sm text-muted-foreground">No attachments.</div>
                )}
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded border border-border/60 p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" /> {a.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(a.size / 1024).toFixed(0)} KB · {format(parseISO(a.uploadedAt), "MMM d")}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <div className="mb-2 text-sm font-medium">Linked SOPs</div>
              <div className="space-y-1">
                {articles.map((a) => (
                  <Link
                    key={a.id}
                    to="/knowledge"
                    search={{ article: a.id }}
                    className="block rounded border border-border/60 p-2 text-sm hover:bg-accent"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {a.code} {a.currentVersion}
                    </span>{" "}
                    — {a.title}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <ol className="relative space-y-3 border-l border-border pl-4">
                {auditEntries.map((a) => {
                  const actor = data.users.find((u) => u.id === a.actorId);
                  return (
                    <li key={a.id}>
                      <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-primary" />
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(a.createdAt), "MMM d, yyyy HH:mm")} · {actor?.name}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{a.action}</span> — {a.detail}
                      </div>
                    </li>
                  );
                })}
                {auditEntries.length === 0 && (
                  <li className="text-sm text-muted-foreground">No audit entries yet.</li>
                )}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
