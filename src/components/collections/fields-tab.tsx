"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { FIELD_TYPE_LABELS, type Collection, type Field, type FieldType } from "@/lib/types";
import { slugKey } from "@/lib/utils";

interface Draft {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  optionsText: string;
  required: boolean;
  is_public: boolean;
  isNew: boolean;
}

const parseOptions = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const toDraft = (f: Field): Draft => ({
  id: f.id,
  key: f.key,
  label: f.label,
  type: f.type,
  optionsText: f.options.join(", "),
  required: f.required,
  is_public: f.is_public,
  isNew: false,
});

const signature = (drafts: Draft[]) =>
  JSON.stringify(drafts.map((d) => [d.id, d.label, d.type, parseOptions(d.optionsText), d.required, d.is_public]));

let newCounter = 0;

export function FieldsTab({
  collection,
  fields,
  setFields,
  onCollectionChange,
}: {
  collection: Collection;
  fields: Field[];
  setFields: (fields: Field[]) => void;
  onCollectionChange: (c: Collection) => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => fields.map(toDraft));
  const [busy, setBusy] = useState(false);

  const dirty = useMemo(() => signature(drafts) !== signature(fields.map(toDraft)), [drafts, fields]);

  const patch = (id: string, change: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...change } : d)));

  function add() {
    setDrafts((prev) => [
      ...prev,
      {
        id: `new-${++newCounter}`,
        key: "",
        label: "",
        type: "text",
        optionsText: "",
        required: false,
        is_public: true,
        isNew: true,
      },
    ]);
  }

  function move(index: number, dir: -1 | 1) {
    setDrafts((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  async function save() {
    if (drafts.some((d) => !d.label.trim())) {
      toast.error("Nama kolom tidak boleh kosong");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    let failed: string | null = null;

    try {
      const removed = fields.filter((f) => !drafts.some((d) => d.id === f.id));
      for (const f of removed) {
        const { error } = await supabase.from("fields").delete().eq("id", f.id);
        if (error) throw error;
      }

      const taken = new Set(drafts.filter((d) => !d.isNew).map((d) => d.key));
      for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i];
        const payload = {
          label: d.label.trim(),
          type: d.type,
          options: d.type === "select" ? parseOptions(d.optionsText) : [],
          required: d.required,
          is_public: d.is_public,
          sort_order: i,
        };
        if (d.isNew) {
          const key = slugKey(d.label, taken);
          taken.add(key);
          const { error } = await supabase.from("fields").insert({ collection_id: collection.id, key, ...payload });
          if (error) throw error;
        } else {
          const orig = fields.find((f) => f.id === d.id);
          const unchanged =
            orig &&
            orig.label === payload.label &&
            orig.type === payload.type &&
            orig.required === payload.required &&
            orig.is_public === payload.is_public &&
            orig.sort_order === payload.sort_order &&
            JSON.stringify(orig.options) === JSON.stringify(payload.options);
          if (unchanged) continue;
          const { error } = await supabase.from("fields").update(payload).eq("id", d.id);
          if (error) throw error;
        }
      }
    } catch (e) {
      failed = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Gagal menyimpan";
    }

    // Database adalah sumber kebenaran: muat ulang daftar kolom.
    const { data: fresh } = await supabase
      .from("fields")
      .select("*")
      .eq("collection_id", collection.id)
      .order("sort_order")
      .order("created_at");
    const saved = (fresh ?? []) as Field[];
    setFields(saved);
    setDrafts(saved.map(toDraft));

    // Bersihkan referensi ke kolom yang sudah dihapus.
    const keys = new Set(saved.map((f) => f.key));
    const cleanup: Partial<Collection> = {};
    if (collection.title_field_key && !keys.has(collection.title_field_key)) cleanup.title_field_key = null;
    if (collection.redirect_field_key && !keys.has(collection.redirect_field_key)) cleanup.redirect_field_key = null;
    if (Object.keys(cleanup).length > 0) {
      const { data: updated } = await supabase
        .from("collections")
        .update(cleanup)
        .eq("id", collection.id)
        .select("*")
        .single();
      if (updated) onCollectionChange(updated as Collection);
    }

    setBusy(false);
    if (failed) toast.error(failed);
    else toast.success("Kolom disimpan");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold tracking-tight">Kolom</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Menghapus kolom hanya menyembunyikannya; nilai yang sudah tersimpan di tiap baris tidak ikut terhapus.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {drafts.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Belum ada kolom.</p>
        )}
        {drafts.map((d, i) => (
          <div key={d.id} className="space-y-3 border-b px-3 py-3 last:border-0 sm:px-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
              <div className="flex flex-col">
                <Button variant="ghost" size="icon-sm" className="h-5" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Naikkan">
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" className="h-5" onClick={() => move(i, 1)} disabled={i === drafts.length - 1} aria-label="Turunkan">
                  <ArrowDown className="size-3.5" />
                </Button>
              </div>

              <Input
                value={d.label}
                onChange={(e) => patch(d.id, { label: e.target.value })}
                placeholder="Nama kolom"
                maxLength={80}
                aria-label="Nama kolom"
                className="min-w-40 flex-1"
              />

              <div className="w-44">
                <Select value={d.type} onValueChange={(v) => patch(d.id, { type: v as FieldType })}>
                  <SelectTrigger aria-label="Tipe kolom">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {FIELD_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={d.required} onCheckedChange={(c) => patch(d.id, { required: c })} />
                Wajib
              </label>
              <label
                className="flex items-center gap-2 text-sm text-muted-foreground"
                title="Tampilkan di halaman hasil scan"
              >
                <Switch checked={d.is_public} onCheckedChange={(c) => patch(d.id, { is_public: c })} />
                Tampil
              </label>

              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setDrafts((prev) => prev.filter((x) => x.id !== d.id))}
                aria-label="Hapus kolom"
              >
                <Trash2 />
              </Button>
            </div>

            {d.type === "select" && (
              <Input
                value={d.optionsText}
                onChange={(e) => patch(d.id, { optionsText: e.target.value })}
                placeholder="Pilihan, pisahkan dengan koma: Kosong, Terisi, Rusak"
                aria-label="Pilihan"
                className="ml-0 sm:ml-10"
              />
            )}
            {!d.isNew && (
              <p className="ml-0 font-mono text-[11px] text-muted-foreground/70 sm:ml-10">key: {d.key}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={add}>
          <Plus /> Tambah kolom
        </Button>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button variant="ghost" size="sm" onClick={() => setDrafts(fields.map(toDraft))} disabled={busy}>
              Batalkan
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={!dirty || busy}>
            {busy && <Loader2 className="animate-spin" />}
            Simpan perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}
