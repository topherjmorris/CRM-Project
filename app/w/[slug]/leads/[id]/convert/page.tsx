// Convert a lead: confirm/complete the contact details, optionally add a deal.
// Already-converted leads are sent back to the lead page.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConvertLeadForm } from "@/components/convert-lead-form";
import { getCompanyNames } from "@/lib/contacts";
import { leadName } from "@/lib/leads";
import { getPipelines } from "@/lib/pipelines";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { convertLead } from "../../actions";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function ConvertLeadPage({ params }: Props) {
  const { slug, id } = await params;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: l }, companies, pipelines] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).eq("workspace_id", ws.id).maybeSingle(),
    getCompanyNames(ws.id),
    getPipelines(ws.id),
  ]);
  if (!l) notFound();
  if (l.status === "converted") redirect(`/w/${slug}/leads/${l.id}`);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/w/${slug}/leads/${l.id}`} className="text-sm text-muted-foreground hover:underline">← {leadName(l)}</Link>
        <h2 className="mt-1 text-2xl font-semibold">Convert to contact</h2>
        <p className="text-sm text-muted-foreground">The lead&apos;s notes and history move to the new contact&apos;s timeline.</p>
      </div>
      <ConvertLeadForm
        action={convertLead.bind(null, slug, l.id)}
        initial={{
          first_name: l.first_name,
          last_name: l.last_name,
          email: l.email ?? "",
          phone: l.phone ?? "",
          job_title: l.job_title ?? "",
          company_name: l.company_name ?? "",
          deal_name: l.company_name ? `${l.company_name} – new deal` : "",
        }}
        companies={companies}
        pipelines={pipelines}
      />
    </div>
  );
}
