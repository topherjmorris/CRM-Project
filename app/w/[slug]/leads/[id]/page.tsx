// Lead page: status, Convert button, edit form, delete and Activity timeline.
// Converted leads are read-only and link to the contact they became.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { LeadForm } from "@/components/lead-form";
import { LocalDateTime } from "@/components/local-datetime";
import { Timeline } from "@/components/timeline";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getTimeline } from "@/lib/activities";
import { getMembers } from "@/lib/contacts";
import { getLeadStages } from "@/lib/lead-stages";
import { detailInput, leadName, sourceLabel, type LeadInput } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";
import { getCustomFields } from "@/lib/custom-fields-server";
import { customToInputs } from "@/lib/custom-fields";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { deleteLead, updateLead } from "../actions";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function LeadPage({ params }: Props) {
  const { slug, id } = await params;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const customDefs = await getCustomFields(ws.id, "lead");

  const supabase = await createClient();
  const [{ data: l }, members, stages] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).eq("workspace_id", ws.id).maybeSingle(),
    getMembers(ws.id),
    getLeadStages(ws.id),
  ]);
  if (!l) notFound();
  const [timeline, { data: auth }] = await Promise.all([getTimeline(ws.id, { kind: "lead", id: l.id }), supabase.auth.getUser()]);

  const name = leadName(l);
  const converted = l.stage_kind === "converted";
  const stage = stages.find((s) => s.id === l.stage_id);
  const initial: LeadInput = {
    first_name: l.first_name,
    last_name: l.last_name,
    email: l.email ?? "",
    phone: l.phone ?? "",
    job_title: l.job_title ?? "",
    company_name: l.company_name ?? "",
    linkedin_url: l.linkedin_url ?? "",
    source: l.source,
    stage_id: l.stage_id,
    notes: l.notes ?? "",
    owner_id: l.owner_id ?? "",
    ...detailInput(l),
  };

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/w/${slug}/leads`} className="text-sm text-muted-foreground hover:underline">← Leads</Link>
          <h2 className="mt-1 truncate text-2xl font-semibold">{name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={converted ? "default" : l.stage_kind === "unqualified" ? "outline" : "secondary"}>{stage?.name ?? "No stage"}</Badge>
            {l.company_name && <span>{l.company_name}</span>}
            <span>· {sourceLabel(l.source)}{l.source_detail && ` (${l.source_detail})`}</span>
            <span>· Added <LocalDateTime iso={l.created_at} /></span>
          </div>
        </div>
        {!converted && (
          <Link href={`/w/${slug}/leads/${l.id}/convert`} className={buttonVariants()}>
            <ArrowRightLeft /> Convert to contact
          </Link>
        )}
        <ConfirmDeleteButton
          name={name}
          description={converted ? "The contact it became stays, with its history. This can't be undone." : "This removes the lead and its notes for everyone. It can't be undone."}
          confirmLabel="Delete lead"
          action={deleteLead.bind(null, slug, l.id)}
        />
      </div>

      {converted ? (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          Converted {l.converted_at && <LocalDateTime iso={l.converted_at} />}.{" "}
          {l.converted_contact_id ? (
            <Link href={`/w/${slug}/contacts/${l.converted_contact_id}`} className="font-medium underline-offset-2 hover:underline">Open the contact →</Link>
          ) : (
            "The contact has since been deleted."
          )}
        </p>
      ) : (
        <section className="flex flex-col gap-3">
          <h3 className="font-medium">Details</h3>
          <LeadForm customDefs={customDefs} customValues={customToInputs(customDefs, l.custom)} key={l.updated_at} action={updateLead.bind(null, slug, l.id)} initial={initial} members={members} stages={stages.filter((s) => s.kind !== "converted")} submitLabel="Save changes" savedMessage="Saved" />
        </section>
      )}

      <Timeline slug={slug} subject={{ kind: "lead", id: l.id }} items={timeline} currentUserId={auth.user!.id} />
    </div>
  );
}
