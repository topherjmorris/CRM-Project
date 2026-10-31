// Import contacts or leads from a CSV file. ?target=contacts (default) or leads.

import Link from "next/link";
import { notFound } from "next/navigation";
import { CsvImporter } from "@/components/csv-importer";
import { getCustomFields } from "@/lib/custom-fields-server";
import type { ImportTarget } from "@/lib/import-fields";
import { getWorkspaceBySlug } from "@/lib/workspaces";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ target?: string }> };

export default async function ImportPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { target: t } = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const target: ImportTarget = t === "leads" ? "leads" : "contacts";
  const custom = await getCustomFields(ws.id, target === "leads" ? "lead" : "contact");
  const label = target === "leads" ? "Leads" : "Contacts";

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href={`/w/${slug}/${target}`} className="text-sm text-muted-foreground hover:underline">← {label}</Link>
        <h2 className="mt-1 text-2xl font-semibold">Import {label.toLowerCase()} from CSV</h2>
        <p className="text-sm text-muted-foreground">
          Export a CSV from your spreadsheet or old CRM, then match its columns to fields here.
        </p>
      </div>
      <CsvImporter slug={slug} target={target} custom={custom.map((c) => ({ key: c.key, label: c.label }))} />
    </div>
  );
}
