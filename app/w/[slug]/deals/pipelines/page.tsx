import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { getPipelines } from "@/lib/pipelines";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { addPipeline, addStage, deletePipeline, deleteStage, moveStage, renamePipeline, updateStage } from "./actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

export default async function PipelinesPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { error } = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();

  const pipelines = await getPipelines(ws.id);
  const supabase = await createClient();
  const { data: deals } = await supabase.from("deals").select("stage_id").eq("workspace_id", ws.id).limit(10000);
  const perStage = new Map<string, number>();
  for (const d of deals ?? []) perStage.set(d.stage_id, (perStage.get(d.stage_id) ?? 0) + 1);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href={`/w/${slug}/deals`} className="text-sm text-muted-foreground hover:underline">← Deals</Link>
        <h2 className="mt-1 text-2xl font-semibold">Pipelines and stages</h2>
        <p className="text-sm text-muted-foreground">
          Deals in a <strong>Won</strong> or <strong>Lost</strong> stage count as closed. Everything else counts as open.
        </p>
      </div>

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {pipelines.map((p) => (
        <section key={p.id} className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <form action={renamePipeline.bind(null, slug, p.id)} className="flex min-w-0 flex-1 gap-2">
              <Input name="name" defaultValue={p.name} aria-label="Pipeline name" className="max-w-xs font-medium" maxLength={80} />
              <Button type="submit" variant="outline" size="sm">Rename</Button>
            </form>
            {pipelines.length > 1 && (
              <form action={deletePipeline.bind(null, slug, p.id)}>
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">Delete pipeline</Button>
              </form>
            )}
          </div>

          <ol className="flex flex-col divide-y rounded-md border">
            {p.stages.map((s, i) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <form action={updateStage.bind(null, slug, s.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input name="name" defaultValue={s.name} aria-label="Stage name" className="h-8 max-w-48" maxLength={60} />
                  <select name="kind" defaultValue={s.kind} aria-label="Stage type" className={selectClass}>
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                  <Button type="submit" variant="outline" size="sm">Save</Button>
                  <span className="text-xs text-muted-foreground tabular-nums">{perStage.get(s.id) ?? 0} deals</span>
                </form>
                <div className="flex gap-1">
                  <form action={moveStage.bind(null, slug, p.id, s.id, "up")}>
                    <Button type="submit" variant="ghost" size="icon-sm" disabled={i === 0} aria-label={`Move ${s.name} up`}><ArrowUp /></Button>
                  </form>
                  <form action={moveStage.bind(null, slug, p.id, s.id, "down")}>
                    <Button type="submit" variant="ghost" size="icon-sm" disabled={i === p.stages.length - 1} aria-label={`Move ${s.name} down`}><ArrowDown /></Button>
                  </form>
                  <form action={deleteStage.bind(null, slug, p.id, s.id)}>
                    <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Delete ${s.name}`}><Trash2 /></Button>
                  </form>
                </div>
              </li>
            ))}
          </ol>

          <form action={addStage.bind(null, slug, p.id)} className="flex gap-2">
            <Input name="name" placeholder="New stage name" aria-label="New stage name" className="max-w-xs" maxLength={60} required />
            <Button type="submit" variant="outline">Add stage</Button>
          </form>
        </section>
      ))}

      <form action={addPipeline.bind(null, slug)} className="flex flex-col gap-2 rounded-lg border border-dashed p-4">
        <h3 className="font-medium">Add a pipeline</h3>
        <p className="text-sm text-muted-foreground">For a different sales process, like renewals or partnerships.</p>
        <div className="flex gap-2">
          <Input name="name" placeholder="Renewals" aria-label="Pipeline name" className="max-w-xs" maxLength={80} required />
          <Button type="submit">Create pipeline</Button>
        </div>
      </form>
    </div>
  );
}
