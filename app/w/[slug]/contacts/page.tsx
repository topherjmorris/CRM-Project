// Contacts list: search across name, email, company and phone, 50 per page.
// Search runs in the database (ilike) so it works across all contacts, not just this page.

import Link from "next/link";
import { notFound } from "next/navigation";
import { FileUp, Plus, Search, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { contactName, getMembers } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";
import { TagChips } from "@/components/tag-chips";
import { TagFilter } from "@/components/tag-filter";
import { tagsFor } from "@/lib/tags";
import { getTags } from "@/lib/tags-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

const PAGE_SIZE = 50;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; page?: string; tag?: string }> };

export default async function ContactsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { q = "", page = "1", tag = "" } = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const allTags = await getTags(ws.id);
  const tagFilter = allTags.some((t) => t.id === tag) ? tag : "";

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from("contacts")
    .select("id, tag_ids, first_name, last_name, email, phone, company_name, job_title, owner_id, created_at", { count: "exact" })
    .eq("workspace_id", ws.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (tagFilter) query = query.contains("tag_ids", [tagFilter]);
  // Characters with meaning in PostgREST's or() syntax are stripped so a search can't break the query.
  const term = q.trim().replace(/[%_,()]/g, " ").trim();
  if (term) {
    const like = `%${term}%`;
    query = query.or(
      `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},company_name.ilike.${like},phone.ilike.${like}`,
    );
  }

  const [{ data: contacts, count, error }, members] = await Promise.all([query, getMembers(ws.id)]);
  if (error) throw new Error(error.message);
  const ownerLabel = new Map(members.map((m) => [m.id, m.label]));
  const total = count ?? 0;
  const base = `/w/${slug}/contacts`;
  const pageHref = (n: number) => `${base}?${new URLSearchParams({ ...(q ? { q } : {}), ...(tagFilter ? { tag: tagFilter } : {}), page: String(n) })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <form className="relative min-w-0 flex-1 sm:max-w-sm" role="search">
          {tagFilter && <input type="hidden" name="tag" value={tagFilter} />}
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search name, email, company, phone" className="pl-8" aria-label="Search contacts" />
        </form>
        <TagFilter tags={allTags} value={tagFilter} keep={{ q }} />
        <span className="text-sm text-muted-foreground tabular-nums">
          {total} {total === 1 ? "contact" : "contacts"}
        </span>
        <div className="ml-auto flex gap-2">
          <Link href={`/w/${slug}/import?target=contacts`} className={buttonVariants({ variant: "outline" })}>
            <FileUp /> Import CSV
          </Link>
          <Link href={`${base}/new`} className={buttonVariants()}>
            <Plus /> Add contact
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-10">
          <Users className="size-6 text-muted-foreground" />
          {q ? (
            <p className="text-sm text-muted-foreground">No contacts match “{q}”.</p>
          ) : (
            <>
              <h2 className="text-lg font-semibold">No contacts yet</h2>
              <p className="text-sm text-muted-foreground">Add your first contact, or import a CSV from a spreadsheet or your old CRM.</p>
              <Link href={`${base}/new`} className={buttonVariants()}>
                <Plus /> Add contact
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
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(contacts ?? []).map((c) => (
                <TableRow key={c.id} className="relative">
                  <TableCell className="font-medium">
                    <Link href={`${base}/${c.id}`} className="after:absolute after:inset-0 hover:underline">
                      {contactName(c)}
                    </Link>
                    <TagChips tags={tagsFor(c.tag_ids, allTags)} className="ml-2 align-middle" />
                    {c.job_title && <div className="text-xs font-normal text-muted-foreground">{c.job_title}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{c.phone}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.company_name}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {c.owner_id ? ownerLabel.get(c.owner_id) : "—"}
                  </TableCell>
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
