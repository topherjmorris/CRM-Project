// Colored tag chips for headers, list rows and deal cards. Works on server and client.

import { tagStyle, type TagLite } from "@/lib/tags";
import { cn } from "@/lib/utils";

export function TagChips({ tags, className }: { tags: TagLite[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <span className={cn("inline-flex flex-wrap gap-1", className)}>
      {tags.map((t) => (
        <span key={t.id} className={cn("rounded px-1.5 py-0.5 text-xs leading-none font-medium", tagStyle(t.color))}>
          {t.name}
        </span>
      ))}
    </span>
  );
}
