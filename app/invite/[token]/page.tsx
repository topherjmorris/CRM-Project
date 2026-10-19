import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> };

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(token);
  const { data } = isUuid ? await supabase.rpc("get_invite", { invite_token: token }) : { data: null };
  const invite = data?.[0];
  const { data: auth } = await supabase.auth.getUser();

  let body: React.ReactNode;
  if (!invite || invite.expired || invite.accepted) {
    body = <p className="text-neutral-600">This invite link is no longer valid. Ask whoever invited you for a new one.</p>;
  } else if (!auth.user) {
    body = (
      <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
        className="rounded-md bg-neutral-900 px-4 py-2 text-center font-medium text-white hover:bg-neutral-800">
        Sign in as {invite.email} to accept
      </Link>
    );
  } else if (auth.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-neutral-600">This invite is for {invite.email}, but you&apos;re signed in as {auth.user.email}.</p>
        <form action={signOut}><button className="text-sm underline">Sign out and switch account</button></form>
      </div>
    );
  } else {
    body = (
      <form action={acceptInvite.bind(null, token)}>
        <button className="w-full rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800">
          Join {invite.workspace_name}
        </button>
      </form>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">
        {invite && !invite.expired && !invite.accepted ? `You're invited to ${invite.workspace_name}` : "Invite"}
      </h1>
      {invite && !invite.expired && !invite.accepted && <p className="text-sm text-neutral-600">You&apos;ll join as {invite.role === "admin" ? "an admin" : "a member"}.</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {body}
    </main>
  );
}
