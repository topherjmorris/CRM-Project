// New lead form. Owner defaults to the person adding it.

import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/lead-form";
import { getMembers } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { createLead } from "../actions";

export default async function NewLeadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const supabase = await createClient();
  const [{ data: auth }, members] = await Promise.all([supabase.auth.getUser(), getMembers(ws.id)]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/w/${slug}/leads`} className="text-sm text-muted-foreground hover:underline">← Leads</Link>
        <h2 className="mt-1 text-2xl font-semibold">New lead</h2>
      </div>
      <LeadForm action={createLead.bind(null, slug)} initial={{ owner_id: auth.user?.id, status: "new", source: "manual" }} members={members} submitLabel="Create lead" />
    </div>
  );
}
