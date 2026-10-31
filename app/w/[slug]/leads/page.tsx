// Leads list: tabs for Open (every open stage), each of the workspace's stages,
// and All; search across name, email, company and phone, 50 per page.

import Link from "next/link";
import { notFound } from "next/navigation";
import { FileUp, Plus, Search, Settings2, UserRoundSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMembers } from "@/lib/contacts";
import { getLeadStages } from "@/lib/lead-stages";
import { leadName } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";
import { TagChips } from "@/components/tag-chips";
import { TagFilter } from "@/components/tag-filter";
import { tagsFor } from "@/lib/tags";
import { getTags } from "@/lib/tags-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

const PAGE_SIZE = 50;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; page?: string; tab?: string; tag?: string }> };

export default async function LeadsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { q = "", page = "1", tab: tabParam, tag = "" } = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const allTags = await getTags(ws.id);
  const tagFilter = allTags.some((t) => t.id === tag) ? tag : "";
  const stages = await getLeadStages(ws.id);
  const stageById = new Map(stages.map((st) => [st.id, st]));
  // "open" = every open stage; a stage id = that stage; "all" = everything.
  const tabs = [
    { id: "open", label: "Open" },
    ...stages.map((st) => ({ id: st.id, label: st.name })),
    { id: "all", label: "All" },
  ];
  const tab = tabs.find((t) => t.id === tabParam) ?? tabs[0];

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("id, tag_ids, first_name, last_name, email, phone, company_name, stage_id, stage_kind, source, owner_id, created_at", { count: "exact" })
    .eq("workspace_id", ws.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (tab.id === "open") query = query.eq("stage_kind", "open");
  else if (tab.id !== "all") query = query.eq("stage_id", tab.id);
  if (tagFilter) query = query.contains("tag_ids", [tagFilter]);
  // Characters with meaning in PostgREST's or() syntax are stripped so a search can't break the query.
  const term = q.trim().replace(/[%_,()]/g, " ").trim();
  if (term) {
    const like = `%${term}%`;
    query = query.or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},company_name.ilike.${like},phone.ilike.${like}`);
  }
  const [{ data: leads, count, error }, members] = await Promise.all([query, getMembers(ws.id)]);
  if (error) throw new Error(error.message);
  const ownerLabel = new Map(members.map((m) => [m.id, m.label]));
  const total = count ?? 0;
  const base = `/w/${slug}/leads`;
  const href = (p: Record<string, string>) => `${base}?${new URLSearchParams({ tab: tab.id, ...(q ? { q } : {}), ...(tagFilter ? { tag: tagFilter } : {}), ...p })}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <form className="relative min-w-0 flex-1 sm:max-w-sm" role="search">
          {tagFilter && <input type="hidden" name="tag" value={tagFilter} />}
          <input type="hidden" name="tab" value={tab.id} />
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search name, email, company, phone" className="pl-8" aria-label="Search leads" />
        </form>
        <TagFilter tags={allTags} value={tagFilter} keep={{ q, tab: tab.id }} />
        <span className="text-sm text-muted-foreground tabular-nums">{total} {total === 1 ? "lead" : "leads"}</span>
        <div className="ml-auto flex gap-2">
          <Link href={`/w/${slug}/import?target=leads`} className={buttonVariants({ variant: "outline" })}>
            <FileUp /> Import CSV
          </Link>
          <Link href={`${base}/stages`} className={buttonVariants({ variant: "outline" })}>
            <Settings2 /> Stages
          </Link>
          <Link href={`${base}/new`} className={buttonVariants()}>
            <Plus /> Add lead
          </Link>
        </div>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 text-sm" aria-label="Lead stages">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`${base}?${new URLSearchParams({ tab: t.id, ...(q ? { q } : {}) })}`}
              aria-current={t.id === tab.id ? "page" : undefined}
              className="rounded-md px-2.5 py-1 whitespace-nowrap text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-xs"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      {total === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-10">
          <UserRoundSearch className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {q ? `No leads match “${q}”.` : "No leads here yet. Leads are people you're still qualifying; convert them to contacts when they're real prospects."}
          </p>
          {!q && <Link href={`${base}/new`} className={buttonVariants()}><Plus /> Add lead</Link>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="hidden md:table-cell">Email / phone</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leads ?? []).map((l) => (
                <TableRow key={l.id} className="relative">
                  <TableCell className="font-medium">
                    <Link href={`${base}/${l.id}`} className="after:absolute after:inset-0 hover:underline">{leadName(l)}</Link>
                    <TagChips tags={tagsFor(l.tag_ids, allTags)} className="ml-2 align-middle" />
                  </TableCell>
                  <TableCell>{l.company_name}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{l.email ?? l.phone}</TableCell>
                  <TableCell>
                    <Badge variant={l.stage_kind === "converted" ? "default" : l.stage_kind === "unqualified" ? "outline" : "secondary"}>
                      {stageById.get(l.stage_id)?.name ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{l.owner_id ? ownerLabel.get(l.owner_id) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted-foreground tabular-nums">{from + 1}–{Math.min(from + PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            {pageNum > 1 && <Link href={href({ page: String(pageNum - 1) })} className={buttonVariants({ variant: "outline", size: "sm" })}>Previous</Link>}
            {from + PAGE_SIZE < total && <Link href={href({ page: String(pageNum + 1) })} className={buttonVariants({ variant: "outline", size: "sm" })}>Next</Link>}
          </div>
        </nav>
      )}
    </div>
  );
}
