// New lead form. Owner defaults to the person adding it.

import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/lead-form";
import { getMembers } from "@/lib/contacts";
import { getLeadStages } from "@/lib/lead-stages";
import { createClient } from "@/lib/supabase/server";
import { getCustomFields, getHiddenFields } from "@/lib/custom-fields-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { createLead } from "../actions";

export default async function NewLeadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const [customDefs, hiddenFields] = await Promise.all([getCustomFields(ws.id, "lead"), getHiddenFields(ws.id, "lead")]);
  const supabase = await createClient();
  const [{ data: auth }, members, stages] = await Promise.all([supabase.auth.getUser(), getMembers(ws.id), getLeadStages(ws.id)]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/w/${slug}/leads`} className="text-sm text-muted-foreground hover:underline">← Leads</Link>
        <h2 className="mt-1 text-2xl font-semibold">New lead</h2>
      </div>
      <LeadForm hidden={hiddenFields}
        customDefs={customDefs} customValues={{}} action={createLead.bind(null, slug)} initial={{ owner_id: auth.user?.id, source: "manual" }} members={members} stages={stages.filter((s) => s.kind !== "converted")} submitLabel="Create lead" />
    </div>
  );
}
