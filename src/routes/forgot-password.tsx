import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  component: ForgotPassword,
});

function ForgotPassword() {
  const { requestReset } = useAuth();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = await requestReset(email);
    if (r.ok && r.token) {
      setToken(r.token);
      toast.success("Reset link generated (demo)");
    } else {
      toast.error("No account found for that email");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-semibold">Forgot password</h2>
        <p className="mt-1 text-sm text-muted-foreground">We'll send you a reset link.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
        {token && (
          <div className="mt-4 rounded-md border border-border bg-card/40 p-3 text-xs">
            <div className="mb-1 font-medium">Demo: open your reset link</div>
            <Link to="/reset-password" search={{ token }} className="break-all text-primary hover:underline">
              /reset-password?token={token.slice(0, 24)}…
            </Link>
          </div>
        )}
        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
