"use client";

// Tag field for record forms. Type a tag and press Enter (or comma) to add it;
// existing tags are suggested. Each chosen tag is sent as a hidden input named
// "tags" (by name); the server action creates any new ones (tagIdsFromForm).

import { useState } from "react";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { tagStyle, type TagLite } from "@/lib/tags";
import { cn } from "@/lib/utils";

type Props = { all: TagLite[]; initial: string[] };

export function TagInput({ all, initial }: Props) {
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const colorOf = (name: string) => all.find((t) => t.name.toLowerCase() === name.toLowerCase())?.color ?? "gray";

  function add(raw: string) {
    const name = raw.trim().replace(/,$/, "").slice(0, 40);
    if (!name) return;
    // Use the existing tag's spelling when it matches case-insensitively.
    const existing = all.find((t) => t.name.toLowerCase() === name.toLowerCase())?.name ?? name;
    if (!tags.some((t) => t.toLowerCase() === existing.toLowerCase())) setTags([...tags, existing]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="tag-draft">Tags</Label>
      <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-input px-1.5 py-1">
        {tags.map((t) => (
          <span key={t} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", tagStyle(colorOf(t)))}>
            {t}
            <button type="button" aria-label={`Remove tag ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))} className="opacity-60 hover:opacity-100">
              <X className="size-3" />
            </button>
            <input type="hidden" name="tags" value={t} />
          </span>
        ))}
        <input
          id="tag-draft"
          list="tag-options"
          value={draft}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // don't submit the form
              add(draft);
            } else if (e.key === "Backspace" && !draft && tags.length) {
              setTags(tags.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          placeholder={tags.length ? "" : "Type a tag and press Enter"}
          maxLength={40}
          className="min-w-32 flex-1 bg-transparent px-1 text-sm outline-none"
        />
        <datalist id="tag-options">
          {all.filter((t) => !tags.includes(t.name)).map((t) => (
            <option key={t.id} value={t.name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
