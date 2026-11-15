"use client";

import Papa from "papaparse";
import { downloadBlob, publicUrl, qrBlob, type QrStyle } from "./qr";
import type { Field, RecordRow } from "./types";
import { recordTitle, safeFileName } from "./utils";

/**
 * Buat ZIP berisi satu PNG per record + daftar-kode.csv (kode, link, semua kolom).
 * Semua diproses di browser, tidak ada data yang dikirim ke server.
 */
export async function exportQrZip(opts: {
  records: RecordRow[];
  fields: Field[];
  titleKey: string | null;
  style: QrStyle;
  zipName: string;
  onProgress?: (done: number, total: number) => void;
}) {
  const { records, fields, titleKey, style, zipName, onProgress } = opts;
  const { zipSync, strToU8 } = await import("fflate");

  const files: Record<string, Uint8Array> = {};
  const rows: string[][] = [["kode", "link", ...fields.map((f) => f.label)]];
  const fallbackKeys = fields.filter((f) => f.type === "text").map((f) => f.key);

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const url = publicUrl(r.code);
    const title = recordTitle(r.data, titleKey, fallbackKeys);
    const blob = await qrBlob(url, style, "png", 600);
    files[`${safeFileName(title, "qr")}-${r.code}.png`] = new Uint8Array(
      await blob.arrayBuffer(),
    );
    rows.push([
      r.code,
      url,
      ...fields.map((f) => {
        const v = r.data[f.key];
        return v === undefined || v === null ? "" : String(v);
      }),
    ]);
    onProgress?.(i + 1, records.length);
  }

  files["daftar-kode.csv"] = strToU8(Papa.unparse(rows, { escapeFormulae: true }));

  const zipped = zipSync(files, { level: 0 });
  downloadBlob(
    new Blob([zipped as unknown as BlobPart], { type: "application/zip" }),
    `${safeFileName(zipName, "qr")}.zip`,
  );
}
