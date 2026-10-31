// Settings → Tags: the workspace's shared tag list with colors, and how many
// records use each tag.

import { notFound } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { TagChips } from "@/components/tag-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { TAG_COLORS } from "@/lib/tags";
import { getTags } from "@/lib/tags-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { addTag, deleteTag, updateTag } from "./actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };
const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm capitalize";

export default async function TagsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { error } = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const tags = await getTags(ws.id);

  // Usage counts: one "contains" count per tag per table. Fine for tens of tags.
  const supabase = await createClient();
  const usage = new Map<string, number>();
  await Promise.all(
    tags.map(async (t) => {
      const counts = await Promise.all(
        (["leads", "contacts", "companies", "deals"] as const).map((table) =>
          supabase.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).contains("tag_ids", [t.id]),
        ),
      );
      usage.set(t.id, counts.reduce((sum, r) => sum + (r.count ?? 0), 0));
    }),
  );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tags</h1>
        <p className="text-sm text-muted-foreground">
          One shared list for leads, contacts, companies and deals. You can also create tags straight from a record&apos;s Tags field.
        </p>
      </div>
      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {tags.length ? (
        <ul className="flex flex-col divide-y rounded-md border">
          {tags.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <TagChips tags={[t]} className="w-28 shrink-0" />
              <form action={updateTag.bind(null, slug, t.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Input name="name" defaultValue={t.name} aria-label="Tag name" className="h-8 max-w-48" maxLength={40} />
                <select name="color" defaultValue={t.color} aria-label="Tag color" className={selectClass}>
                  {TAG_COLORS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Button type="submit" variant="outline" size="sm">Save</Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {usage.get(t.id) ?? 0} {usage.get(t.id) === 1 ? "record" : "records"}
                </span>
              </form>
              <ConfirmDeleteButton
                name={`the "${t.name}" tag`}
                description="It's removed from every record that has it. The records themselves stay. This can't be undone."
                confirmLabel="Delete tag"
                action={deleteTag.bind(null, slug, t.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No tags yet.</p>
      )}

      <form action={addTag.bind(null, slug)} className="flex flex-wrap gap-2 rounded-lg border border-dashed p-4">
        <Input name="name" placeholder="New tag, e.g. VIP" aria-label="New tag name" className="max-w-xs" maxLength={40} required />
        <select name="color" defaultValue="blue" aria-label="Tag color" className={selectClass}>
          {TAG_COLORS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <Button type="submit">Add tag</Button>
      </form>
    </div>
  );
}
