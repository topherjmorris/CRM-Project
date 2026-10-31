"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { ArrowRight, Building2, Handshake, Pencil, StickyNote, Trash2, Trophy, UserPlus, Users, XCircle, type LucideIcon } from "lucide-react";
import { addNote, deleteNote, updateNote, type NoteState } from "@/app/w/[slug]/activities/actions";
import { LocalDateTime, toLocalInput } from "@/components/local-datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TimelineItem, TimelineSubject } from "@/lib/activities";
import { changesOf } from "@/lib/activity-changes";
import { formatMoney } from "@/lib/deals";

type Props = { slug: string; subject: TimelineSubject; items: TimelineItem[]; currentUserId: string };

const ICONS: Record<string, LucideIcon> = {
  note: StickyNote,
  contact_created: UserPlus,
  contact_joined_company: Building2,
  company_created: Building2,
  deal_created: Handshake,
  deal_stage_changed: ArrowRight,
  deal_won: Trophy,
  deal_lost: XCircle,
  deal_contact_added: Users,
  contact_updated: Pencil,
  company_updated: Pencil,
};

const FIELD_LABELS: Record<string, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  job_title: "Job title",
  linkedin_url: "LinkedIn",
  notes: "Notes",
  owner_id: "Owner",
  source: "Source",
  name: "Name",
  domain: "Website",
  industry: "Industry",
  size: "Employees",
};

function show(v: unknown) {
  return v === null || v === undefined || v === "" ? "empty" : String(v);
}

function Changes({ item }: { item: TimelineItem }) {
  const changes = changesOf(item.meta);
  if (!changes.length) return null;
  return (
    <ul className="mt-1.5 flex flex-col gap-0.5 rounded-md bg-muted/60 px-3 py-2 text-sm">
      {changes.map((c) => (
        <li key={c.field} className="break-words">
          <span className="text-muted-foreground">{FIELD_LABELS[c.field] ?? c.field.replaceAll("_", " ")}:</span>{" "}
          {"to" in c ? (
            <>
              <span className="line-through decoration-muted-foreground/60">{show(c.from)}</span> → {show(c.to)}
            </>
          ) : (
            "changed"
          )}
        </li>
      ))}
    </ul>
  );
}

function str(meta: unknown, key: string) {
  const v = (meta as Record<string, unknown> | null)?.[key];
  return v === undefined || v === null ? "" : String(v);
}

function Describe({ item, slug, subject }: { item: TimelineItem; slug: string; subject: TimelineSubject }) {
  const m = item.meta;
  // Name the related record only when it isn't the page you're on.
  const dealLink =
    item.deal_id && subject.kind !== "deal" ? (
      <Link href={`/w/${slug}/deals/${item.deal_id}`} className="font-medium hover:underline">{item.deal_label ?? str(m, "deal")}</Link>
    ) : null;
  const contactLink =
    item.contact_id && subject.kind !== "contact" ? (
      <Link href={`/w/${slug}/contacts/${item.contact_id}`} className="font-medium hover:underline">{item.contact_label}</Link>
    ) : null;

  switch (item.type) {
    case "note":
      return <>Note{contactLink && <> on {contactLink}</>}{dealLink && <> on {dealLink}</>}</>;
    case "contact_created":
      return <>{contactLink ?? "Contact"} added</>;
    case "contact_joined_company":
      return <>{contactLink ?? "Contact"} linked to {str(m, "company") || "a company"}</>;
    case "company_created":
      return <>Company added</>;
    case "deal_created":
      return <>Deal {dealLink ?? "created"}{dealLink && " created"} in {str(m, "stage")} · {formatMoney(Number(str(m, "value") || 0))}</>;
    case "deal_stage_changed":
      return <>{dealLink ?? "Deal"} moved from {str(m, "from")} to {str(m, "to")}</>;
    case "deal_won":
      return <>{dealLink ?? "Deal"} won · {formatMoney(Number(str(m, "value") || 0))}</>;
    case "deal_lost":
      return <>{dealLink ?? "Deal"} marked lost</>;
    case "contact_updated":
      return <>{contactLink ?? "Contact"} updated</>;
    case "company_updated":
      return <>Company details updated</>;
    case "deal_contact_added":
      return <>{contactLink ?? "Contact"} added to {dealLink ?? "this deal"}</>;
    default:
      return <>{item.type.replaceAll("_", " ")}</>;
  }
}

