// Companies list with search (name, website, industry) and a contact count per company.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Plus, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COMPANY_TYPES, typeLabel } from "@/lib/companies";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

const PAGE_SIZE = 50;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; page?: string; type?: string }> };

export default async function CompaniesPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { q = "", page = "1", type = "" } = await searchParams;
  const typeFilter = COMPANY_TYPES.some((t) => t.value === type) ? type : "";
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from("companies")
    .select("id, name, domain, industry, size, company_type, contacts(count)", { count: "exact" })
    .eq("workspace_id", ws.id)
    .order("name")
    .range(from, from + PAGE_SIZE - 1);

  // Characters with meaning in PostgREST's or() syntax are stripped so a search can't break the query.
  if (typeFilter) query = query.eq("company_type", typeFilter);
  const term = q.trim().replace(/[%_,()]/g, " ").trim();
  if (term) {
    const like = `%${term}%`;
    query = query.or(`name.ilike.${like},domain.ilike.${like},industry.ilike.${like}`);
  }

  const { data: companies, count, error } = await query;
  if (error) throw new Error(error.message);
  const total = count ?? 0;
  const base = `/w/${slug}/companies`;
  const pageHref = (n: number) => `${base}?${new URLSearchParams({ ...(q ? { q } : {}), ...(typeFilter ? { type: typeFilter } : {}), page: String(n) })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <form className="relative min-w-0 flex-1 sm:max-w-sm" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search name, website, industry" className="pl-8" aria-label="Search companies" />
        </form>
        {/* Type filter: a plain GET form, so it works without JavaScript and keeps the search. */}
        <form className="flex items-center gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          <select name="type" defaultValue={typeFilter} aria-label="Filter by type" className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="">All types</option>
            {COMPANY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">Filter</button>
        </form>
        <span className="text-sm text-muted-foreground tabular-nums">
          {total} {total === 1 ? "company" : "companies"}
        </span>
        <Link href={`${base}/new`} className={buttonVariants({ className: "ml-auto" })}>
          <Plus /> Add company
        </Link>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-10">
          <Building2 className="size-6 text-muted-foreground" />
          {q ? (
            <p className="text-sm text-muted-foreground">No companies match “{q}”.</p>
          ) : (
            <>
              <h2 className="text-lg font-semibold">No companies yet</h2>
              <p className="text-sm text-muted-foreground">Companies are also created automatically when you add a contact.</p>
              <Link href={`${base}/new`} className={buttonVariants()}>
                <Plus /> Add company
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Industry</TableHead>
                <TableHead className="hidden md:table-cell">Employees</TableHead>
                <TableHead className="text-right">Contacts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(companies ?? []).map((c) => (
                <TableRow key={c.id} className="relative">
                  <TableCell className="font-medium">
                    <Link href={`${base}/${c.id}`} className="after:absolute after:inset-0 hover:underline">{c.name}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.domain}</TableCell>
                  <TableCell>{typeLabel(c.company_type)}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.industry}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{c.size}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.contacts?.[0]?.count ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted-foreground tabular-nums">
            {from + 1}–{Math.min(from + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            {pageNum > 1 && <Link href={pageHref(pageNum - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Previous</Link>}
            {from + PAGE_SIZE < total && <Link href={pageHref(pageNum + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Next</Link>}
          </div>
        </nav>
      )}
    </div>
  );
}
