"use client";

// CSV import wizard: pick a file → match columns to fields → choose options →
// import in batches with a progress bar → summary with errors by row number.
// Parsing and mapping happen in the browser; importBatch() saves each batch.

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileUp } from "lucide-react";
import { importBatch, type ImportResult } from "@/app/w/[slug]/import/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseCsv } from "@/lib/csv";
import { guessMapping, IMPORT_FIELDS, type ImportTarget } from "@/lib/import-fields";

const BATCH = 200;
const MAX_ROWS = 20000;
const selectClass = "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

type Props = { slug: string; target: ImportTarget; custom: { key: string; label: string }[] };

export function CsvImporter({ slug, target, custom }: Props) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<"skip" | "update">("skip");
  const [tag, setTag] = useState(() => `Imported ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const fields = IMPORT_FIELDS[target];
  const options = useMemo(() => [...fields.map((f) => ({ key: f.key, label: f.label })), ...custom.map((c) => ({ key: `cf:${c.key}`, label: `${c.label} (custom)` }))], [fields, custom]);
  const noun = target === "contacts" ? "contacts" : "leads";
  const mapped = mapping.filter(Boolean);
  const hasIdentity = mapped.some((k) => ["first_name", "last_name", "full_name", "email"].includes(k));

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    if (file.size > 10 * 1024 * 1024) return setError("That file is over 10 MB. Split it into smaller files.");
    const all = parseCsv(await file.text());
    if (all.length < 2) return setError("That file has no data rows. The first row should be column headers.");
    if (all.length - 1 > MAX_ROWS) return setError(`That file has ${all.length - 1} rows. Import up to ${MAX_ROWS.toLocaleString()} at a time.`);
    const head = all[0].map((h, i) => h.trim() || `Column ${i + 1}`);
    setFileName(file.name);
    setHeaders(head);
    setRows(all.slice(1));
    setMapping(guessMapping(head, fields, custom));
  }

  async function run() {
    setError(null);
    setProgress(0);
    const total: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
    // Each CSV row → { field: value } using the chosen mapping.
    const objects = rows.map((r) => {
      const o: Record<string, string> = {};
      mapping.forEach((key, i) => {
        if (key) o[key] = r[i] ?? "";
      });
      return o;
    });
    try {
      for (let i = 0; i < objects.length; i += BATCH) {
        // Row numbers as people see them in a spreadsheet: header is row 1.
        const res = await importBatch(slug, target, objects.slice(i, i + BATCH), i + 2, { duplicates, tag });
        total.created += res.created;
        total.updated += res.updated;
        total.skipped += res.skipped;
        total.errors.push(...res.errors);
        setProgress(Math.min(objects.length, i + BATCH) / objects.length);
      }
      setResult(total);
    } catch (e) {
      setError(`Import stopped: ${(e as Error).message}. Rows before this point were saved.`);
      setResult(total);
    } finally {
      setProgress(null);
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Created", result.created],
            ["Updated", result.updated],
            ["Skipped (duplicates)", result.skipped],
            ["Errors", result.errors.length],
          ].map(([label, n]) => (
            <div key={label} className="rounded-lg border p-3">
              <div className="text-2xl font-semibold tabular-nums">{n}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
        {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {result.errors.length > 0 && (
          <div className="max-h-64 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow><TableHead className="w-20">Row</TableHead><TableHead>Problem</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {result.errors.map((e) => (
                  <TableRow key={e.row}><TableCell className="tabular-nums">{e.row}</TableCell><TableCell>{e.message}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex gap-2">
          <Link href={`/w/${slug}/${target}`} className={buttonVariants()}>View {noun}</Link>
          <Button variant="outline" onClick={() => { setResult(null); setHeaders([]); setRows([]); setFileName(""); }}>Import another file</Button>
        </div>
      </div>
    );
  }

  if (!headers.length) {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center hover:bg-muted/40">
          <FileUp className="size-6 text-muted-foreground" />
          <span className="font-medium">Choose a CSV file</span>
          <span className="text-sm text-muted-foreground">The first row must be column headers. Up to {MAX_ROWS.toLocaleString()} rows.</span>
          <input type="file" accept=".csv,text/csv,.tsv,text/tab-separated-values" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{fileName}</span> · {rows.length.toLocaleString()} rows.{" "}
        <button type="button" className="underline" onClick={() => { setHeaders([]); setRows([]); }}>Choose a different file</button>
      </p>

      <section className="flex flex-col gap-2">
        <h3 className="font-medium">Match columns</h3>
        <p className="text-sm text-muted-foreground">We guessed from the headers. Change any that are wrong, or pick “Don&apos;t import”.</p>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CSV column</TableHead>
                <TableHead>Example</TableHead>
                <TableHead className="w-64">Import as</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headers.map((h, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{h}</TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">{rows.find((r) => r[i]?.trim())?.[i] ?? ""}</TableCell>
                  <TableCell>
                    <select
                      aria-label={`Import ${h} as`}
                      value={mapping[i] ?? ""}
                      onChange={(e) => setMapping(mapping.map((m, j) => (j === i ? e.target.value : m === e.target.value && e.target.value ? "" : m)))}
                      className={selectClass}
                    >
                      <option value="">Don&apos;t import</option>
                      {options.map((o) => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="duplicates">When the email already exists</Label>
          <select id="duplicates" value={duplicates} onChange={(e) => setDuplicates(e.target.value as "skip" | "update")} className={selectClass}>
            <option value="skip">Skip that row</option>
            <option value="update">Update the existing record (only filled-in values)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="import-tag">Tag everything in this import</Label>
          <Input id="import-tag" value={tag} onChange={(e) => setTag(e.target.value)} maxLength={40} placeholder="Leave empty for no tag" />
        </div>
      </section>

      {target === "contacts" && (
        <p className="text-xs text-muted-foreground">
          Companies are matched by name, and new ones are created. Rows need at least a name or an email.
        </p>
      )}
      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={progress !== null || !hasIdentity}>
          {progress !== null ? `Importing… ${Math.round(progress * 100)}%` : `Import ${rows.length.toLocaleString()} ${noun}`}
        </Button>
        {!hasIdentity && <span className="text-sm text-destructive">Match at least a name or email column.</span>}
        {progress !== null && (
          <div className="h-2 w-48 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
