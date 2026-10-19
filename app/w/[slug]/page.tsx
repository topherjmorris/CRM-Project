import { getWorkspaceBySlug } from "@/lib/workspaces";

export default async function WorkspaceHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ws = await getWorkspaceBySlug(slug);
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{ws?.name}</h1>
      <p className="text-neutral-600">You&apos;re signed in as {ws?.role}. The CRM lands here in Phase 1.</p>
    </div>
  );
}
