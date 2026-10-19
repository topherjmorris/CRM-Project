import { signInWithEmail, signInWithGoogle } from "./actions";

type Props = { searchParams: Promise<{ next?: string; error?: string; sent?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next = "/app", error, sent } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-neutral-600">New here? Signing in creates your account.</p>
      </div>

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {sent ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Check {sent} for a sign-in link. You can close this tab.
        </p>
      ) : (
        <>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2 font-medium hover:bg-neutral-50">
              Continue with Google
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="h-px flex-1 bg-neutral-200" />or<span className="h-px flex-1 bg-neutral-200" />
          </div>

          <form action={signInWithEmail} className="flex flex-col gap-3">
            <input type="hidden" name="next" value={next} />
            <label htmlFor="email" className="text-sm font-medium">Work email</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              className="rounded-md border border-neutral-300 px-3 py-2" placeholder="you@business.com" />
            <button className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800">
              Email me a sign-in link
            </button>
          </form>
        </>
      )}
    </main>
  );
}
