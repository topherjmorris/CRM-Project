// Leads list: status tabs (open statuses by default, plus Converted and All),
// search across name, email, company and phone, 50 per page.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Search, UserRoundSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMembers } from "@/lib/contacts";
import { leadName, STATUS_LABEL, type LeadStatus } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

const PAGE_SIZE = 50;
const TABS: { id: string; label: string; statuses: LeadStatus[] | null }[] = [
  { id: "open", label: "Open", statuses: ["new", "contacted", "qualified"] },
  { id: "new", label: "New", statuses: ["new"] },
  { id: "contacted", label: "Contacted", statuses: ["contacted"] },
  { id: "qualified", label: "Qualified", statuses: ["qualified"] },
  { id: "unqualified", label: "Unqualified", statuses: ["unqualified"] },
  { id: "converted", label: "Converted", statuses: ["converted"] },
  { id: "all", label: "All", statuses: null },
];

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; page?: string; tab?: string }> };

export default async function LeadsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { q = "", page = "1", tab: tabParam } = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const tab = TABS.find((t) => t.id === tabParam) ?? TABS[0];

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("id, first_name, last_name, email, phone, company_name, status, source, owner_id, created_at", { count: "exact" })
    .eq("workspace_id", ws.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (tab.statuses) query = query.in("status", tab.statuses);
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
  const href = (p: Record<string, string>) => `${base}?${new URLSearchParams({ tab: tab.id, ...(q ? { q } : {}), ...p })}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <form className="relative min-w-0 flex-1 sm:max-w-sm" role="search">
          <input type="hidden" name="tab" value={tab.id} />
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search name, email, company, phone" className="pl-8" aria-label="Search leads" />
        </form>
        <span className="text-sm text-muted-foreground tabular-nums">{total} {total === 1 ? "lead" : "leads"}</span>
        <Link href={`${base}/new`} className={buttonVariants({ className: "ml-auto" })}>
          <Plus /> Add lead
        </Link>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 text-sm" aria-label="Lead status">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map((t) => (
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
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leads ?? []).map((l) => (
                <TableRow key={l.id} className="relative">
                  <TableCell className="font-medium">
                    <Link href={`${base}/${l.id}`} className="after:absolute after:inset-0 hover:underline">{leadName(l)}</Link>
                  </TableCell>
                  <TableCell>{l.company_name}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{l.email ?? l.phone}</TableCell>
                  <TableCell>
                    <Badge variant={l.status === "converted" ? "default" : l.status === "unqualified" ? "outline" : "secondary"}>{STATUS_LABEL[l.status]}</Badge>
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
