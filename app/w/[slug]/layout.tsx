// Shell for everything inside a workspace (/w/<slug>/...): the collapsible sidebar,
// the top bar with the page title, and the page content. Returns 404 if the signed-in
// user isn't a member of this workspace. The sidebar's open/closed state is remembered
// in the `sidebar_state` cookie.

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { PageTitle } from "@/components/page-title";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { getMyWorkspaces } from "@/lib/workspaces";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export default async function WorkspaceLayout({ children, params }: Props) {
  const { slug } = await params;
  const workspaces = await getMyWorkspaces();
  const ws = workspaces.find((w) => w.slug === slug);
  if (!ws) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", auth.user!.id).maybeSingle();

  // Remember whether the sidebar was collapsed (cookie written by SidebarProvider).
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        workspace={{ name: ws.name, slug: ws.slug, role: ws.role }}
        workspaces={workspaces.map((w) => ({ name: w.name, slug: w.slug, role: w.role }))}
        user={{ email: auth.user!.email ?? "", name: profile?.full_name ?? null }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <PageTitle slug={ws.slug} />
        </header>
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
