"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Collection, Field, RecordRow } from "@/lib/types";

const NONE = "__none__";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function isEmpty(v: unknown) {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

/** Perkecil foto dari kamera (maks 1600px, JPEG) supaya hemat kuota dan cepat dibuka. */
async function shrinkImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function ImageField({
  value,
  onChange,
  userId,
  collectionId,
}: {
  value: string;
  onChange: (url: string) => void;
  userId: string;
  collectionId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    setBusy(true);
    try {
      const blob = await shrinkImage(file);
      if (blob.size > MAX_IMAGE_BYTES) {
        toast.error("Ukuran gambar maksimal 5 MB");
        return;
      }
      const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "img").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "img";
      const path = `${userId}/${collectionId}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("record-images")
        .upload(path, blob, { cacheControl: "31536000", contentType: blob.type || file.type });
      if (error) {
        toast.error(`Gagal mengunggah: ${error.message}`);
        return;
      }
      onChange(supabase.storage.from("record-images").getPublicUrl(path).data.publicUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {value ? "Ganti" : "Unggah"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} disabled={busy}>
            <Trash2 /> Hapus
          </Button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}

export function RecordFormDialog({
  open,
  onOpenChange,
  collection,
  fields,
  record,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: Collection;
  fields: Field[];
  record: RecordRow | null;
  userId: string;
  onSaved: (row: RecordRow, isNew: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...(record?.data ?? {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, v: unknown) => setValues((prev) => ({ ...prev, [key]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const data: Record<string, unknown> = { ...(record?.data ?? {}) };
    for (const f of fields) {
      const v = values[f.key];
      if (f.type === "checkbox") {
        data[f.key] = Boolean(v);
        continue;
      }
      if (isEmpty(v)) {
        if (f.required) {
          setError(`${f.label} wajib diisi`);
          return;
        }
        delete data[f.key];
        continue;
      }
      if (f.type === "number") {
        const n = Number(String(v).replace(",", "."));
        if (Number.isNaN(n)) {
          setError(`${f.label} harus berupa angka`);
          return;
        }
        data[f.key] = n;
      } else {
        data[f.key] = typeof v === "string" ? v.trim() : v;
      }
    }

    setBusy(true);
    const supabase = createClient();
    const query = record
      ? supabase.from("records").update({ data }).eq("id", record.id)
      : supabase.from("records").insert({ collection_id: collection.id, data, created_by: userId });
    const { data: row, error: err } = await query.select("*").single();
    setBusy(false);

    if (err || !row) {
      setError(err?.message ?? "Gagal menyimpan");
      return;
    }
    onSaved(row as RecordRow, !record);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{record ? "Ubah data" : "Tambah data"}</DialogTitle>
          <DialogDescription>
            {record ? "Perubahan langsung berlaku di halaman hasil scan." : "Kode dan QR dibuat otomatis setelah disimpan."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {fields.length === 0 && (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              Belum ada kolom. Tambahkan kolom dulu di tab Kolom.
            </p>
          )}

          {fields.map((f) => {
            const id = `f-${f.key}`;
            const v = values[f.key];
            return (
              <div key={f.id} className="space-y-2">
                <Label htmlFor={id}>
                  {f.label}
                  {f.required && <span className="text-destructive">*</span>}
                </Label>

                {f.type === "longtext" && (
                  <Textarea id={id} value={(v as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                )}
                {f.type === "select" && (
                  <Select
                    value={typeof v === "string" ? v : ""}
                    onValueChange={(val) => set(f.key, val === NONE ? "" : val)}
                  >
                    <SelectTrigger id={id}>
                      <SelectValue placeholder="Pilih…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Kosongkan —</SelectItem>
                      {f.options.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {f.type === "checkbox" && (
                  <div className="flex items-center gap-2">
                    <Switch id={id} checked={Boolean(v)} onCheckedChange={(c) => set(f.key, c)} />
                    <span className="text-sm text-muted-foreground">{v ? "Ya" : "Tidak"}</span>
                  </div>
                )}
                {f.type === "image" && (
                  <ImageField
                    value={(v as string) ?? ""}
                    onChange={(url) => set(f.key, url)}
                    userId={userId}
                    collectionId={collection.id}
                  />
                )}
                {["text", "number", "date", "url", "phone"].includes(f.type) && (
                  <Input
                    id={id}
                    type={
                      f.type === "date" ? "date" : f.type === "url" ? "url" : f.type === "phone" ? "tel" : "text"
                    }
                    inputMode={f.type === "number" ? "decimal" : undefined}
                    placeholder={
                      f.type === "url" ? "https://…" : f.type === "phone" ? "0812 3456 7890" : undefined
                    }
                    value={(v as string | number | undefined) ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </div>
            );
          })}

          {error && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy || fields.length === 0}>
              {busy && <Loader2 className="animate-spin" />}
              {record ? "Simpan perubahan" : "Simpan & buat QR"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
