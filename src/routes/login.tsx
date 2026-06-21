import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@fss.local");
  const [password, setPassword] = useState("admin");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/my-day", replace: true });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const r = await signIn(email, password);
    setSubmitting(false);
    if (r.ok) {
      toast.success("Welcome back");
      navigate({ to: "/my-day", replace: true });
    } else {
      toast.error(r.error ?? "Sign-in failed");
    }
  }

  const demo = [
    ["admin@fss.local", "admin", "System Admin"],
    ["manager@fss.local", "manager", "Manager"],
    ["user@fss.local", "user", "Standard User"],
    ["viewer@fss.local", "viewer", "Read Only"],
  ];

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-primary/15 via-background to-background p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">FSS</div>
            <div className="text-xs text-muted-foreground">Finance Shared Services</div>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight">Operations command center for global finance teams.</h1>
          <p className="mt-4 text-muted-foreground">
            Manage daily operations, month-end close, knowledge, availability and reporting — all from one enterprise workspace.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Finance Shared Services</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="text-lg font-semibold">FSS</div>
            <div className="text-xs text-muted-foreground">Finance Shared Services</div>
          </div>
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back. Enter your credentials to continue.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-md border border-border bg-card/40 p-3 text-xs">
            <div className="mb-2 font-medium text-foreground">Demo accounts (click to fill)</div>
            <div className="space-y-1">
              {demo.map(([e, p, r]) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setEmail(e); setPassword(p); }}
                  className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="font-mono">{e}</span>
                  <span>{r}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
