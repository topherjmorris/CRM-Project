// Settings → Custom fields. One tab per record type. Owners and admins can add,
// rename, reorder and delete fields; everyone else sees the list read-only.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ENTITIES, FIELD_TYPES, type CustomEntity } from "@/lib/custom-fields";
import { BUILTIN_FIELDS } from "@/lib/builtin-fields";
import { getCustomFields, getHiddenFields } from "@/lib/custom-fields-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { addField, deleteField, moveField, saveBuiltinFields, updateField } from "./actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ entity?: string; error?: string }> };
const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

export default async function CustomFieldsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const entity = (ENTITIES.find((e) => e.value === sp.entity)?.value ?? "contact") as CustomEntity;
  const [fields, hidden] = await Promise.all([getCustomFields(ws.id, entity), getHiddenFields(ws.id, entity)]);
  const builtins = BUILTIN_FIELDS[entity] ?? [];
  const canEdit = ws.role === "owner" || ws.role === "admin";
  const typeLabel = (t: string) => FIELD_TYPES.find((x) => x.value === t)?.label ?? t;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Custom fields</h1>
        <p className="text-sm text-muted-foreground">
          Add your own fields to leads, contacts, companies and deals. When a lead converts, its values copy to contact fields with the same name.
        </p>
      </div>
      <nav className="flex w-fit gap-1 rounded-lg bg-muted p-1 text-sm" aria-label="Record type">
        {ENTITIES.map((e) => (
          <Link
            key={e.value}
            href={`/w/${slug}/settings/fields?entity=${e.value}`}
            aria-current={e.value === entity ? "page" : undefined}
            className="rounded-md px-2.5 py-1 text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-xs"
          >
            {e.label}
          </Link>
        ))}
      </nav>
      {sp.error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{sp.error}</p>}

      {builtins.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-medium">Built-in fields</h2>
            <p className="text-sm text-muted-foreground">
              Untick a field to hide it from forms. Data already saved in it is kept and comes back if you switch it on again.
              Names, email and company are always shown.
            </p>
          </div>
          <form action={saveBuiltinFields.bind(null, slug, entity)} className="flex flex-col gap-3 rounded-md border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {builtins.map((b) => (
                <label key={b.key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`show:${b.key}`} defaultChecked={!hidden.includes(b.key)} disabled={!canEdit} className="size-4 accent-primary" />
                  {b.label}
                </label>
              ))}
            </div>
            {canEdit && <Button type="submit" variant="outline" size="sm" className="w-fit">Save built-in fields</Button>}
          </form>
        </section>
      )}

      <h2 className="-mb-3 font-medium">Your custom fields</h2>

      {fields.length ? (
        <ol className="flex flex-col divide-y rounded-md border">
          {fields.map((f, i) => (
            <li key={f.id} className="flex flex-col gap-2 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <form action={updateField.bind(null, slug, entity, f.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input name="label" defaultValue={f.label} aria-label="Field name" className="h-8 max-w-56" maxLength={80} disabled={!canEdit} />
                  <span className="text-xs text-muted-foreground">{typeLabel(f.type)}</span>
                  {f.type === "select" && (
                    <Input name="options" defaultValue={f.options.join(", ")} aria-label="Dropdown options, comma separated" className="h-8 min-w-48 flex-1" disabled={!canEdit} />
                  )}
                  {canEdit && <Button type="submit" variant="outline" size="sm">Save</Button>}
                </form>
                {canEdit && (
                  <div className="flex gap-1">
                    <form action={moveField.bind(null, slug, entity, f.id, "up")}>
                      <Button type="submit" variant="ghost" size="icon-sm" disabled={i === 0} aria-label={`Move ${f.label} up`}><ArrowUp /></Button>
                    </form>
                    <form action={moveField.bind(null, slug, entity, f.id, "down")}>
                      <Button type="submit" variant="ghost" size="icon-sm" disabled={i === fields.length - 1} aria-label={`Move ${f.label} down`}><ArrowDown /></Button>
                    </form>
                    <ConfirmDeleteButton
                      name={`the "${f.label}" field`}
                      description="Records stop showing this field and its values. It can't be undone."
                      confirmLabel="Delete field"
                      action={deleteField.bind(null, slug, entity, f.id)}
                    />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">No custom fields for {ENTITIES.find((e) => e.value === entity)?.label.toLowerCase()} yet.</p>
      )}

      {canEdit ? (
        <form action={addField.bind(null, slug, entity)} className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
          <h2 className="font-medium">Add a field</h2>
          <div className="flex flex-wrap gap-2">
            <Input name="label" placeholder="Field name, e.g. Contract renewal" aria-label="Field name" className="max-w-xs" maxLength={80} required />
            <select name="type" defaultValue="text" aria-label="Field type" className={selectClass}>
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <Input name="options" placeholder="Dropdown options: Basic, Pro, Enterprise" aria-label="Dropdown options, comma separated" className="min-w-56 flex-1" />
            <Button type="submit">Add field</Button>
          </div>
          <p className="text-xs text-muted-foreground">Options are only used for Dropdown fields.</p>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Only owners and admins can change custom fields.</p>
      )}
    </div>
  );
}
