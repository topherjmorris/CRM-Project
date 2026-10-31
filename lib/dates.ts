// Formatting for date-only values ("YYYY-MM-DD"). They're calendar days, not
// instants, so they're built in local time to avoid shifting a day across zones.

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", opts);
}

// Today's date in this browser's time zone as "YYYY-MM-DD".
export function browserToday() {
  const n = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}
