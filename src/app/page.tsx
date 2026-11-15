import { Link2, Pencil, QrCode, Table2 } from "lucide-react";
import Link from "next/link";
import { CodeForm } from "@/components/code-form";
import { HeroPreview } from "@/components/hero-preview";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";

const FEATURES = [
  {
    icon: Table2,
    title: "Tabel sesukamu",
    text: "Tentukan kolomnya sendiri: nama, ordo, nomor loker, nomor WhatsApp. Atau mulai dari template.",
  },
  {
    icon: QrCode,
    title: "QR, link, atau kode",
    text: "Setiap baris otomatis punya QR, link pendek, dan kode yang bisa diketik kalau kamera tidak tersedia.",
  },
  {
    icon: Pencil,
    title: "Ubah tanpa cetak ulang",
    text: "QR hanya menunjuk ke kode. Perbarui isi atau tujuan kapan saja, label yang sudah ditempel tetap berlaku.",
  },
];

const USE_CASES = ["Tanaman", "Kontak WhatsApp", "Loker", "Tautan & Google Form", "Aset & inventaris"];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login?mode=signup">Mulai gratis</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
          <Badge variant="brand" className="mb-5 rounded-full px-3 py-1">
            <Link2 /> QR dinamis · tanpa cetak ulang
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
            Satu QR untuk setiap tanaman, loker, dan kontak.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
            Buat tabel sendiri, tiap baris langsung jadi QR. Orang yang memindai melihat kartu
            informasi yang rapi, dan kamu bisa memperbaruinya kapan saja.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login?mode=signup">Mulai gratis</Link>
            </Button>
            <CodeForm className="w-full max-w-sm" />
          </div>

          <div className="mx-auto mt-14 max-w-4xl">
            <HeroPreview />
          </div>
        </section>

        {/* Fitur */}
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border bg-card p-5 shadow-xs">
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg border bg-background">
                  <Icon className="size-[18px]" />
                </div>
                <h3 className="font-semibold tracking-tight">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Use case */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-4 pb-20 text-center sm:px-6">
          <p className="text-sm text-muted-foreground">Dipakai untuk</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {USE_CASES.map((u) => (
              <Badge key={u} variant="outline" className="rounded-full px-3 py-1 text-[13px] font-normal">
                {u}
              </Badge>
            ))}
            <Badge variant="muted" className="rounded-full px-3 py-1 text-[13px] font-normal">
              Presensi · segera
            </Badge>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground sm:px-6">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <span>Dibuat dengan Next.js & Supabase</span>
        </div>
      </footer>
    </div>
  );
}
