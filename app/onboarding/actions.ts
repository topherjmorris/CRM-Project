"use server";

import { redirect } from "next/navigation";
import { createWorkspace, slugify } from "@/lib/workspaces";

export async function createWorkspaceAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/onboarding?error=${encodeURIComponent("Enter your business name.")}`);

  // Slugs are unique; add a short suffix so two "Acme Plumbing"s can coexist.
  const base = slugify(name).slice(0, 40) || "workspace";
  const slug = `${base.length < 3 ? base.padEnd(3, "0") : base}-${Math.random().toString(36).slice(2, 6)}`;

  let created;
  try {
    created = await createWorkspace(name, slug);
  } catch (e) {
    redirect(`/onboarding?error=${encodeURIComponent((e as Error).message)}`);
  }
  redirect(`/w/${created.slug}`);
}
