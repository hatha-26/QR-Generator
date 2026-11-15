"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TemplateIcon } from "@/components/template-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";

export function NewCollectionDialog({
  workspaceId,
  label = "Koleksi baru",
  variant = "default",
}: {
  workspaceId: string;
  label?: string;
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState("plant");
  const [name, setName] = useState("Tanaman");
  const [nameTouched, setNameTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  function pick(id: string) {
    setTemplateId(id);
    if (!nameTouched) setName(TEMPLATES.find((t) => t.id === id)?.name ?? "");
  }

  async function create() {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template || template.soon || !name.trim()) return;
    setBusy(true);
    const supabase = createClient();

    const { data: col, error } = await supabase
      .from("collections")
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        template: template.id,
        mode: template.mode,
        title_field_key: template.titleKey,
        redirect_field_key: template.redirectKey ?? null,
      })
      .select("id")
      .single();

    if (error || !col) {
      toast.error(error?.message ?? "Gagal membuat koleksi");
      setBusy(false);
      return;
    }

    const { error: fieldsError } = await supabase.from("fields").insert(
      template.fields.map((f, i) => ({
        collection_id: col.id,
        key: f.key,
        label: f.label,
        type: f.type,
        required: Boolean(f.required),
        is_public: f.is_public ?? true,
        options: f.options ?? [],
        sort_order: i,
      })),
    );
    if (fieldsError) {
      await supabase.from("collections").delete().eq("id", col.id);
      toast.error(fieldsError.message);
      setBusy(false);
      return;
    }

    setOpen(false);
    router.push(`/app/c/${col.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Koleksi baru</DialogTitle>
          <DialogDescription>
            Pilih template sebagai titik awal. Kolomnya bisa diubah kapan saja.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {TEMPLATES.map((t) => {
            const selected = t.id === templateId;
            return (
              <button
                key={t.id}
                type="button"
                disabled={t.soon}
                onClick={() => pick(t.id)}
                aria-pressed={selected}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                  selected ? "border-foreground bg-accent/60" : "hover:bg-accent/40",
                  t.soon && "cursor-not-allowed opacity-55 hover:bg-transparent",
                )}
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                  <TemplateIcon icon={t.icon} className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {t.name}
                    {t.soon && <Badge variant="muted">Segera</Badge>}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">{t.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <Label htmlFor="collection-name">Nama koleksi</Label>
          <Input
            id="collection-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
            placeholder="mis. Tanaman Kebun Belakang"
            maxLength={80}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Batal
          </Button>
          <Button onClick={create} disabled={busy || !name.trim()}>
            {busy && <Loader2 className="animate-spin" />}
            Buat koleksi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
