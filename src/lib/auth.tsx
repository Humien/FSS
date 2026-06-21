import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { seedUsers } from "./seed";
import type { Role, User } from "./types";

const SESSION_KEY = "fss:session:v1";
const USERS_KEY = "fss:users:v1";
const DATA_KEY = "fss:data:v1";

interface StoredAccount {
  email: string;
  passwordHash: string;
  userId: string;
}

// Demo password = the email's local part (e.g. admin@fss.local → "admin").
export function defaultPasswordFor(email: string) {
  return email.split("@")[0];
}

async function hash(s: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return s;
}

async function getStoredUsers(): Promise<User[]> {
  if (typeof window === "undefined") return seedUsers;
  try {
    const raw = window.localStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { users?: User[] };
      if (Array.isArray(parsed.users)) {
        return parsed.users;
      }
    }
  } catch {
    /* ignore */
  }
  return seedUsers;
}

async function ensureAccounts(): Promise<StoredAccount[]> {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(USERS_KEY);
  const users = await getStoredUsers();
  let accounts: StoredAccount[] = raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  // Ensure there is an account entry for every user
  const missing = users.filter((u) => !accounts.some((a) => a.userId === u.id));
  for (const u of missing) {
    accounts.push({ email: u.email.toLowerCase(), passwordHash: await hash(defaultPasswordFor(u.email)), userId: u.id });
  }
  // Force every account's password to the temporary value "123" as requested
  const forcedHash = await hash("123");
  accounts = accounts.map((a) => ({ ...a, passwordHash: forcedHash }));
  // Persist updated accounts
  window.localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
  return accounts;
}

export async function addAccount(email: string, password: string, userId: string) {
  if (typeof window === "undefined") return;
  const accounts = await ensureAccounts();
  const next = accounts.filter((a) => a.userId !== userId);
  next.push({ email: email.toLowerCase(), passwordHash: await hash(password), userId });
  window.localStorage.setItem(USERS_KEY, JSON.stringify(next));
}

export function deleteAccountByUserId(userId: string) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) return;
  try {
    const accounts = (JSON.parse(raw) as StoredAccount[]).filter((a) => a.userId !== userId);
    window.localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
  } catch {
    /* ignore */
  }
}

export async function resetPasswordForUserId(userId: string): Promise<{ ok: boolean; password?: string; error?: string }> {
  if (typeof window === "undefined") return { ok: false, error: "No browser storage" };
  const users = await getStoredUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "User not found" };
  const raw = window.localStorage.getItem(USERS_KEY);
  const accounts = raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  const password = defaultPasswordFor(user.email);
  const next = accounts.filter((a) => a.userId !== userId);
  next.push({ email: user.email.toLowerCase(), passwordHash: await hash(password), userId });
  window.localStorage.setItem(USERS_KEY, JSON.stringify(next));
  return { ok: true, password };
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => void;
  requestReset: (email: string) => Promise<{ ok: boolean; token?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  resetPasswordForUser: (userId: string) => Promise<{ ok: boolean; password?: string; error?: string }>;
  hasRole: (...roles: Role[]) => boolean;
  updateProfile: (patch: Partial<User>) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      await ensureAccounts();
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        try {
          setUser(JSON.parse(raw) as User);
        } catch {
          /* ignore */
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn: AuthCtx["signIn"] = useCallback(async (email, password) => {
    const accounts = await ensureAccounts();
    const acc = accounts.find((a) => a.email === email.toLowerCase());
    if (!acc) return { ok: false, error: "No account with that email" };
    const h = await hash(password);
    if (h !== acc.passwordHash) return { ok: false, error: "Incorrect password" };
    const users = await getStoredUsers();
    const u = users.find((x) => x.id === acc.userId);
    if (!u) return { ok: false, error: "User record missing" };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
    return { ok: true };
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const requestReset: AuthCtx["requestReset"] = useCallback(async (email) => {
    const accounts = await ensureAccounts();
    const acc = accounts.find((a) => a.email === email.toLowerCase());
    if (!acc) return { ok: false };
    const token = btoa(`${acc.email}:${Date.now()}`);
    window.localStorage.setItem(`fss:reset:${token}`, acc.email);
    return { ok: true, token };
  }, []);

  const resetPassword: AuthCtx["resetPassword"] = useCallback(async (token, newPassword) => {
    const email = window.localStorage.getItem(`fss:reset:${token}`);
    if (!email) return { ok: false, error: "Invalid or expired token" };
    const accounts = await ensureAccounts();
    const idx = accounts.findIndex((a) => a.email === email);
    if (idx < 0) return { ok: false, error: "Account not found" };
    accounts[idx].passwordHash = await hash(newPassword);
    window.localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
    window.localStorage.removeItem(`fss:reset:${token}`);
    return { ok: true };
  }, []);

  const resetPasswordForUser: AuthCtx["resetPasswordForUser"] = useCallback(async (userId) => {
    return resetPasswordForUserId(userId);
  }, []);

  const hasRole = useCallback((...roles: Role[]) => !!user && roles.includes(user.role), [user]);

  const updateProfile: AuthCtx["updateProfile"] = useCallback(
    (patch) => {
      if (!user) return;
      const next = { ...user, ...patch };
      setUser(next);
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    },
    [user],
  );

  return (
    <Ctx.Provider value={{ user, loading, signIn, signOut, requestReset, resetPassword, resetPasswordForUser, hasRole, updateProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
