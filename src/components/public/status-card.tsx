import { Ban, Link2Off, Lock, SearchX, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { CodeForm } from "@/components/code-form";
import { Button } from "@/components/ui/button";

type Kind = "not_found" | "inactive" | "forbidden" | "invalid_target" | "error";

const COPY: Record<Kind, { icon: typeof Lock; title: string; text: string }> = {
  not_found: {
    icon: SearchX,
    title: "Kode tidak ditemukan",
    text: "Periksa lagi kodenya. Huruf I, L, O dan angka 0, 1 tidak dipakai.",
  },
  inactive: {
    icon: Ban,
    title: "QR ini dinonaktifkan",
    text: "Pemiliknya sedang menonaktifkan QR ini. Coba lagi nanti.",
  },
  forbidden: {
    icon: Lock,
    title: "Halaman ini privat",
    text: "Masuk dengan akun yang punya akses untuk melihatnya.",
  },
  invalid_target: {
    icon: Link2Off,
    title: "Tautan tujuan tidak valid",
    text: "QR ini belum diatur dengan benar. Hubungi pemiliknya.",
  },
  error: {
    icon: TriangleAlert,
    title: "Terjadi kendala",
    text: "Halaman tidak bisa dimuat sekarang. Coba lagi sebentar lagi.",
  },
};

export function StatusCard({ kind, code }: { kind: Kind; code?: string }) {
  const { icon: Icon, title, text } = COPY[kind];
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border bg-background">
        <Icon className="size-5" />
      </div>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">{text}</p>
      {kind === "not_found" && <CodeForm className="mt-6" />}
      {kind === "forbidden" && code && (
        <Button asChild className="mt-6">
          <Link href={`/login?next=${encodeURIComponent(`/r/${code}`)}`}>Masuk</Link>
        </Button>
      )}
    </div>
  );
}
