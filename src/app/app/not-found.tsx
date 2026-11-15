import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Koleksi tidak ditemukan</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Koleksinya mungkin sudah dihapus, atau kamu tidak punya akses.
      </p>
      <Button asChild variant="outline">
        <Link href="/app">Kembali ke koleksi</Link>
      </Button>
    </div>
  );
}
