import Link from "next/link";
import { QrCode } from "lucide-react";
import { APP_NAME } from "@/lib/config";

/** Kerangka halaman publik: sederhana, ramah HP, tanpa navigasi. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <main className="flex w-full flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="pb-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex size-4 items-center justify-center rounded bg-brand text-brand-foreground">
            <QrCode className="size-2.5" strokeWidth={2.5} />
          </span>
          Dibuat dengan {APP_NAME}
        </Link>
      </footer>
    </div>
  );
}
