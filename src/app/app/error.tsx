"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Terjadi kesalahan</h1>
      <p className="mt-1 mb-5 max-w-md text-sm text-muted-foreground">
        {error.message || "Data tidak bisa dimuat. Pastikan migrasi Supabase sudah dijalankan."}
      </p>
      <Button variant="outline" onClick={reset}>
        Coba lagi
      </Button>
    </div>
  );
}
