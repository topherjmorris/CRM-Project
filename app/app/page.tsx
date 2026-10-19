import { redirect } from "next/navigation";
import { getMyWorkspaces } from "@/lib/workspaces";

// Entry point after sign-in: go to the first workspace, or create one.
export default async function AppHome() {
  const workspaces = await getMyWorkspaces();
  redirect(workspaces.length ? `/w/${workspaces[0].slug}` : "/onboarding");
}
