"use server";

// Lead actions: create, update, delete and convert.
// Leads need a first and last name plus an email or phone; the stage comes from the
// workspace's lead stages. Converting runs the
// convert_lead() database function (migration 20261031000001_leads.sql), which
// creates the contact, company and optional deal in one transaction.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { detailError, detailRow, LEAD_FIELDS, readDetail, type LeadInput } from "@/lib/leads";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { readCustomFor } from "@/lib/custom-fields-server";
import { tagIdsFromForm } from "@/lib/tags-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

export type LeadFormState = { error?: string; values?: LeadInput; custom?: Record<string, string> };

function readForm(formData: FormData): LeadInput {
  const v: LeadInput = {};
  for (const f of LEAD_FIELDS) v[f] = String(formData.get(f) ?? "").trim();
  return { ...v, ...readDetail(formData) };
}

function validate(v: LeadInput) {
  const gaps = [!v.first_name && "first name", !v.last_name && "last name"].filter(Boolean);
  if (gaps.length) return `Please fill in: ${gaps.join(", ")}.`;
  if (!v.email && !v.phone) return "Add an email or a phone number.";
}

function toRow(v: LeadInput) {
  let linkedin = v.linkedin_url || null;
  if (linkedin && !/^https?:\/\//i.test(linkedin)) linkedin = `https://${linkedin}`;
  return {
    first_name: v.first_name ?? "",
    last_name: v.last_name ?? "",
    email: v.email ? v.email.toLowerCase() : null,
    phone: v.phone || null,
    job_title: v.job_title || null,
    company_name: v.company_name || null,
    linkedin_url: linkedin,
    source: v.source || "manual",
    // Empty stage = the database puts the lead in the first open stage.
    ...(v.stage_id ? { stage_id: v.stage_id } : {}),
    notes: v.notes || null,
    owner_id: v.owner_id || null,
    ...detailRow(v),
  };
}

function friendly(error: { message: string }) {
  const detail = detailError(error.message);
  if (detail) return detail;
  if (error.message.includes("email_check")) return "That email address doesn't look right.";
  return error.message;
}

function refresh(slug: string) {
  revalidatePath(`/w/${slug}`, "layout");
}

export async function createLead(slug: string, _prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const values = readForm(formData);
  const invalid = validate(values);
  if (invalid) return { error: invalid, values };
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) return { error: "Workspace not found.", values };
  const cf = await readCustomFor(ws.id, "lead", formData);
  if ("error" in cf) return { error: cf.error, values, custom: cf.raw };
  const tag_ids = await tagIdsFromForm(ws.id, formData);

  const supabase = await createClient();
  // stage_id is filled in by a trigger when empty; the cast covers that for the types.
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...toRow(values), custom: cf.values, tag_ids, workspace_id: ws.id } as LeadInsert)
    .select("id")
    .single();
  if (error) return { error: friendly(error), values };
  refresh(slug);
  redirect(`/w/${slug}/leads/${data.id}`);
}

export async function updateLead(slug: string, id: string, _prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const values = readForm(formData);
  const invalid = validate(values);
  if (invalid) return { error: invalid, values };
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) return { error: "Workspace not found.", values };
  const cf = await readCustomFor(ws.id, "lead", formData, id);
  if ("error" in cf) return { error: cf.error, values, custom: cf.raw };
  const tag_ids = await tagIdsFromForm(ws.id, formData);
  const supabase = await createClient();
  // Converted leads are read-only; the filter keeps an old tab from editing one.
  const { error } = await supabase.from("leads").update({ ...toRow(values), custom: cf.values, tag_ids }).eq("id", id).neq("stage_kind", "converted");
  if (error) return { error: friendly(error), values };
  refresh(slug);
  return { values };
}

export async function deleteLead(slug: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh(slug);
  redirect(`/w/${slug}/leads`);
}

export type ConvertState = { error?: string; values?: Record<string, string> };

export async function convertLead(slug: string, id: string, _prev: ConvertState, formData: FormData): Promise<ConvertState> {
  const v = Object.fromEntries(
    ["first_name", "last_name", "email", "phone", "job_title", "company_name", "create_deal", "deal_name", "deal_value", "stage_id"].map((f) => [
      f,
      String(formData.get(f) ?? "").trim(),
    ]),
  );
  // Same requirements as adding a contact by hand.
  const gaps = [
    !v.first_name && "first name",
    !v.last_name && "last name",
    !v.email && "email",
    !v.company_name && "company",
  ].filter(Boolean);
  if (gaps.length) return { error: `Please fill in: ${gaps.join(", ")}.`, values: v };

  const withDeal = v.create_deal === "on";
  const value = Number((v.deal_value || "0").replace(/[$,\s]/g, ""));
  if (withDeal && !v.deal_name) return { error: "Give the deal a name, or untick “Also create a deal”.", values: v };
  if (withDeal && (!Number.isFinite(value) || value < 0)) return { error: "Deal value must be a positive number.", values: v };

  const supabase = await createClient();
  const { data: contactId, error } = await supabase.rpc("convert_lead", {
    p_lead_id: id,
    p_first_name: v.first_name,
    p_last_name: v.last_name,
    p_email: v.email,
    p_phone: v.phone,
    p_job_title: v.job_title,
    p_company_name: v.company_name,
    p_deal_name: withDeal ? v.deal_name : undefined,
    p_deal_value: withDeal ? value : undefined,
    p_stage_id: withDeal ? v.stage_id : undefined,
  });
  if (error) return { error: error.message.includes("email_check") ? "That email address doesn't look right." : error.message, values: v };
  refresh(slug);
  redirect(`/w/${slug}/contacts/${contactId}`);
}
