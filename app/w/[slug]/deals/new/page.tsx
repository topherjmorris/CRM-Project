// New deal form. ?pipeline=<id> preselects that pipeline's first stage.

import Link from "next/link";
import { notFound } from "next/navigation";
import { DealForm } from "@/components/deal-form";
import { getCompanyNames, getContactOptions, getMembers } from "@/lib/contacts";

import { getPipelines } from "@/lib/pipelines";
import { createClient } from "@/lib/supabase/server";
import { getCustomFields } from "@/lib/custom-fields-server";
import { getTags } from "@/lib/tags-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { createDeal } from "../actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pipeline?: string }> };

export default async function NewDealPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { pipeline } = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const [customDefs, allTags] = await Promise.all([getCustomFields(ws.id, "deal"), getTags(ws.id)]);
  const supabase = await createClient();
  const [{ data: auth }, pipelines, members, companies, contacts] = await Promise.all([
    supabase.auth.getUser(),
    getPipelines(ws.id),
    getMembers(ws.id),
    getCompanyNames(ws.id),
    getContactOptions(ws.id),
  ]);
  const p = pipelines.find((x) => x.id === pipeline) ?? pipelines[0];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/w/${slug}/deals${p ? `?pipeline=${p.id}` : ""}`} className="text-sm text-muted-foreground hover:underline">← Deals</Link>
        <h2 className="mt-1 text-2xl font-semibold">New deal</h2>
      </div>
      <DealForm
        allTags={allTags}
        tagNames={[]}
        customDefs={customDefs}
        customValues={{}}
        action={createDeal.bind(null, slug)}
        initial={{ stage_id: p?.stages[0]?.id, owner_id: auth.user?.id }}
        pipelines={pipelines}
        members={members}
        companies={companies}
        contacts={contacts}
        submitLabel="Create deal"
      />
    </div>
  );
}
