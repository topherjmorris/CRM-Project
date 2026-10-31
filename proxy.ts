// Runs before every matching request (Next 16 renamed middleware.ts to proxy.ts).
// Refreshes the Supabase sign-in cookie and sends signed-out visitors away from app
// pages. The real logic lives in lib/supabase/middleware.ts.
// Vendor: Supabase Auth (see docs/VENDORS.md).

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
