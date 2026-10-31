import Link from "next/link";
import { getMyPendingInvites } from "@/lib/workspaces";
import { createWorkspaceAction } from "./actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const invites = await getMyPendingInvites();
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      {invites.length > 0 && (
        <section className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="font-semibold">You&apos;ve been invited</h2>
          <ul className="flex flex-col gap-2">
            {invites.map((i) => (
              <li key={i.token}>
                <Link href={`/invite/${i.token}`}
                  className="block rounded-md bg-neutral-900 px-4 py-2 text-center font-medium text-white hover:bg-neutral-800">
                  Join {i.workspace_name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500">Or create a separate workspace for your own business below.</p>
        </section>
      )}
      <div>
        <h1 className="text-2xl font-semibold">Set up your workspace</h1>
        <p className="text-sm text-neutral-600">A workspace holds your contacts, campaigns and team. You can rename it later.</p>
      </div>
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form action={createWorkspaceAction} className="flex flex-col gap-3">
        <label htmlFor="name" className="text-sm font-medium">Business name</label>
        <input id="name" name="name" required maxLength={120} className="rounded-md border border-neutral-300 px-3 py-2" placeholder="Acme Plumbing" />
        <button className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800">Create workspace</button>
      </form>
    </main>
  );
}
