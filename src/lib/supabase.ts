// Optional Supabase client. Returns null until VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY are defined, so the app falls back to the local
// mock store while you're building.
//
// To enable:
//   1. bun add @supabase/supabase-js
//   2. set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
//   3. uncomment the createClient block below
//   4. replace mock calls in src/lib/auth.tsx and src/lib/store.tsx
//      with calls against this client.

// import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = (() => {
  if (!url || !key) return null;
  // return createClient(url, key);
  return null;
})();

export const isSupabaseConfigured = !!(url && key);
