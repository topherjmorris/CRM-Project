export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-24">
      <h1 className="text-3xl font-semibold">SMB CRM</h1>
      <p className="text-neutral-600">
        Sign in to get started.
      </p>
      <a href="/app" className="w-fit rounded-md bg-neutral-900 px-4 py-2 font-medium text-white">Open the app</a>
    </main>
  );
}
