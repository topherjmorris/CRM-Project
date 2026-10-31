"use server";

// CSV import, one batch at a time. The browser parses the file, applies the
// column mapping and sends rows as { field: value } objects in batches of up to
// 200, so no single request is large. For each batch we:
//   1. clean each row (email format, links get https://, full name split),
//   2. find or create companies by name (contacts only),
//   3. look up existing records by email for duplicate handling,
//   4. insert new rows in one call (falling back to row-by-row to report errors),
//   5. update or skip duplicates, as chosen.
// Imported records get source "import" and show up on the timeline as created.

import { revalidatePath } from "next/cache";
import { readCustom, type CustomFieldDef } from "@/lib/custom-fields";
import { getCustomFields } from "@/lib/custom-fields-server";
import type { ImportTarget } from "@/lib/import-fields";
import { detailRow, DETAIL_FIELDS } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";
import { tagIdsFromForm } from "@/lib/tags-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export type ImportOptions = { duplicates: "skip" | "update"; tag?: string };
export type ImportResult = { created: number; updated: number; skipped: number; errors: { row: number; message: string }[] };

const MAX_BATCH = 200;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Row = Record<string, string>;
type Cleaned = { row: number; data: Record<string, unknown>; email: string | null; company: string | null };

function clean(input: Row, rowNumber: number, target: ImportTarget, defs: CustomFieldDef[]): Cleaned | { row: number; error: string } {
  const r: Row = {};
  for (const [k, v] of Object.entries(input)) r[k] = String(v ?? "").trim();

  // "Full name" fills first/last only when those weren't mapped separately.
  // "Smith, Jane" is last-name-first; "Jane Smith" is first-name-first.
  if (r.full_name && !r.first_name && !r.last_name) {
    if (r.full_name.includes(",")) {
      const [last, ...rest] = r.full_name.split(",");
      r.last_name = last.trim();
      r.first_name = rest.join(",").trim();
    } else {
      const parts = r.full_name.split(/\s+/);
      r.first_name = parts.shift() ?? "";
      r.last_name = parts.join(" ");
    }
  }
  const email = r.email ? r.email.toLowerCase() : null;
  if (email && !EMAIL.test(email)) return { row: rowNumber, error: `"${r.email}" isn't a valid email.` };
  if (r.secondary_email && !EMAIL.test(r.secondary_email)) r.secondary_email = "";
  if (!r.first_name && !r.last_name && !email && !(target === "leads" && r.phone)) {
    return { row: rowNumber, error: "Needs a name or an email." };
  }

  let linkedin = r.linkedin_url || null;
  if (linkedin && !/^https?:\/\//i.test(linkedin)) linkedin = `https://${linkedin}`;

  // Custom fields: reuse the form validator by building a FormData.
  const fd = new FormData();
  for (const d of defs) if (r[`cf:${d.key}`] !== undefined) fd.set(`cf:${d.key}`, r[`cf:${d.key}`]);
  const mappedDefs = defs.filter((d) => r[`cf:${d.key}`] !== undefined);
  const cf = readCustom(fd, mappedDefs);
  if ("error" in cf) return { row: rowNumber, error: cf.error ?? "Invalid custom field." };

  const detail = detailRow(Object.fromEntries(DETAIL_FIELDS.map((f) => [f, r[f] ?? ""])));
  const data: Record<string, unknown> = {
    first_name: r.first_name.slice(0, 100),
    last_name: r.last_name.slice(0, 100),
    email,
    phone: r.phone?.slice(0, 40) || null,
    job_title: r.job_title?.slice(0, 120) || null,
    linkedin_url: linkedin,
    notes: r.notes?.slice(0, 10000) || null,
    ...detail,
    custom: cf.values,
  };
  if (target === "leads") {
    data.company_name = r.company_name?.slice(0, 200) || null;
    data.source = (r.source || "import").toLowerCase().slice(0, 60);
  } else {
    data.source = "import";
  }
  return { row: rowNumber, data, email, company: r.company_name ? r.company_name.slice(0, 200) : null };
}

// Only fields that have a value, so an update never blanks out existing data.
function nonEmpty(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).filter(([k, v]) => v !== null && v !== "" && k !== "source" && !(k === "custom" && !Object.keys(v as object).length)),
  );
}

