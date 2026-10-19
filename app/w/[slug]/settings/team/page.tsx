import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { changeRole, inviteMember, removeMember, revokeInvite } from "./actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

export default async function TeamPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { error } = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const isAdmin = ws.role === "owner" || ws.role === "admin";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: members = [] } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", ws.id)
    .order("created_at");
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles = [] } = ids.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: invites = [] } = isAdmin
    ? await supabase
        .from("workspace_invites")
        .select("id, email, role, token, expires_at")
        .eq("workspace_id", ws.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false })
    : { data: [] };
  const origin = await siteUrl();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-neutral-600">Owners and admins can invite people and change roles. Members use the CRM.</p>
      </div>

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Members</h2>
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
          {(members ?? []).map((m) => {
            const p = byId.get(m.user_id);
            const editable = isAdmin && m.role !== "owner" && m.user_id !== auth.user?.id;
            return (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p?.full_name || p?.email || "Unknown user"}</div>
                  {p?.full_name && <div className="truncate text-sm text-neutral-500">{p.email}</div>}
                </div>
                {editable ? (
                  <>
                    <form action={changeRole.bind(null, slug, m.user_id)} className="flex items-center gap-2">
                      <select name="role" defaultValue={m.role} aria-label="Role" className="rounded-md border border-neutral-300 px-2 py-1 text-sm">
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <button className="text-sm text-neutral-600 hover:text-neutral-900">Save</button>
                    </form>
                    <form action={removeMember.bind(null, slug, m.user_id)}>
                      <button className="text-sm text-red-700 hover:underline">Remove</button>
                    </form>
                  </>
                ) : (
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs capitalize text-neutral-700">{m.role}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {isAdmin && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Invite someone</h2>
          <form action={inviteMember.bind(null, slug)} className="flex flex-wrap gap-2">
            <input name="email" type="email" required placeholder="teammate@business.com" aria-label="Email"
              className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2" />
            <select name="role" defaultValue="member" aria-label="Role" className="rounded-md border border-neutral-300 px-2 py-2">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800">Create invite</button>
          </form>
          <p className="text-xs text-neutral-500">Invite emails come later. For now, copy the link and send it yourself. Links expire after 7 days.</p>

          {(invites ?? []).length > 0 && (
            <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
              {(invites ?? []).map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{i.email}</span>
                  <span className="capitalize text-neutral-500">{i.role}</span>
                  <CopyButton text={`${origin}/invite/${i.token}`} />
                  <form action={revokeInvite.bind(null, slug, i.id)}>
                    <button className="text-red-700 hover:underline">Revoke</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
