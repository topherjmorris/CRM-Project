"use client";

import { usePathname } from "next/navigation";
import { ALL_NAV_ITEMS } from "@/lib/nav";

// Current section name for the top bar, derived from the URL.
export function PageTitle({ slug }: { slug: string }) {
  const rest = usePathname().replace(`/w/${slug}`, "").replace(/^\//, "");
  const item = ALL_NAV_ITEMS.find((i) => rest === i.path || rest.startsWith(i.path + "/"));
  return <h1 className="truncate text-sm font-medium">{item?.title ?? "Home"}</h1>;
}
