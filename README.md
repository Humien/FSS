# FSS — Finance Shared Services

Enterprise operations platform for daily ops, month-end close, knowledge, availability and reporting.

This repo ships as a **standalone, deploy-ready** React app: the UI is fully functional out of the box against a seeded local mock store (saved in `localStorage`), and a complete Supabase schema is provided in `supabase-schema.sql` so you can switch on a real backend whenever you're ready.

## Stack

React 19 · TypeScript · Vite · TanStack Router · TanStack Query · Tailwind v4 · shadcn/ui · Lucide · Recharts · React Hook Form · Zod · Sonner.

## Run locally

```bash
bun install        # or: npm install
bun run dev        # or: npm run dev
```

Open the URL printed in the console.

## Demo logins

The login page seeds four accounts. Click any row in the demo panel to auto-fill.

| Email | Password | Role |
|---|---|---|
| admin@fss.local | admin | System Admin |
| manager@fss.local | manager | Manager |
| user@fss.local | user | Standard User |
| viewer@fss.local | viewer | Read Only |

Password rule for seeded accounts: the email's local-part (everything before `@`). Reset clears via Settings → System → "Reset demo data".

## Themes

Dark Professional (default), Light Professional, Corporate Blue, Emerald Green, Executive Purple. Switch in the header (sparkles icon) or Settings → Preferences. Stored in `localStorage`.

## Modules

- **My Day** — personal KPIs, drag-and-drop kanban, favorites, notifications.
- **Work Management** — grid + kanban views, filters, CSV export, task workspace with Details / Sub Tasks / Comments / Attachments / Knowledge / Audit Trail.
- **Month-End Close** — dedicated command center with day tabs (Pre / Day 1–5 / Post), entity drilldown, risk center.
- **Reports** — executive charts (entity, category, completion trend, workload).
- **Knowledge Base** — folder tree, article viewer, version history, publish new versions.
- **Availability** — personal week view, team week matrix.
- **Settings** — profile, theme preferences, users/roles/entities/categories (admin-only), reset demo data.

## Task number format

`FSS-[CATEGORY]-[ENTITY]-[SEQUENCE]` — e.g. `FSS-MEC-GER-000001`, `FSS-DOP-IND-000001`.

## Connecting your own Supabase

The app currently uses an in-browser mock store. To put it on a real backend:

1. Create a Supabase project.
2. Open **SQL Editor** → paste the contents of [`supabase-schema.sql`](./supabase-schema.sql) → run it. This creates every table, RLS policy, the `has_role()` helper, and the new-user trigger.
3. Create a private storage bucket called `fss-attachments` (or run the commented section at the bottom of the SQL file).
4. Sign up your first user via Supabase Auth, then promote them in SQL:
   ```sql
   insert into public.user_roles (user_id, role)
   values ('<your-auth-uid>', 'SystemAdmin');
   ```
5. Wire up the client (next section).

### Wire the Supabase client

```bash
bun add @supabase/supabase-js
```

Create `.env`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

A pre-built client lives at `src/lib/supabase.ts` — it returns `null` until both env vars exist, so the app safely falls back to the local mock store. Replace mock calls in `src/lib/store.tsx` and `src/lib/auth.tsx` with calls against the Supabase client at your own pace.

## Production build

```bash
bun run build
```

Outputs to `.output/`. TanStack Start handles SSR + client bundles automatically. Deploy to any Node-compatible host (Cloudflare Workers, Vercel, Netlify, your own Node server).

## Repo layout

```
src/
  components/
    layout/Header.tsx, Sidebar.tsx
    badges.tsx
    ui/                      # shadcn primitives
  lib/
    auth.tsx                 # auth context (mock-backed, swap for Supabase)
    store.tsx                # data store (mock-backed, swap for Supabase)
    theme.tsx                # theme engine
    seed.ts                  # seeded demo data
    types.ts
  routes/
    __root.tsx               # providers + shell
    index.tsx                # redirect (/ → /my-day or /login)
    login.tsx, forgot-password.tsx, reset-password.tsx
    _app.tsx                 # protected layout (sidebar + header)
    _app.my-day.tsx, _app.work.tsx, _app.work.$taskId.tsx,
    _app.mec.tsx, _app.reports.tsx, _app.knowledge.tsx,
    _app.availability.tsx, _app.settings.tsx, _app.help.tsx
supabase-schema.sql          # complete Postgres schema + RLS
```
