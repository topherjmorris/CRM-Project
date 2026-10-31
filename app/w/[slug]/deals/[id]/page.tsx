// Deal page: value and stage badge, people on the deal, edit form (also how to change
// stage on a phone, where drag-and-drop doesn't work), delete, and Activity.

import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { DealForm } from "@/components/deal-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { contactName, getCompanyNames, getContactOptions, getMembers } from "@/lib/contacts";
import { formatMoney } from "@/lib/deals";
import { getPipelines } from "@/lib/pipelines";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { getTimeline } from "@/lib/activities";
import { tasksFor } from "@/lib/tasks";
import { TaskList } from "@/components/task-list";
import { TaskQuickAdd } from "@/components/task-quick-add";
import { Timeline } from "@/components/timeline";
import { addDealContact, deleteDeal, removeDealContact, updateDeal } from "../actions";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function DealPage({ params }: Props) {
  const { slug, id } = await params;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: d }, { data: links }, pipelines, members, companies, contactOptions] = await Promise.all([
    supabase.from("deals").select("*, companies(id, name)").eq("id", id).eq("workspace_id", ws.id).maybeSingle(),
    supabase.from("deal_contacts").select("contacts(id, first_name, last_name, email, job_title)").eq("deal_id", id),
    getPipelines(ws.id),
    getMembers(ws.id),
    getCompanyNames(ws.id),
    getContactOptions(ws.id),
  ]);
  if (!d) notFound();
  const [timeline, tasks, { data: auth }] = await Promise.all([
    getTimeline(ws.id, { kind: "deal", id: d.id }),
    tasksFor(ws.id, { kind: "deal", id: d.id }),
    supabase.auth.getUser(),
  ]);

  const stage = pipelines.flatMap((p) => p.stages).find((s) => s.id === d.stage_id);
  const people = (links ?? []).flatMap((l) => (l.contacts ? [l.contacts] : []));
  const linked = new Set(people.map((p) => p.id));
  const base = `/w/${slug}/deals`;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`${base}?pipeline=${d.pipeline_id}`} className="text-sm text-muted-foreground hover:underline">← Deals</Link>
          <h2 className="mt-1 truncate text-2xl font-semibold">{d.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{formatMoney(Number(d.value), d.currency)}</span>
            {stage && (
              <Badge variant={stage.kind === "won" ? "default" : stage.kind === "lost" ? "destructive" : "secondary"}>{stage.name}</Badge>
            )}
            {d.companies && (
              <Link href={`/w/${slug}/companies/${d.companies.id}`} className="hover:underline">{d.companies.name}</Link>
            )}
          </div>
        </div>
        <ConfirmDeleteButton
          name={d.name}
          description="This removes the deal for everyone in this workspace. Its contacts and company stay. It can't be undone."
          confirmLabel="Delete deal"
          action={deleteDeal.bind(null, slug, d.id)}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="font-medium">People on this deal</h3>
        {people.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <Link href={`/w/${slug}/contacts/${p.id}`} className="min-w-0 flex-1 truncate hover:underline">
                  <span className="font-medium">{contactName(p)}</span>
                  {p.job_title && <span className="ml-2 text-sm text-muted-foreground">{p.job_title}</span>}
                </Link>
                <form action={removeDealContact.bind(null, slug, d.id, p.id)}>
                  <Button variant="ghost" size="icon-sm" aria-label={`Remove ${contactName(p)} from this deal`}>
                    <X />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addDealContact.bind(null, slug, d.id)} className="flex gap-2">
          <select name="contact_id" required aria-label="Contact to add" defaultValue="" className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm">
            <option value="" disabled>Add a contact…</option>
            {contactOptions.filter((c) => !linked.has(c.id)).map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <Button type="submit" variant="outline">Add</Button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-medium">Details</h3>
        <DealForm
          key={d.updated_at}
          action={updateDeal.bind(null, slug, d.id)}
          initial={{
            name: d.name,
            value: String(Number(d.value)),
            close_date: d.close_date ?? "",
            stage_id: d.stage_id,
            company_name: d.companies?.name ?? "",
            owner_id: d.owner_id ?? "",
            notes: d.notes ?? "",
          }}
          pipelines={pipelines}
          members={members}
          companies={companies}
          submitLabel="Save changes"
          savedMessage="Saved"
        />
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="font-medium">Tasks</h3>
        <TaskQuickAdd slug={slug} link={{ deal_id: d.id }} members={members} currentUserId={auth.user!.id} contacts={people.map((p) => ({ id: p.id, label: contactName(p), companyId: null }))} />
        <TaskList slug={slug} tasks={tasks} hide="deal" empty="No tasks yet." />
      </section>
      <Timeline slug={slug} subject={{ kind: "deal", id: d.id }} items={timeline} currentUserId={auth.user!.id} />
    </div>
  );
}
