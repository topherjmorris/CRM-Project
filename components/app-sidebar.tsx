// Left navigation for a workspace: workspace switcher, CRM and Grow sections,
// Settings, and the account menu (sign out). Collapses to icons on desktop and turns
// into a slide-out menu on phones. Menu items come from lib/nav.ts.
// Vendor: shadcn/ui Sidebar on Base UI (docs/VENDORS.md).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_GROUPS, SETTINGS_ITEM, type NavItem } from "@/lib/nav";

type WorkspaceSummary = { name: string; slug: string; role: string };

type Props = {
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  user: { email: string; name: string | null };
};

function initials(text: string) {
  return text
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function AppSidebar({ workspace, workspaces, user }: Props) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const base = `/w/${workspace.slug}`;

  const link = (item: NavItem) => {
    const href = `${base}/${item.path}`;
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton
          isActive={active}
          tooltip={item.title}
          render={<Link href={href} onClick={() => setOpenMobile(false)} />}
        >
          <item.icon />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" tooltip={workspace.name} />}>
                <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {initials(workspace.name)}
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium">{workspace.name}</span>
                  <span className="truncate text-xs capitalize text-muted-foreground">{workspace.role}</span>
                </span>
                <ChevronsUpDown className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="start" className="min-w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                  {workspaces.map((w) => (
                    <DropdownMenuItem key={w.slug} render={<Link href={`/w/${w.slug}`} />}>
                      <span className="truncate">{w.name}</span>
                      {w.slug === workspace.slug && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/onboarding" />}>
                  <Plus />
                  Create workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>{group.items.map(link)}</SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {link(SETTINGS_ITEM)}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" tooltip={user.email} />}>
                <Avatar className="size-8 rounded-md">
                  <AvatarFallback className="rounded-md">{initials(user.name || user.email)}</AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium">{user.name || user.email}</span>
                  {user.name && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
                </span>
                <ChevronsUpDown className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="end" className="min-w-56">
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
