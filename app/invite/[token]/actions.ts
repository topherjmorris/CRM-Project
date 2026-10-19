"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const { data: wsId, error } = await supabase.rpc("accept_invite", { invite_token: token });
  if (error) redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);
  const { data: ws } = await supabase.from("workspaces").select("slug").eq("id", wsId).single();
  redirect(ws ? `/w/${ws.slug}` : "/app");
}
