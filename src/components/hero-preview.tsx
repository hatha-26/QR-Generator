"use client";

import { ArrowRight } from "lucide-react";
import { QrPreview } from "@/components/qr-preview";
import { DEFAULT_QR_STYLE } from "@/lib/qr";

const ROWS = [
  { nama: "Mawar", famili: "Rosaceae", kode: "YUZ-MFHQ", active: true },
  { nama: "Melati", famili: "Oleaceae", kode: "K7M-2QX" },
  { nama: "Anggrek", famili: "Orchidaceae", kode: "R4T-9WN" },
];

/** Ilustrasi alur: tabel → QR → kartu hasil scan. */
export function HeroPreview() {
  return (
    <div className="relative rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
      />
      <div className="relative grid items-center gap-5 md:grid-cols-[1.25fr_auto_auto_auto_0.85fr]">
        {/* 1. Tabel */}
        <div className="overflow-hidden rounded-xl border bg-background text-left">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 border-b bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            <span>Nama</span>
            <span>Famili</span>
            <span>Kode</span>
          </div>
          {ROWS.map((r) => (
            <div
              key={r.kode}
              className={
                "grid grid-cols-[1fr_1fr_auto] gap-3 border-b px-3 py-2.5 text-sm last:border-0 " +
                (r.active ? "bg-brand/8" : "")
              }
            >
              <span className="font-medium">{r.nama}</span>
              <span className="text-muted-foreground">{r.famili}</span>
              <span className="font-mono text-xs text-muted-foreground">{r.kode}</span>
            </div>
          ))}
        </div>

        <ArrowRight className="mx-auto hidden size-4 text-muted-foreground md:block" />

        {/* 2. QR */}
        <div className="mx-auto rounded-xl border bg-white p-2 shadow-xs">
          <QrPreview value="https://tandai.app/r/YUZMFHQ" style={DEFAULT_QR_STYLE} size={112} />
        </div>

        <ArrowRight className="mx-auto hidden size-4 text-muted-foreground md:block" />

        {/* 3. Kartu hasil scan */}
        <div className="mx-auto w-full max-w-[200px] rounded-[22px] border-[5px] border-foreground/90 bg-background p-2 shadow-sm dark:border-foreground/70">
          <div className="h-16 rounded-xl bg-gradient-to-br from-emerald-400/70 to-emerald-700/70" />
          <div className="px-1.5 pt-2.5 pb-1.5 text-left">
            <div className="text-[10px] font-medium text-emerald-700 dark:text-brand">Tanaman</div>
            <div className="text-base leading-tight font-semibold">Mawar</div>
            <dl className="mt-2 space-y-1 text-[11px]">
              <div className="flex justify-between gap-2 border-t pt-1">
                <dt className="text-muted-foreground">Ordo</dt>
                <dd className="font-medium">Rosales</dd>
              </div>
              <div className="flex justify-between gap-2 border-t pt-1">
                <dt className="text-muted-foreground">Famili</dt>
                <dd className="font-medium">Rosaceae</dd>
              </div>
              <div className="flex justify-between gap-2 border-t pt-1">
                <dt className="text-muted-foreground">Jenis</dt>
                <dd className="font-medium">Rosa</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
