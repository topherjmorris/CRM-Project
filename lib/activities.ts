// Loads the Activity timeline for a contact, company or deal (server only).
// Joins in contact/deal names and resolves people's names for "by ..." and owner changes.

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { changesOf } from "@/lib/activity-changes";

export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type TimelineItem = Activity & {
  actor_label: string | null;
  contact_label: string | null;
  deal_label: string | null;
};
export type TimelineSubject = { kind: "contact" | "company" | "deal"; id: string };

const LIMIT = 100;

// Activities for one record. A contact's feed also includes its deals' events;
// a company's feed also includes its contacts' and deals' events.
export async function getTimeline(workspaceId: string, subject: TimelineSubject): Promise<TimelineItem[]> {
  const supabase = await createClient();
  const filters: string[] = [`${subject.kind}_id.eq.${subject.id}`];

  if (subject.kind === "contact") {
    const { data } = await supabase.from("deal_contacts").select("deal_id").eq("contact_id", subject.id);
    const ids = (data ?? []).map((d) => d.deal_id);
    if (ids.length) filters.push(`deal_id.in.(${ids.join(",")})`);
  }
  if (subject.kind === "company") {
    const [{ data: people }, { data: deals }] = await Promise.all([
      supabase.from("contacts").select("id").eq("company_id", subject.id).limit(500),
      supabase.from("deals").select("id").eq("company_id", subject.id).limit(500),
    ]);
    if (people?.length) filters.push(`contact_id.in.(${people.map((p) => p.id).join(",")})`);
    if (deals?.length) filters.push(`deal_id.in.(${deals.map((d) => d.id).join(",")})`);
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*, contacts(first_name, last_name, email), deals(name)")
    .eq("workspace_id", workspaceId)
    .or(filters.join(","))
    .order("occurred_at", { ascending: false })
    .limit(LIMIT);
  if (error) throw new Error(error.message);

  // People referenced by actor_id, plus owners named in "updated" events.
  const ownerIds = (data ?? []).flatMap((a) =>
    changesOf(a.meta).filter((c) => c.field === "owner_id").flatMap((c) => [c.from, c.to]),
  );
  const actorIds = [
    ...new Set([...(data ?? []).map((a) => a.actor_id), ...ownerIds].filter((x): x is string => typeof x === "string" && !!x)),
  ];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));

  const ownerLabel = (v: unknown) => (typeof v === "string" ? (names.get(v) ?? "someone") : null);
  return (data ?? []).map(({ contacts, deals, ...a }) => ({
    ...a,
    meta: changesOf(a.meta).some((c) => c.field === "owner_id")
      ? ({
          ...(a.meta as object),
          changes: changesOf(a.meta).map((c) =>
            c.field === "owner_id" ? { ...c, from: ownerLabel(c.from), to: ownerLabel(c.to) } : c,
          ),
        } as Activity["meta"])
      : a.meta,
    actor_label: a.actor_id ? (names.get(a.actor_id) ?? null) : null,
    contact_label: contacts ? [contacts.first_name, contacts.last_name].filter(Boolean).join(" ") || contacts.email : null,
    deal_label: deals?.name ?? null,
  }));
}

