// Time-zone helpers for server code. The server runs in UTC and doesn't know where
// the viewer is, so the browser stores its zone in the `tz` cookie
// (components/time-zone-cookie.tsx) and these helpers use it to work out "today".
// No date library: Intl does the zone math.

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

// Minutes the zone is ahead of UTC at a given instant (e.g. -300 for New York in winter).
function offsetMinutes(timeZone: string, at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

// The instant local midnight starts on the viewer's calendar day `daysFromToday` away.
export function startOfLocalDay(timeZone: string, daysFromToday = 0, now = new Date()): Date {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(now)
    .split("-")
    .map(Number);
  const guess = Date.UTC(y, m - 1, d + daysFromToday);
  // Apply the zone offset, then correct once in case the offset differs at midnight (DST).
  const first = guess - offsetMinutes(timeZone, new Date(guess)) * 60000;
  return new Date(guess - offsetMinutes(timeZone, new Date(first)) * 60000);
}
