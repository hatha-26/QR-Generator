"use client";

import { Eye, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Collection, CollectionMode, Field, Visibility } from "@/lib/types";
import { cn } from "@/lib/utils";

const NONE = "__none__";

function Choice({
  selected,
  disabled,
  onClick,
  title,
  text,
  icon,
  soon,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  text: string;
  icon?: React.ReactNode;
  soon?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
        selected ? "border-foreground bg-accent/60" : "hover:bg-accent/40",
        disabled && "cursor-not-allowed opacity-55 hover:bg-transparent",
      )}
    >
      {icon && (
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-background">
          {icon}
        </span>
      )}
      <span>
        <span className="flex items-center gap-2 text-sm font-medium">
          {title}
          {soon && <Badge variant="muted">Segera</Badge>}
        </span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}

export function SettingsTab({
  collection,
  fields,
  onChange,
}: {
  collection: Collection;
  fields: Field[];
  onChange: (c: Collection) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");
  const [mode, setMode] = useState<CollectionMode>(collection.mode);
  const [visibility, setVisibility] = useState<Visibility>(collection.visibility);
  const [titleKey, setTitleKey] = useState(collection.title_field_key ?? "");
  const [redirectKey, setRedirectKey] = useState(collection.redirect_field_key ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const urlFields = fields.filter((f) => f.type === "url");
  const dirty =
    name !== collection.name ||
    description !== (collection.description ?? "") ||
    mode !== collection.mode ||
    visibility !== collection.visibility ||
    titleKey !== (collection.title_field_key ?? "") ||
    redirectKey !== (collection.redirect_field_key ?? "");

  async function save() {
    if (!name.trim()) {
      toast.error("Nama koleksi tidak boleh kosong");
      return;
    }
    if (mode === "redirect" && !redirectKey) {
      toast.error("Pilih kolom yang berisi tautan tujuan");
      return;
    }
    setBusy(true);
    const { data, error } = await createClient()
      .from("collections")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        mode,
        visibility,
        title_field_key: titleKey || null,
        redirect_field_key: mode === "redirect" ? redirectKey || null : collection.redirect_field_key,
      })
      .eq("id", collection.id)
      .select("*")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Gagal menyimpan");
      return;
    }
    onChange(data as Collection);
    toast.success("Pengaturan disimpan");
  }

  async function remove() {
    const { error } = await createClient().from("collections").delete().eq("id", collection.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success("Koleksi dihapus");
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="s-name">Nama koleksi</Label>
          <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-desc">Deskripsi</Label>
          <Textarea
            id="s-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opsional"
            className="min-h-16"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Saat QR dipindai</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Apa yang terjadi pada orang yang memindai.</p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Choice
            selected={mode === "display"}
            onClick={() => setMode("display")}
            title="Tampilkan kartu info"
            text="Halaman rapi berisi kolom-kolom yang tampil."
          />
          <Choice
            selected={mode === "redirect"}
            onClick={() => setMode("redirect")}
            title="Alihkan ke tautan"
            text="Langsung menuju link, misalnya Google Form."
          />
        </div>

        {mode === "redirect" && (
          <div className="space-y-2 pt-1">
            <Label>Kolom tautan tujuan</Label>
            {urlFields.length > 0 ? (
              <Select value={redirectKey} onValueChange={setRedirectKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kolom bertipe Tautan" />
                </SelectTrigger>
                <SelectContent>
                  {urlFields.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Belum ada kolom bertipe Tautan (URL). Tambahkan dulu di tab Kolom.
              </p>
            )}
          </div>
        )}

        {mode === "display" && (
          <div className="space-y-2 pt-1">
            <Label>Kolom judul kartu</Label>
            <Select value={titleKey || NONE} onValueChange={(v) => setTitleKey(v === NONE ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Otomatis (kolom teks pertama)</SelectItem>
                {fields
                  .filter((f) => f.type === "text")
                  .map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Siapa yang bisa membuka</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Gambar yang diunggah tetap bisa dibuka lewat alamat langsungnya, bahkan di koleksi privat.
          </p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Choice
            selected={visibility === "public"}
            onClick={() => setVisibility("public")}
            icon={<Eye className="size-4" />}
            title="Publik"
            text="Siapa saja yang punya QR atau kodenya."
          />
          <Choice
            selected={visibility === "private"}
            onClick={() => setVisibility("private")}
            icon={<Lock className="size-4" />}
            title="Privat"
            text="Hanya anggota workspace yang sudah masuk."
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!dirty || busy}>
          {busy && <Loader2 className="animate-spin" />}
          Simpan pengaturan
        </Button>
      </div>

      <section className="rounded-xl border border-destructive/30 p-4">
        <h3 className="text-sm font-medium text-destructive">Zona berbahaya</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Menghapus koleksi juga menghapus semua data, QR, dan riwayat scan di dalamnya.
        </p>
        <Button variant="destructive" size="sm" className="mt-3" onClick={() => setConfirmDelete(true)}>
          Hapus koleksi
        </Button>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Hapus “${collection.name}”?`}
        description="Semua QR di koleksi ini akan berhenti berfungsi. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus koleksi"
        onConfirm={remove}
      />
    </div>
  );
}
