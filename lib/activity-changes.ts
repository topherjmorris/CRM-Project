// Reads the list of changed fields from an "updated" activity. Used on server and client.

// Shared by the server loader and the client timeline.
export type FieldChange = { field: string; from?: unknown; to?: unknown };

export function changesOf(meta: unknown): FieldChange[] {
  const c = (meta as { changes?: unknown } | null)?.changes;
  return Array.isArray(c) ? (c as FieldChange[]) : [];
}
