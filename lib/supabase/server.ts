// Supabase client for server code (Server Components, Server Actions, Route Handlers).
// Acts as the signed-in user via their cookie, so row-level security applies. Use this
// by default.
// Vendor: Supabase (docs/VENDORS.md).

import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { cookies } from "next/headers";

// Supabase client for Server Components, Server Actions and Route Handlers.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components can't set cookies. That's fine: proxy.ts refreshes the
            // session on the next request.
          }
        },
      },
    },
  );
}
