import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Settings2 } from "lucide-react";
import { DealBoard } from "@/components/deal-board";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/deals";
import { getPipelines } from "@/lib/pipelines";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pipeline?: string }> };

export default async function DealsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { pipeline: pipelineParam } = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();

  const pipelines = await getPipelines(ws.id);
  const pipeline = pipelines.find((p) => p.id === pipelineParam) ?? pipelines[0];
  const base = `/w/${slug}/deals`;
  if (!pipeline) {
    return <p className="text-sm text-muted-foreground">No pipeline yet. <Link href={`${base}/pipelines`} className="underline">Create one</Link>.</p>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("id, name, value, currency, close_date, stage_id, position, owner_id, companies(name)")
    .eq("pipeline_id", pipeline.id)
    .limit(2000);
  if (error) throw new Error(error.message);
  const deals = (data ?? []).map(({ companies, ...d }) => ({ ...d, company_name: companies?.name ?? null }));

  const openIds = new Set(pipeline.stages.filter((s) => s.kind === "open").map((s) => s.id));
  const open = deals.filter((d) => openIds.has(d.stage_id));
  const openValue = open.reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        {pipelines.length > 1 && (
          <nav className="flex gap-1 rounded-lg bg-muted p-1 text-sm" aria-label="Pipelines">
            {pipelines.map((p) => (
              <Link
                key={p.id}
                href={`${base}?pipeline=${p.id}`}
                aria-current={p.id === pipeline.id ? "page" : undefined}
                className="rounded-md px-2.5 py-1 text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-xs"
              >
                {p.name}
              </Link>
            ))}
          </nav>
        )}
        <span className="text-sm text-muted-foreground tabular-nums">
          {open.length} open · {formatMoney(openValue)}
        </span>
        <div className="ml-auto flex gap-2">
          <Link href={`${base}/pipelines`} className={buttonVariants({ variant: "outline" })}>
            <Settings2 /> Stages
          </Link>
          <Link href={`${base}/new?pipeline=${pipeline.id}`} className={buttonVariants()}>
            <Plus /> Add deal
          </Link>
        </div>
      </div>
      <DealBoard slug={slug} stages={pipeline.stages} deals={deals} />
    </div>
  );
}
