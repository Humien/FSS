import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { z } from "zod";
import { Folder, FileText, ChevronRight, History, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const searchSchema = z.object({ article: z.string().optional() });

export const Route = createFileRoute("/_app/knowledge")({
  validateSearch: searchSchema,
  component: Knowledge,
});

function Knowledge() {
  const { data, addArticleVersion } = useStore();
  const { user } = useAuth();
  const search = Route.useSearch();
  const [selected, setSelected] = useState<string | null>(search.article ?? data.articles[0]?.id ?? null);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");

  const article = data.articles.find((a) => a.id === selected) ?? null;
  const versions = data.versions.filter((v) => v.articleId === selected).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const current = versions.find((v) => v.version === article?.currentVersion);

  const filteredArticles = useMemo(() => {
    if (!q) return data.articles;
    const t = q.toLowerCase();
    return data.articles.filter((a) => a.title.toLowerCase().includes(t) || a.code.toLowerCase().includes(t));
  }, [data.articles, q]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">SOPs and articles with version history</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_240px_1fr]">
        <Card>
          <CardContent className="p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Folders</div>
            <FolderTree />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <Input placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2 h-8" />
            <div className="space-y-1">
              {filteredArticles.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                    selected === a.id && "bg-accent",
                  )}
                >
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate">{a.title}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{a.code} {a.currentVersion}</div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            {!article ? (
              <div className="text-center text-sm text-muted-foreground">Select an article.</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{article.code} · current {article.currentVersion}</div>
                    <h2 className="mt-1 text-xl font-semibold">{article.title}</h2>
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-border bg-card/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {current?.body}
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium"><History className="h-4 w-4" /> Version history</div>
                  <div className="space-y-1">
                    {versions.map((v) => {
                      const author = data.users.find((u) => u.id === v.authorId);
                      return (
                        <div key={v.id} className="flex items-center justify-between rounded border border-border/60 p-2 text-xs">
                          <span><span className="font-mono">{v.version}</span> · {author?.name}</span>
                          <span className="text-muted-foreground">{format(parseISO(v.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <div className="text-sm font-medium">Publish new version</div>
                  <Textarea placeholder="Write the next SOP version…" value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => {
                      if (!draft.trim() || !user) return;
                      addArticleVersion(article.id, draft.trim(), user.id);
                      setDraft("");
                      toast.success("New version published");
                    }}><Plus className="mr-1 h-4 w-4" /> Publish</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FolderTree() {
  const { data } = useStore();
  const root = data.folders.filter((f) => !f.parentId);
  return (
    <div className="space-y-0.5 text-sm">
      {root.map((f) => (
        <FolderNode key={f.id} id={f.id} depth={0} />
      ))}
    </div>
  );
}
function FolderNode({ id, depth }: { id: string; depth: number }) {
  const { data } = useStore();
  const f = data.folders.find((x) => x.id === id);
  const children = data.folders.filter((x) => x.parentId === id);
  if (!f) return null;
  return (
    <>
      <div className="flex items-center gap-1 rounded px-1 py-1 hover:bg-accent" style={{ paddingLeft: depth * 12 + 4 }}>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <Folder className="h-4 w-4 text-muted-foreground" />
        <span>{f.name}</span>
      </div>
      {children.map((c) => <FolderNode key={c.id} id={c.id} depth={depth + 1} />)}
    </>
  );
}
