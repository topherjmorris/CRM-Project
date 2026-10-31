import { redirect } from "next/navigation";
import { getMyPendingInvites, getMyWorkspaces } from "@/lib/workspaces";

// Entry point after sign-in: go to the first workspace, an open invite, or create one.
export default async function AppHome() {
  const workspaces = await getMyWorkspaces();
  if (workspaces.length) redirect(`/w/${workspaces[0].slug}`);

  // New users who were invited should join that workspace, not create their own.
  const invites = await getMyPendingInvites();
  redirect(invites.length ? `/invite/${invites[0].token}` : "/onboarding");
}
