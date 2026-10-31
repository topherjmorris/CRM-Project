"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Renders a timestamp in the viewer's own time zone, e.g. "Oct 30, 2026, 3:42 PM".
// The server render shows UTC until the browser takes over.
export function LocalDateTime({ iso, className }: { iso: string; className?: string }) {
  const onClient = useSyncExternalStore(subscribe, () => true, () => false);
  const d = new Date(iso);
  const text = onClient
    ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
  return (
    <time dateTime={iso} title={d.toISOString()} className={className}>
      {text}
    </time>
  );
}

// "2026-10-30T15:42" in the viewer's time zone, for <input type="datetime-local">.
export function toLocalInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
