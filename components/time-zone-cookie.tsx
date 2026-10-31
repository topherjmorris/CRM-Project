"use client";

// Saves the browser's time zone in the `tz` cookie so server pages can work out
// "today" for this person (lib/time-zone.ts). Refreshes once when it changes.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function TimeZoneCookie() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const current = document.cookie.match(/(?:^|; )tz=([^;]*)/)?.[1];
    if (tz && decodeURIComponent(current ?? "") !== tz) {
      document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [router]);
  return null;
}
