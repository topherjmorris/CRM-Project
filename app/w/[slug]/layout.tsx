import Link from "next/link";
import { notFound } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { getWorkspaceBySlug } from "@/lib/workspaces";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

// Temporary app shell until the real navigation design lands (FND-05).
export default async function WorkspaceLayout({ children, params }: Props) {
  const { slug } = await params;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-6 border-b border-neutral-200 bg-white px-4 py-3">
        <Link href={`/w/${ws.slug}`} className="font-semibold">{ws.name}</Link>
        <nav className="flex gap-4 text-sm text-neutral-600">
          <Link href={`/w/${ws.slug}/settings/team`} className="hover:text-neutral-900">Team</Link>
        </nav>
        <form action={signOut} className="ml-auto">
          <button className="text-sm text-neutral-600 hover:text-neutral-900">Sign out</button>
        </form>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </div>
  );
}
