// Tag types and the color palette (shared by server and browser code).
// Colors are stored as palette names so they can be restyled in one place.

import type { Database } from "@/lib/database.types";

export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type TagLite = Pick<Tag, "id" | "name" | "color">;

export const TAG_COLORS = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"] as const;
export type TagColor = (typeof TAG_COLORS)[number];

// Chip styles per color, readable in light and dark mode.
export const TAG_STYLE: Record<TagColor, string> = {
  gray: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  green: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  teal: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  pink: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
};

export const tagStyle = (color: string) => TAG_STYLE[(TAG_COLORS as readonly string[]).includes(color) ? (color as TagColor) : "gray"];

// The tags (in workspace order) for a record's tag_ids.
export function tagsFor(ids: string[] | null | undefined, all: TagLite[]): TagLite[] {
  const set = new Set(ids ?? []);
  return all.filter((t) => set.has(t.id));
}
