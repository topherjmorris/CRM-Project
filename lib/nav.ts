import {
  Building2,
  CheckSquare,
  Globe,
  Handshake,
  Mail,
  Megaphone,
  Send,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { title: string; path: string; icon: LucideIcon; phase?: string };

// Paths are relative to /w/[slug]. `phase` marks screens that are still placeholders.
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "CRM",
    items: [
      { title: "Contacts", path: "contacts", icon: Users, phase: "CRM core" },
      { title: "Companies", path: "companies", icon: Building2, phase: "CRM core" },
      { title: "Deals", path: "deals", icon: Handshake, phase: "CRM core" },
      { title: "Tasks", path: "tasks", icon: CheckSquare, phase: "CRM core" },
    ],
  },
  {
    label: "Grow",
    items: [
      { title: "Outreach", path: "outreach", icon: Send, phase: "Outreach" },
      { title: "Nurture", path: "nurture", icon: Mail, phase: "Nurture" },
      { title: "Ads", path: "ads", icon: Megaphone, phase: "Social ads" },
      { title: "Sites", path: "sites", icon: Globe, phase: "Site builder" },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { title: "Settings", path: "settings/team", icon: Settings };

export const ALL_NAV_ITEMS = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];
