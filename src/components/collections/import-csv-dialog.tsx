"use client";

import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import Papa from "papaparse";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadBlob } from "@/lib/qr";
import { createClient } from "@/lib/supabase/client";
import type { Collection, Field, RecordRow } from "@/lib/types";

const MAX_ROWS = 5000;
const CHUNK = 500;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function convert(field: Field, raw: string): unknown {
  const v = raw.trim();
  if (field.type === "checkbox") return /^(1|true|ya|yes|y|x|v)$/i.test(v);
  if (v === "") return undefined;
  if (field.type === "number") {
    const n = Number(v.replace(",", "."));
    return Number.isNaN(n) ? undefined : n;
  }
  return v;
}

export function ImportCsvDialog({
  open,
  onOpenChange,
  collection,
  fields,
  userId,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: Collection;
  fields: Field[];
  userId: string;
  onImported: (rows: RecordRow[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  // Petakan header CSV → kolom (cocok dengan label atau key, tanpa peduli huruf/spasi).
  const mapping = useMemo(() => {
    const map = new Map<string, Field>();
    for (const h of headers) {
      const f = fields.find((x) => norm(x.label) === norm(h) || norm(x.key) === norm(h));
      if (f) map.set(h, f);
    }
    return map;
  }, [headers, fields]);

  const { valid, skipped } = useMemo(() => {
    const valid: Record<string, unknown>[] = [];
    let skipped = 0;
    for (const row of rows) {
      const data: Record<string, unknown> = {};
      for (const [h, f] of mapping) {
        const v = convert(f, row[h] ?? "");
        if (v !== undefined && !(f.type === "checkbox" && v === false)) data[f.key] = v;
      }
      const missing = fields.some((f) => f.required && f.type !== "checkbox" && data[f.key] === undefined);
      if (missing || Object.keys(data).length === 0) skipped++;
      else valid.push(data);
    }
    return { valid, skipped };
  }, [rows, mapping, fields]);

  const unmatched = headers.filter((h) => !mapping.has(h) && !["kode", "link"].includes(norm(h)));

  function reset() {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setProgress(0);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        if (res.data.length > MAX_ROWS) {
          toast.error(`Maksimal ${MAX_ROWS} baris per impor. Pecah file-nya.`);
          return;
        }
        setFileName(file.name);
        setHeaders(res.meta.fields ?? []);
        setRows(res.data);
      },
      error: (err) => toast.error(`Gagal membaca CSV: ${err.message}`),
    });
  }

  function downloadTemplate() {
    const csv = Papa.unparse([fields.map((f) => f.label)]);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `template-${collection.name}.csv`);
  }

  async function run() {
    setBusy(true);
    const supabase = createClient();
    const inserted: RecordRow[] = [];
    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK).map((data) => ({
        collection_id: collection.id,
        data,
        created_by: userId,
      }));
      const { data, error } = await supabase.from("records").insert(chunk).select("*");
      if (error) {
        toast.error(`Impor berhenti: ${error.message}`);
        break;
      }
      inserted.push(...((data ?? []) as RecordRow[]));
      setProgress(inserted.length);
    }
    setBusy(false);
    if (inserted.length > 0) {
      onImported(inserted);
      toast.success(`${inserted.length} data berhasil diimpor`);
      reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Impor dari CSV</DialogTitle>
          <DialogDescription>
            Satu baris = satu QR. Judul kolom di baris pertama dicocokkan dengan nama kolom di koleksi ini.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onFile}
        />

        {!fileName ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors outline-none hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg border bg-card">
                <Upload className="size-5" />
              </span>
              <span className="text-sm font-medium">Pilih file CSV</span>
              <span className="text-xs text-muted-foreground">Dari Excel/Google Sheets: Simpan sebagai .csv</span>
            </button>
            <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate} disabled={fields.length === 0}>
              <FileSpreadsheet /> Unduh template CSV
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
              <FileSpreadsheet className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{fileName}</span>
              <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={busy}>
                Ganti
              </Button>
            </div>
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Siap diimpor</dt>
                <dd className="font-medium">{valid.length} baris</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Kolom cocok</dt>
                <dd className="text-right font-medium">
                  {mapping.size > 0 ? [...mapping.values()].map((f) => f.label).join(", ") : "Tidak ada"}
                </dd>
              </div>
              {unmatched.length > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Diabaikan</dt>
                  <dd className="text-right">{unmatched.join(", ")}</dd>
                </div>
              )}
              {skipped > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Dilewati</dt>
                  <dd className="text-right">{skipped} baris (kolom wajib kosong)</dd>
                </div>
              )}
            </dl>
            {mapping.size === 0 && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
                Tidak ada judul kolom yang cocok. Unduh template CSV untuk melihat format yang benar.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Batal
          </Button>
          <Button onClick={run} disabled={busy || valid.length === 0}>
            {busy && <Loader2 className="animate-spin" />}
            {busy ? `Mengimpor ${progress}/${valid.length}…` : `Impor ${valid.length || ""} baris`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