export async function importBatch(slug: string, target: ImportTarget, rows: Row[], firstRow: number, options: ImportOptions): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  if (!Array.isArray(rows) || rows.length > MAX_BATCH) throw new Error("Batch too large.");
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) throw new Error("Workspace not found.");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const table = target;
  const defs = await getCustomFields(ws.id, target === "leads" ? "lead" : "contact");

  // Optional tag for everything in this import (created if new).
  const tagForm = new FormData();
  if (options.tag?.trim()) tagForm.set("tags", options.tag.trim());
  const tagIds = await tagIdsFromForm(ws.id, tagForm);

  const cleaned: Cleaned[] = [];
  rows.forEach((r, i) => {
    const c = clean(r, firstRow + i, target, defs);
    if ("error" in c) result.errors.push({ row: c.row, message: c.error });
    else cleaned.push(c);
  });

  // Duplicate emails inside this batch: keep the first.
  const seen = new Set<string>();
  const unique = cleaned.filter((c) => {
    if (!c.email) return true;
    if (seen.has(c.email)) {
      result.skipped++;
      return false;
    }
    seen.add(c.email);
    return true;
  });

  // Companies (contacts only): find by name, create the missing ones.
  const companyIds = new Map<string, string>();
  if (target === "contacts") {
    const names = [...new Set(unique.map((c) => c.company).filter((n): n is string => !!n))];
    if (names.length) {
      const { data: existing } = await supabase.from("companies").select("id, name").eq("workspace_id", ws.id).limit(10000);
      for (const co of existing ?? []) companyIds.set(co.name.toLowerCase(), co.id);
      const missing = names.filter((n) => !companyIds.has(n.toLowerCase()));
      const unseen = [...new Map(missing.map((n) => [n.toLowerCase(), n])).values()];
      if (unseen.length) {
        const { data: made, error } = await supabase
          .from("companies")
          .insert(unseen.map((name) => ({ workspace_id: ws.id, name })))
          .select("id, name");
        if (error) throw new Error(`Couldn't create companies: ${error.message}`);
        for (const co of made ?? []) companyIds.set(co.name.toLowerCase(), co.id);
      }
    }
  }

  // Existing records with the same email.
  const emails = unique.map((c) => c.email).filter((e): e is string => !!e);
  const existingByEmail = new Map<string, { id: string; tag_ids: string[] }>();
  for (let i = 0; i < emails.length; i += 100) {
    const { data } = await supabase.from(table).select("id, email, tag_ids").eq("workspace_id", ws.id).in("email", emails.slice(i, i + 100));
    for (const r of data ?? []) if (r.email) existingByEmail.set(r.email.toLowerCase(), { id: r.id, tag_ids: r.tag_ids });
  }

  const toInsert: { row: number; record: Record<string, unknown> }[] = [];
  for (const c of unique) {
    const record: Record<string, unknown> = { ...c.data };
    if (target === "contacts") record.company_id = c.company ? (companyIds.get(c.company.toLowerCase()) ?? null) : null;
    const match = c.email ? existingByEmail.get(c.email) : undefined;
    if (match) {
      if (options.duplicates === "skip") {
        result.skipped++;
        continue;
      }
      const patch = nonEmpty(record);
      if (tagIds.length) patch.tag_ids = [...new Set([...match.tag_ids, ...tagIds])];
      if (patch.custom) {
        const { data: cur } = await supabase.from(table).select("custom").eq("id", match.id).single();
        patch.custom = { ...((cur?.custom as object) ?? {}), ...(patch.custom as object) };
      }
      const { error } = await supabase.from(table).update(patch as never).eq("id", match.id);
      if (error) result.errors.push({ row: c.row, message: error.message });
      else result.updated++;
      continue;
    }
    toInsert.push({
      row: c.row,
      record: { ...record, workspace_id: ws.id, owner_id: auth.user!.id, tag_ids: tagIds },
    });
  }

  if (toInsert.length) {
    // Leads get their stage from the database (first open stage) when none is given.
    const { error } = await supabase.from(table).insert(toInsert.map((t) => t.record) as never);
    if (!error) {
      result.created += toInsert.length;
    } else {
      // One bad row fails the whole insert; retry one by one to find it.
      for (const t of toInsert) {
        const { error: rowError } = await supabase.from(table).insert(t.record as never);
        if (rowError) result.errors.push({ row: t.row, message: rowError.message });
        else result.created++;
      }
    }
  }

  revalidatePath(`/w/${slug}`, "layout");
  return result;
}
