import { createWorkspaceAction } from "./actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
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
