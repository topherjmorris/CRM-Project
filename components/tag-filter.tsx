// "Filter by tag" dropdown for list pages: a plain GET form (works without
// JavaScript) that keeps the page's other filters via hidden inputs.

import type { TagLite } from "@/lib/tags";

type Props = { tags: TagLite[]; value: string; keep: Record<string, string | undefined> };

export function TagFilter({ tags, value, keep }: Props) {
  if (!tags.length) return null;
  return (
    <form className="flex items-center gap-2">
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <select name="tag" defaultValue={value} aria-label="Filter by tag" className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm">
        <option value="">All tags</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">Filter</button>
    </form>
  );
}
