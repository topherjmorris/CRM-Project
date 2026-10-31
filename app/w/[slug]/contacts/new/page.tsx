// New contact form. Owner defaults to the person adding it.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import { getCompanyNames, getMembers } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";
import { getCustomFields, getHiddenFields } from "@/lib/custom-fields-server";
import { getTags } from "@/lib/tags-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { createContact } from "../actions";

export default async function NewContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const [customDefs, hiddenFields, allTags] = await Promise.all([getCustomFields(ws.id, "contact"), getHiddenFields(ws.id, "contact"), getTags(ws.id)]);
  const supabase = await createClient();
  const [{ data: auth }, members, companies] = await Promise.all([supabase.auth.getUser(), getMembers(ws.id), getCompanyNames(ws.id)]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/w/${slug}/contacts`} className="text-sm text-muted-foreground hover:underline">← Contacts</Link>
        <h2 className="mt-1 text-2xl font-semibold">New contact</h2>
      </div>
      <ContactForm
        hidden={hiddenFields}
        allTags={allTags}
        tagNames={[]}
        customDefs={customDefs}
        customValues={{}}
        action={createContact.bind(null, slug)}
        initial={{ owner_id: auth.user?.id }}
        members={members}
        companies={companies}
        submitLabel="Create contact"
      />
    </div>
  );
}
