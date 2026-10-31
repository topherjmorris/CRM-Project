// New company form.

import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyForm } from "@/components/company-form";
import { getMembers } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";
import { getCustomFields } from "@/lib/custom-fields-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { createCompany } from "../actions";

export default async function NewCompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const customDefs = await getCustomFields(ws.id, "company");
  const supabase = await createClient();
  const [{ data: auth }, members] = await Promise.all([supabase.auth.getUser(), getMembers(ws.id)]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/w/${slug}/companies`} className="text-sm text-muted-foreground hover:underline">← Companies</Link>
        <h2 className="mt-1 text-2xl font-semibold">New company</h2>
      </div>
      <CompanyForm
        customDefs={customDefs}
        customValues={{}}
        action={createCompany.bind(null, slug)}
        initial={{ owner_id: auth.user?.id }}
        members={members}
        submitLabel="Create company"
      />
    </div>
  );
}
