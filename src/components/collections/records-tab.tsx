"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileSpreadsheet,
  Loader2,
  Package,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ImportCsvDialog } from "@/components/collections/import-csv-dialog";
import { QrDialog } from "@/components/collections/qr-dialog";
import { RecordFormDialog } from "@/components/collections/record-form-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportQrZip } from "@/lib/export-zip";
import { getOrigin, isLocalOrigin, useQrStyle } from "@/lib/qr";
import { createClient } from "@/lib/supabase/client";
import type { Collection, Field, RecordRow, ScanStats } from "@/lib/types";
import { formatCode, formatDate, isHttpUrl, recordTitle } from "@/lib/utils";

const PAGE_SIZE = 25;

function Cell({ field, value }: { field: Field; value: unknown }) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-muted-foreground/60">—</span>;
  }
  switch (field.type) {
    case "image":
      return typeof value === "string" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" loading="lazy" className="size-8 rounded-md border object-cover" />
      ) : null;
    case "checkbox":
      return value ? <Check className="size-4 text-emerald-600 dark:text-brand" /> : <span className="text-muted-foreground/60">—</span>;
    case "date":
      return <span>{formatDate(String(value))}</span>;
    case "url":
      return isHttpUrl(String(value)) ? (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-[220px] truncate text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {String(value).replace(/^https?:\/\//i, "")}
        </a>
      ) : (
        <span className="block max-w-[220px] truncate">{String(value)}</span>
      );
    default:
      return <span className="block max-w-[220px] truncate">{String(value)}</span>;
  }
}

