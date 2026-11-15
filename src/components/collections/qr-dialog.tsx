"use client";

import { Check, Copy, Download, ExternalLink, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { QrPreview } from "@/components/qr-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  downloadBlob,
  getOrigin,
  isLocalOrigin,
  publicUrl,
  qrBlob,
  QR_COLORS,
  QR_DOTS,
  useQrStyle,
} from "@/lib/qr";
import type { RecordRow } from "@/lib/types";
import { cn, formatCode, safeFileName } from "@/lib/utils";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error("Tidak bisa menyalin otomatis");
    }
  }
  return (
    <Button type="button" variant="outline" size="icon-sm" onClick={copy} aria-label={label}>
      {done ? <Check /> : <Copy />}
    </Button>
  );
}

export function QrDialog({
  open,
  onOpenChange,
  record,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: RecordRow | null;
  title: string;
}) {
  const [style, setStyle] = useQrStyle();
  const [busy, setBusy] = useState<"png" | "svg" | null>(null);

  const url = record ? publicUrl(record.code) : "";
  const local = isLocalOrigin(getOrigin());

  async function download(ext: "png" | "svg") {
    if (!record) return;
    setBusy(ext);
    try {
      const blob = await qrBlob(url, style, ext, 1024);
      downloadBlob(blob, `${safeFileName(title, "qr")}-${record.code}.${ext}`);
    } catch {
      toast.error("Gagal membuat file QR");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{title || "QR"}</DialogTitle>
          <DialogDescription>Pindai, bagikan link, atau ketik kodenya.</DialogDescription>
        </DialogHeader>

        {record && (
          <div className="space-y-5">
            <div className="flex justify-center rounded-xl border bg-muted/30 p-5">
              <div className="rounded-xl border bg-white p-1 shadow-xs">
                <QrPreview value={url} style={style} size={208} />
              </div>
            </div>

            {local && (
              <p className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-800 dark:text-amber-300">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  QR ini mengarah ke alamat lokal dan hanya bisa dibuka di komputermu. Deploy dulu dan isi{" "}
                  <code className="font-mono">NEXT_PUBLIC_SITE_URL</code> sebelum mencetak.
                </span>
              </p>
            )}

            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate rounded-md border bg-muted/30 px-3 py-2 font-mono text-[13px]">
                  {url}
                </div>
                <CopyButton text={url} label="Salin link" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-center font-mono text-base font-semibold tracking-[0.2em]">
                  {formatCode(record.code)}
                </div>
                <CopyButton text={record.code} label="Salin kode" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2" role="radiogroup" aria-label="Warna QR">
                {QR_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={style.color === c.value}
                    aria-label={c.label}
                    title={c.label}
                    onClick={() => setStyle({ ...style, color: c.value })}
                    className={cn(
                      "size-6 rounded-full border-2 border-background ring-1 ring-border transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      style.color === c.value && "ring-2 ring-foreground",
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
              <div className="inline-flex rounded-md border p-0.5" role="radiogroup" aria-label="Bentuk titik">
                {QR_DOTS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    role="radio"
                    aria-checked={style.dots === d.value}
                    onClick={() => setStyle({ ...style, dots: d.value })}
                    className={cn(
                      "rounded-[5px] px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      style.dots === d.value && "bg-accent text-foreground",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => download("png")} disabled={busy !== null}>
                <Download /> PNG
              </Button>
              <Button variant="outline" onClick={() => download("svg")} disabled={busy !== null}>
                <Download /> SVG
              </Button>
            </div>
            <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Coba buka link
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
