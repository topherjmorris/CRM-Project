// Time-zone helpers for server code. The server runs in UTC and doesn't know where
// the viewer is, so the browser stores its zone in the `tz` cookie
// (components/time-zone-cookie.tsx) and these helpers use it to work out "today".

import { cookies } from "next/headers";

export async function viewerTimeZone(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  try {
    if (tz) {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    }
  } catch {
    // Unknown zone name in the cookie; fall through to UTC.
  }
  return "UTC";
}

// The viewer's calendar date as "YYYY-MM-DD" (en-CA formats dates that way),
// optionally shifted by whole days. Used for date-only fields like task due dates.
export function localDateString(timeZone: string, daysFromToday = 0, now = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  if (!daysFromToday) return today;
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + daysFromToday)).toISOString().slice(0, 10);
}
