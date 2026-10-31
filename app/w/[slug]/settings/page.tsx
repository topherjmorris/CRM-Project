// /settings on its own opens the Team tab.

import { redirect } from "next/navigation";

export default async function SettingsIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/w/${slug}/settings/team`);
}
