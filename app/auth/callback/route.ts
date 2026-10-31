// /auth/callback: Supabase sends people here after they click an email link or
// approve Google sign-in. Swaps the one-time `code` for a session cookie (PKCE flow),
// then redirects to `next`. This URL must be listed in Supabase → Authentication →
// URL Configuration → Redirect URLs for every environment.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/site-url";

// Finishes email-link and Google sign-in by exchanging the code for a session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  const msg = searchParams.get("error_description") ?? "That sign-in link is invalid or has expired.";
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
}