export function RecordsTab({
  collection,
  fields,
  records,
  setRecords,
  scans,
  userId,
  onGoToFields,
}: {
  collection: Collection;
  fields: Field[];
  records: RecordRow[];
  setRecords: React.Dispatch<React.SetStateAction<RecordRow[]>>;
  scans: ScanStats;
  userId: string;
  onGoToFields: () => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<RecordRow | null>(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrRecord, setQrRecord] = useState<RecordRow | null>(null);

  const [deleting, setDeleting] = useState<RecordRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [qrStyle] = useQrStyle();
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null);

  const fallbackKeys = useMemo(() => fields.filter((f) => f.type === "text").map((f) => f.key), [fields]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        fields.some((f) => String(r.data[f.key] ?? "").toLowerCase().includes(q)),
    );
  }, [records, fields, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function openForm(record: RecordRow | null) {
    setEditing(record);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function openQr(record: RecordRow) {
    setQrRecord(record);
    setQrOpen(true);
  }

  function onSaved(row: RecordRow, isNew: boolean) {
    setRecords((prev) => (isNew ? [row, ...prev] : prev.map((r) => (r.id === row.id ? row : r))));
    toast.success(isNew ? "Data ditambahkan" : "Perubahan disimpan");
    if (isNew) openQr(row);
  }

  async function toggleActive(r: RecordRow, next: boolean) {
    setRecords((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: next } : x)));
    const { error } = await createClient().from("records").update({ is_active: next }).eq("id", r.id);
    if (error) {
      toast.error(error.message);
      setRecords((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: !next } : x)));
    }
  }

  async function deleteRecord(r: RecordRow) {
    const { error } = await createClient().from("records").delete().eq("id", r.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    setRecords((prev) => prev.filter((x) => x.id !== r.id));
    toast.success("Data dihapus");
  }

  async function exportZip() {
    if (isLocalOrigin(getOrigin())) {
      toast.warning("QR mengarah ke alamat lokal. Isi NEXT_PUBLIC_SITE_URL sebelum mencetak.");
    }
    setZipProgress({ done: 0, total: filtered.length });
    try {
      await exportQrZip({
        records: filtered,
        fields,
        titleKey: collection.title_field_key,
        style: qrStyle,
        zipName: collection.name,
        onProgress: (done, total) => setZipProgress({ done, total }),
      });
    } catch {
      toast.error("Gagal membuat ZIP");
    } finally {
      setZipProgress(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Cari data atau kode…"
            className="pl-9"
            aria-label="Cari"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} disabled={fields.length === 0}>
            <FileSpreadsheet /> Impor CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportZip}
            disabled={filtered.length === 0 || zipProgress !== null}
          >
            {zipProgress ? <Loader2 className="animate-spin" /> : <Package />}
            {zipProgress ? `Membuat ${zipProgress.done}/${zipProgress.total}…` : `Unduh QR (ZIP)`}
          </Button>
          <Button size="sm" onClick={() => openForm(null)} disabled={fields.length === 0}>
            <Plus /> Tambah data
          </Button>
        </div>
      </div>

      {/* Kosong: belum ada kolom */}
      {fields.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl border bg-card">
            <Columns3 className="size-5" />
          </div>
          <h3 className="font-semibold tracking-tight">Belum ada kolom</h3>
          <p className="mt-1 mb-4 max-w-sm text-sm text-muted-foreground">
            Tentukan dulu data apa yang disimpan tiap baris, misalnya nama, ordo, atau nomor loker.
          </p>
          <Button onClick={onGoToFields}>
            <Columns3 /> Atur kolom
          </Button>
        </div>
      )}

      {/* Kosong: belum ada data */}
      {fields.length > 0 && records.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl border bg-card">
            <QrCode className="size-5" />
          </div>
          <h3 className="font-semibold tracking-tight">Belum ada data</h3>
          <p className="mt-1 mb-4 max-w-sm text-sm text-muted-foreground">
            Tambahkan satu per satu, atau impor dari CSV. Tiap baris otomatis mendapat QR dan kode.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => openForm(null)}>
              <Plus /> Tambah data pertama
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet /> Impor CSV
            </Button>
          </div>
        </div>
      )}

      {/* Tabel */}
      {fields.length > 0 && records.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {fields.map((f) => (
                  <TableHead key={f.id}>{f.label}</TableHead>
                ))}
                <TableHead>Kode</TableHead>
                <TableHead className="text-right">Scan</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.id} className={r.is_active ? undefined : "opacity-60"}>
                  {fields.map((f) => (
                    <TableCell key={f.id}>
                      <Cell field={f} value={r.data[f.key]} />
                    </TableCell>
                  ))}
                  <TableCell className="font-mono text-xs tracking-wider text-muted-foreground">
                    {formatCode(r.code)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{scans[r.id]?.scans ?? 0}</TableCell>
                  <TableCell>
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(c) => toggleActive(r, c)}
                      aria-label={r.is_active ? "Nonaktifkan QR" : "Aktifkan QR"}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => openQr(r)} aria-label="Lihat QR">
                        <QrCode />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openForm(r)} aria-label="Ubah">
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(r)}
                        aria-label="Hapus"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={fields.length + 4} className="py-10 text-center text-sm text-muted-foreground">
                    Tidak ada data yang cocok dengan “{query}”.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>
              {filtered.length} data{query && ` dari ${records.length}`}
            </span>
            <div className="flex items-center gap-1">
              <span className="mr-1 tabular-nums">
                {safePage + 1} / {pageCount}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}

      <RecordFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        collection={collection}
        fields={fields}
        record={editing}
        userId={userId}
        onSaved={onSaved}
      />

      <QrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        record={qrRecord}
        title={qrRecord ? recordTitle(qrRecord.data, collection.title_field_key, fallbackKeys) || formatCode(qrRecord.code) : ""}
      />

      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        collection={collection}
        fields={fields}
        userId={userId}
        onImported={(rows) => setRecords((prev) => [...rows.reverse(), ...prev])}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus data ini?"
        description="QR dan kodenya akan berhenti berfungsi. Label yang sudah dicetak tidak bisa digunakan lagi. Tindakan ini tidak bisa dibatalkan."
        onConfirm={() => (deleting ? deleteRecord(deleting) : undefined)}
      />
    </div>
  );
}
