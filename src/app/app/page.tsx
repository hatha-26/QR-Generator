import { Eye, Lock, QrCode } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewCollectionDialog } from "@/components/collections/new-collection-dialog";
import { TemplateIcon } from "@/components/template-icon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { MODE_LABELS, type Collection } from "@/lib/types";

export const metadata: Metadata = { title: "Koleksi" };

type CollectionWithCount = Collection & { records: { count: number }[] };

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: ws }, { data: cols, error }] = await Promise.all([
    supabase.from("workspaces").select("id, name").order("created_at").limit(1).maybeSingle(),
    supabase.from("collections").select("*, records(count)").order("created_at", { ascending: false }),
  ]);

  const collections = (cols ?? []) as unknown as CollectionWithCount[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Koleksi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Satu koleksi = satu tabel. Setiap baris di dalamnya punya QR sendiri.
          </p>
        </div>
        {ws && <NewCollectionDialog workspaceId={ws.id} />}
      </div>

      {error && (
        <Card className="border-destructive/30 px-5 py-4 text-sm">
          <p className="font-medium text-destructive">Gagal memuat koleksi</p>
          <p className="mt-1 text-muted-foreground">
            {error.message}. Pastikan semua file di <code className="font-mono">supabase/migrations</code> sudah
            dijalankan.
          </p>
        </Card>
      )}

      {!error && !ws && (
        <Card className="px-5 py-4 text-sm">
          <p className="font-medium">Workspace belum ada untuk akun ini</p>
          <p className="mt-1 text-muted-foreground">
            Jalankan migrasi <code className="font-mono">0002_scan_counts_and_backfill.sql</code> di SQL Editor
            Supabase, lalu muat ulang halaman ini.
          </p>
        </Card>
      )}

      {!error && ws && collections.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
          <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-card">
            <QrCode className="size-5" />
          </div>
          <h2 className="font-semibold tracking-tight">Belum ada koleksi</h2>
          <p className="mt-1 mb-5 max-w-sm text-sm text-muted-foreground">
            Mulai dari template seperti Tanaman atau Kontak WhatsApp, atau buat dari nol.
          </p>
          <NewCollectionDialog workspaceId={ws.id} label="Buat koleksi pertama" />
        </div>
      )}

      {collections.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/app/c/${c.id}`}
              className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <Card className="h-full gap-3 px-5 transition-colors group-hover:border-foreground/25 group-hover:bg-accent/30">
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                    <TemplateIcon templateId={c.template} className="size-[18px]" />
                  </span>
                  <span className="text-muted-foreground" title={c.visibility === "public" ? "Publik" : "Privat"}>
                    {c.visibility === "public" ? <Eye className="size-4" /> : <Lock className="size-4" />}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold tracking-tight">{c.name}</h3>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                    {c.description || "Tanpa deskripsi"}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-2 pt-1">
                  <Badge variant="outline">{MODE_LABELS[c.mode]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {c.records?.[0]?.count ?? 0} QR
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
