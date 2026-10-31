// Drag-and-drop pipeline board (native HTML drag events, no library). Moves show
// instantly via useOptimistic and are saved by the moveDeal server action; on failure
// the board snaps back and shows an error. Touch screens can't drag, so phones change
// stage from the deal page.

"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { moveDeal } from "@/app/w/[slug]/deals/actions";
import { formatMoney, type BoardDeal, type Stage } from "@/lib/deals";
import { cn } from "@/lib/utils";

type Props = { slug: string; stages: Stage[]; deals: BoardDeal[] };

const KIND_STYLE: Record<string, string> = {
  won: "border-t-emerald-500",
  lost: "border-t-rose-500",
  open: "border-t-transparent",
};

export function DealBoard({ slug, stages, deals }: Props) {
  const [optimistic, applyMove] = useOptimistic(deals, (state, m: { id: string; stage_id: string; position: number }) =>
    state.map((d) => (d.id === m.id ? { ...d, stage_id: m.stage_id, position: m.position } : d)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState<{ stage: string; index: number } | null>(null);
  const dragId = useRef<string | null>(null);

  const columns = stages.map((s) => ({
    stage: s,
    deals: optimistic.filter((d) => d.stage_id === s.id).sort((a, b) => a.position - b.position),
  }));

  function drop(stageId: string, index: number) {
    const id = dragId.current;
    dragId.current = null;
    setOver(null);
    if (!id) return;
    // Neighbours in the target column, ignoring the card being moved.
    const col = columns.find((c) => c.stage.id === stageId)!.deals.filter((d) => d.id !== id);
    // New position: midpoint between neighbours, or one step past the end, or 0 for an empty column.
    const before = col[index - 1]?.position;
    const after = col[index]?.position;
    const position =
      before === undefined && after === undefined ? 0 : before === undefined ? after! - 1 : after === undefined ? before + 1 : (before + after) / 2;
    const current = optimistic.find((d) => d.id === id);
    if (current && current.stage_id === stageId && current.position === position) return;

    // Show the move immediately; useOptimistic reverts it if the save throws.
    startTransition(async () => {
      applyMove({ id, stage_id: stageId, position });
      try {
        await moveDeal(slug, id, stageId, position);
        setError(null);
      } catch {
        setError("Couldn't move that deal. Refresh and try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex min-w-max gap-3">
          {columns.map(({ stage, deals: items }) => {
            const total = items.reduce((sum, d) => sum + Number(d.value), 0);
            return (
              <section
                key={stage.id}
                aria-label={stage.name}
                className={cn(
                  "flex w-64 shrink-0 flex-col gap-2 rounded-lg border-t-2 bg-muted/50 p-2",
                  KIND_STYLE[stage.kind],
                  over?.stage === stage.id && "ring-2 ring-ring/50",
                )}
                onDragOver={(e) => {
                  if (!dragId.current) return;
                  e.preventDefault();
                  if (over?.stage !== stage.id || e.target === e.currentTarget) setOver({ stage: stage.id, index: over?.stage === stage.id ? over.index : items.length });
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(stage.id, over?.stage === stage.id ? over.index : items.length);
                }}
              >
                <header className="flex items-baseline justify-between gap-2 px-1 pt-1">
                  <h2 className="truncate text-sm font-medium">{stage.name}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                </header>
                <p className="px-1 text-xs text-muted-foreground tabular-nums">{formatMoney(total)}</p>
                <ol className="flex min-h-16 flex-col gap-2">
                  {items.map((d, i) => (
                    <li
                      key={d.id}
                      draggable
                      onDragStart={(e) => {
                        dragId.current = d.id;
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        dragId.current = null;
                        setOver(null);
                      }}
                      onDragOver={(e) => {
                        if (!dragId.current) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const index = e.clientY < rect.top + rect.height / 2 ? i : i + 1;
                        if (over?.stage !== stage.id || over.index !== index) setOver({ stage: stage.id, index });
                      }}
                      className={cn(
                        "cursor-grab rounded-md border bg-background p-2.5 shadow-xs active:cursor-grabbing",
                        over?.stage === stage.id && over.index === i && "border-t-2 border-t-primary",
                        over?.stage === stage.id && over.index === i + 1 && i === items.length - 1 && "border-b-2 border-b-primary",
                      )}
                    >
                      <Link href={`/w/${slug}/deals/${d.id}`} className="block text-sm font-medium hover:underline" draggable={false}>
                        {d.name}
                      </Link>
                      {d.company_name && <p className="truncate text-xs text-muted-foreground">{d.company_name}</p>}
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium tabular-nums">{formatMoney(Number(d.value), d.currency)}</span>
                        {d.close_date && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <CalendarDays className="size-3" />
                            {new Date(d.close_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Drag deals between stages. On a phone, open a deal and change its stage.</p>
    </div>
  );
}
