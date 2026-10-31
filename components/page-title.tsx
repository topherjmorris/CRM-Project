// Section name shown in the workspace top bar, worked out from the current URL.

"use client";

import { usePathname } from "next/navigation";
import { ALL_NAV_ITEMS } from "@/lib/nav";

// Current section name for the top bar, derived from the URL.
export function PageTitle({ slug }: { slug: string }) {
  const rest = usePathname().replace(`/w/${slug}`, "").replace(/^\//, "");
  const item = ALL_NAV_ITEMS.find((i) => rest === i.path || rest.startsWith(i.path + "/"));
  // Pages that aren't in the sidebar.
  const extra = rest.startsWith("import") ? "Import" : null;
  return <h1 className="truncate text-sm font-medium">{item?.title ?? extra ?? "Home"}</h1>;
}
