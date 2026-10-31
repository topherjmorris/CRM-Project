// Supabase client with the SECRET key. It bypasses row-level security and can read
// and write every workspace. Only for background jobs and trusted server code, never
// for anything a user triggers directly. `server-only` makes the build fail if a
// browser component imports it.
// Vendor: Supabase (docs/VENDORS.md).

import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Bypasses row-level security. Only for background jobs and trusted server code,
// never for requests made on behalf of a signed-in user.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
