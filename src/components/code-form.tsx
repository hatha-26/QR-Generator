"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeCode } from "@/lib/utils";

/** Jalur alternatif QR: ketik kode pendek secara manual. */
export function CodeForm({ className }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const code = normalizeCode(value);
    if (code) router.push(`/r/${code}`);
  }

  return (
    <form onSubmit={submit} className={className}>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Punya kode? mis. YUZ-MFHQ"
          aria-label="Kode"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="h-11 font-mono tracking-wider uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
        />
        <Button type="submit" size="lg" variant="outline" disabled={!normalizeCode(value)}>
          Buka <ArrowRight />
        </Button>
      </div>
    </form>
  );
}
