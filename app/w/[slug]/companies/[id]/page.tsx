// Company profile: its people, edit form, delete, and an Activity timeline that also
// includes events from the company's contacts and deals.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { CompanyForm } from "@/components/company-form";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { buttonVariants } from "@/components/ui/button";
import type { CompanyInput } from "@/lib/companies";
import { contactName, getMembers } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { getTimeline } from "@/lib/activities";
import { Timeline } from "@/components/timeline";
import { deleteCompany, updateCompany } from "../actions";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function CompanyPage({ params }: Props) {
  const { slug, id } = await params;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: c }, { data: people }, members] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).eq("workspace_id", ws.id).maybeSingle(),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email, job_title")
      .eq("company_id", id)
      .order("last_name")
      .limit(200),
    getMembers(ws.id),
  ]);
  if (!c) notFound();
  const [timeline, { data: auth }] = await Promise.all([
    getTimeline(ws.id, { kind: "company", id: c.id }),
    supabase.auth.getUser(),
  ]);

  const initial: CompanyInput = {
    name: c.name,
    domain: c.domain ?? "",
    industry: c.industry ?? "",
    size: c.size ?? "",
    phone: c.phone ?? "",
    notes: c.notes ?? "",
    owner_id: c.owner_id ?? "",
  };
  const contacts = people ?? [];

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/w/${slug}/companies`} className="text-sm text-muted-foreground hover:underline">← Companies</Link>
          <h2 className="mt-1 truncate text-2xl font-semibold">{c.name}</h2>
          <p className="text-sm text-muted-foreground">
            {c.domain ? (
              <a href={`https://${c.domain}`} target="_blank" rel="noreferrer" className="hover:underline">{c.domain}</a>
            ) : (
              "No website yet"
            )}
            {c.industry && <> · {c.industry}</>}
          </p>
        </div>
        <ConfirmDeleteButton
          name={c.name}
          description={
            contacts.length
              ? `Its ${contacts.length} ${contacts.length === 1 ? "contact stays" : "contacts stay"} in your CRM but will have no company until you edit them. This can't be undone.`
              : "This removes the company for everyone in this workspace. It can't be undone."
          }
          confirmLabel="Delete company"
          action={deleteCompany.bind(null, slug, c.id)}
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-medium">People</h3>
          <span className="text-sm text-muted-foreground tabular-nums">{contacts.length}</span>
          <Link href={`/w/${slug}/contacts/new`} className={buttonVariants({ variant: "outline", size: "sm", className: "ml-auto" })}>
            <Plus /> Add contact
          </Link>
        </div>
        {contacts.length ? (
          <ul className="divide-y rounded-lg border">
            {contacts.map((p) => (
              <li key={p.id}>
                <Link href={`/w/${slug}/contacts/${p.id}`} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5 hover:bg-muted/50">
                  <span className="font-medium">{contactName(p)}</span>
                  {p.job_title && <span className="text-sm text-muted-foreground">{p.job_title}</span>}
                  <span className="ml-auto text-sm text-muted-foreground">{p.email}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No contacts at this company yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-medium">Details</h3>
        <CompanyForm
          key={c.updated_at}
          action={updateCompany.bind(null, slug, c.id)}
          initial={initial}
          members={members}
          submitLabel="Save changes"
          savedMessage="Saved"
        />
      </section>
      <Timeline slug={slug} subject={{ kind: "company", id: c.id }} items={timeline} currentUserId={auth.user!.id} />
    </div>
  );
}
