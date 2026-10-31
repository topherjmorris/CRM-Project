// Lead stage settings. Each stage has a type: Open (still being worked),
// Unqualified (not a fit) or Converted (became a contact; set by Convert).

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLeadStages } from "@/lib/lead-stages";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { addLeadStage, deleteLeadStage, moveLeadStage, updateLeadStage } from "./actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };
const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

export default async function LeadStagesPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { error } = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const list = await getLeadStages(ws.id);
  const supabase = await createClient();
  const { data: leads } = await supabase.from("leads").select("stage_id").eq("workspace_id", ws.id).limit(20000);
  const perStage = new Map<string, number>();
  for (const l of leads ?? []) perStage.set(l.stage_id, (perStage.get(l.stage_id) ?? 0) + 1);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={`/w/${slug}/leads`} className="text-sm text-muted-foreground hover:underline">← Leads</Link>
        <h2 className="mt-1 text-2xl font-semibold">Lead stages</h2>
        <p className="text-sm text-muted-foreground">
          <strong>Open</strong> stages are leads you&apos;re still working. <strong>Unqualified</strong> means not a fit.
          <strong> Converted</strong> is where leads go when you convert them to contacts.
        </p>
      </div>
      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <ol className="flex flex-col divide-y rounded-md border">
        {list.map((s, i) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <form action={updateLeadStage.bind(null, slug, s.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Input name="name" defaultValue={s.name} aria-label="Stage name" className="h-8 max-w-48" maxLength={60} />
              <select name="kind" defaultValue={s.kind} aria-label="Stage type" className={selectClass}>
                <option value="open">Open</option>
                <option value="unqualified">Unqualified</option>
                <option value="converted">Converted</option>
              </select>
              <Button type="submit" variant="outline" size="sm">Save</Button>
              <span className="text-xs text-muted-foreground tabular-nums">{perStage.get(s.id) ?? 0} leads</span>
            </form>
            <div className="flex gap-1">
              <form action={moveLeadStage.bind(null, slug, s.id, "up")}>
                <Button type="submit" variant="ghost" size="icon-sm" disabled={i === 0} aria-label={`Move ${s.name} up`}><ArrowUp /></Button>
              </form>
              <form action={moveLeadStage.bind(null, slug, s.id, "down")}>
                <Button type="submit" variant="ghost" size="icon-sm" disabled={i === list.length - 1} aria-label={`Move ${s.name} down`}><ArrowDown /></Button>
              </form>
              <form action={deleteLeadStage.bind(null, slug, s.id)}>
                <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Delete ${s.name}`}><Trash2 /></Button>
              </form>
            </div>
          </li>
        ))}
      </ol>
      <form action={addLeadStage.bind(null, slug)} className="flex gap-2">
        <Input name="name" placeholder="New stage name" aria-label="New stage name" className="max-w-xs" maxLength={60} required />
        <Button type="submit" variant="outline">Add stage</Button>
      </form>
    </div>
  );
}
