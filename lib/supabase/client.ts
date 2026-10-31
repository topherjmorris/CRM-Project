// Supabase client for browser code (Client Components). Uses the publishable key and
// the user's session cookie, so row-level security applies.
// Vendor: Supabase (docs/VENDORS.md).

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// Supabase client for Client Components.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
