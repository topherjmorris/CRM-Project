import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { contactName, getCompanyNames, getMembers, type ContactInput } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { getTimeline } from "@/lib/activities";
import { Timeline } from "@/components/timeline";
import { deleteContact, updateContact } from "../actions";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function ContactPage({ params }: Props) {
  const { slug, id } = await params;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: c }, members, companies] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).eq("workspace_id", ws.id).maybeSingle(),
    getMembers(ws.id),
    getCompanyNames(ws.id),
  ]);
  if (!c) notFound();
  const [timeline, { data: auth }] = await Promise.all([
    getTimeline(ws.id, { kind: "contact", id: c.id }),
    supabase.auth.getUser(),
  ]);

  const name = contactName(c);
  const initial: ContactInput = {
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    job_title: c.job_title ?? "",
    company_name: c.company_name ?? "",
    linkedin_url: c.linkedin_url ?? "",
    notes: c.notes ?? "",
    owner_id: c.owner_id ?? "",
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/w/${slug}/contacts`} className="text-sm text-muted-foreground hover:underline">← Contacts</Link>
          <h2 className="mt-1 truncate text-2xl font-semibold">{name}</h2>
          <p className="text-sm text-muted-foreground">
            {c.job_title && <>{c.job_title} at </>}
            {c.company_id ? (
              <Link href={`/w/${slug}/companies/${c.company_id}`} className="underline-offset-2 hover:underline">{c.company_name}</Link>
            ) : (
              c.company_name || "No company"
            )} · Added{" "}
            {new Date(c.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </p>
        </div>
        <ConfirmDeleteButton
          name={name}
          description="This removes the contact for everyone in this workspace. It can't be undone."
          confirmLabel="Delete contact"
          action={deleteContact.bind(null, slug, c.id)}
        />
      </div>
      <ContactForm
        key={c.updated_at}
        action={updateContact.bind(null, slug, c.id)}
        initial={initial}
        members={members}
        companies={companies}
        submitLabel="Save changes"
        savedMessage="Saved"
      />
      <Timeline slug={slug} subject={{ kind: "contact", id: c.id }} items={timeline} currentUserId={auth.user!.id} />
    </div>
  );
}