// Converts the local date-time field to an ISO string before it's sent.
function WhenField({ id, initial }: { id: string; initial?: string }) {
  const [local, setLocal] = useState(() => toLocalInput(initial));
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">Date and time</Label>
      <Input id={id} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className="w-fit" required />
      <input type="hidden" name="occurred_at" value={local ? new Date(local).toISOString() : ""} />
    </div>
  );
}

function Composer({ slug, subject }: { slug: string; subject: TimelineSubject }) {
  const [state, action, pending] = useActionState<NoteState, FormData>(addNote.bind(null, slug, subject), {});
  // Remounting on each successful save clears the note and resets the time to now.
  return (
    <form key={state.ok ?? 0} action={action} className="flex flex-col gap-3 rounded-lg border p-3">
      <Label htmlFor={`note-${subject.id}`} className="sr-only">New note</Label>
      <Textarea id={`note-${subject.id}`} name="body" rows={3} placeholder="Add a note: call summary, next steps, anything worth remembering" maxLength={20000} required />
      <div className="flex flex-wrap items-end gap-3">
        <WhenField id={`when-${subject.id}`} />
        <Button type="submit" disabled={pending} className="ml-auto">{pending ? "Saving…" : "Add note"}</Button>
      </div>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

function NoteEditor({ slug, item, onDone }: { slug: string; item: TimelineItem; onDone: () => void }) {
  const [state, action, pending] = useActionState<NoteState, FormData>(updateNote.bind(null, slug, item.id), {});
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form action={action} className="mt-2 flex flex-col gap-2">
      <Textarea name="body" defaultValue={item.body ?? ""} rows={3} maxLength={20000} required aria-label="Edit note" />
      <div className="flex flex-wrap items-end gap-2">
        <WhenField id={`when-${item.id}`} initial={item.occurred_at} />
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
          <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </div>
      </div>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

function Entry({ item, slug, subject, mine }: { item: TimelineItem; slug: string; subject: TimelineSubject; mine: boolean }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const Icon = ICONS[item.type] ?? StickyNote;
  const isNote = item.type === "note";

  return (
    <li className="group relative flex gap-3 pb-5 last:pb-0">
      <span aria-hidden className="absolute top-8 bottom-0 left-4 w-px bg-border group-last:hidden" />
      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span><Describe item={item} slug={slug} subject={subject} /></span>
          {item.actor_label && <span className="text-muted-foreground">by {item.actor_label}</span>}
        </div>
        <LocalDateTime iso={item.occurred_at} className="text-xs text-muted-foreground tabular-nums" />
        {!isNote && <Changes item={item} />}
        {isNote && !editing && <p className="mt-1.5 rounded-md bg-muted/60 px-3 py-2 text-sm whitespace-pre-wrap">{item.body}</p>}
        {isNote && editing && <NoteEditor slug={slug} item={item} onDone={() => setEditing(false)} />}
        {isNote && mine && !editing && (
          <div className="mt-1 flex gap-1">
            <Button variant="ghost" size="xs" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
            {confirming ? (
              <>
                <Button variant="destructive" size="xs" disabled={pending} onClick={() => startTransition(() => deleteNote(slug, item.id))}>
                  {pending ? "Deleting…" : "Confirm delete"}
                </Button>
                <Button variant="ghost" size="xs" onClick={() => setConfirming(false)}>Cancel</Button>
              </>
            ) : (
              <Button variant="ghost" size="xs" onClick={() => setConfirming(true)}><Trash2 /> Delete</Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function Timeline({ slug, subject, items, currentUserId }: Props) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`timeline-${subject.id}`}>
      <h3 id={`timeline-${subject.id}`} className="font-medium">Activity</h3>
      <Composer slug={slug} subject={subject} />
      {items.length ? (
        <ol className="flex flex-col">
          {items.map((item) => (
            <Entry key={item.id} item={item} slug={slug} subject={subject} mine={item.actor_id === currentUserId} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      )}
    </section>
  );
}
