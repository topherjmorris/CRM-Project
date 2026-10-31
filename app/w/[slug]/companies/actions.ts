// Create, update and delete companies. Websites are normalized to a bare domain
// ("https://www.Acme.com/about" -> "acme.com") and must be unique per workspace.
// Deleting a company keeps its contacts; they just lose the link.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COMPANY_FIELDS, COMPANY_SIZES, COMPANY_TYPES, companyExtraRow, normalizeDomain, REVENUE_RANGES, type CompanyInput } from "@/lib/companies";
import { createClient } from "@/lib/supabase/server";
import { readCustomFor } from "@/lib/custom-fields-server";
import { tagIdsFromForm } from "@/lib/tags-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export type CompanyFormState = { error?: string; values?: CompanyInput; custom?: Record<string, string> };

function readForm(formData: FormData): CompanyInput {
  const v: CompanyInput = {};
  for (const f of COMPANY_FIELDS) v[f] = String(formData.get(f) ?? "").trim();
  return v;
}

function validate(v: CompanyInput): string | undefined {
  if (!v.name) return "Please fill in: company name.";
  if (v.domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalizeDomain(v.domain))) return "That website doesn't look right. Try something like acme.com.";
  if (v.size && !(COMPANY_SIZES as readonly string[]).includes(v.size)) return "Pick a company size from the list.";
  if (v.company_type && !COMPANY_TYPES.some((t) => t.value === v.company_type)) return "Pick a company type from the list.";
  if (v.annual_revenue && !REVENUE_RANGES.some((r) => r.value === v.annual_revenue)) return "Pick a revenue range from the list.";
}

function toRow(v: CompanyInput) {
  return {
    name: v.name!,
    domain: v.domain ? normalizeDomain(v.domain) : null,
    industry: v.industry || null,
    size: v.size || null,
    phone: v.phone || null,
    notes: v.notes || null,
    owner_id: v.owner_id || null,
    company_type: v.company_type || null,
    annual_revenue: v.annual_revenue || null,
    ...companyExtraRow(v),
  };
}

function friendly(error: { code?: string; message: string }) {
  if (/(linkedin_url|facebook_url|instagram_url|x_url)_check/.test(error.message)) return "One of the social links doesn't look right.";
  if (error.code === "23505") {
    return error.message.includes("domain")
      ? "Another company in this workspace already uses that website."
      : "A company with that name already exists in this workspace.";
  }
  return error.message;
}

function refresh(slug: string) {
  revalidatePath(`/w/${slug}/companies`, "layout");
  revalidatePath(`/w/${slug}/contacts`, "layout");
}

export async function createCompany(slug: string, _prev: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  const values = readForm(formData);
  const invalid = validate(values);
  if (invalid) return { error: invalid, values };
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) return { error: "Workspace not found.", values };
  const cf = await readCustomFor(ws.id, "company", formData);
  if ("error" in cf) return { error: cf.error, values, custom: cf.raw };
  const tag_ids = await tagIdsFromForm(ws.id, formData);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...toRow(values), custom: cf.values, tag_ids, workspace_id: ws.id })
    .select("id")
    .single();
  if (error) return { error: friendly(error), values };

  refresh(slug);
  redirect(`/w/${slug}/companies/${data.id}`);
}

export async function updateCompany(slug: string, id: string, _prev: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  const values = readForm(formData);
  const invalid = validate(values);
  if (invalid) return { error: invalid, values };
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) return { error: "Workspace not found.", values };
  const cf = await readCustomFor(ws.id, "company", formData, id);
  if ("error" in cf) return { error: cf.error, values, custom: cf.raw };
  const tag_ids = await tagIdsFromForm(ws.id, formData);

  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({ ...toRow(values), custom: cf.values, tag_ids }).eq("id", id);
  if (error) return { error: friendly(error), values };

  refresh(slug);
  return { values };
}

export async function deleteCompany(slug: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh(slug);
  redirect(`/w/${slug}/companies`);
}
