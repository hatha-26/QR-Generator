"use client";

import { useEffect, useRef } from "react";
import { createQr, type QrStyle } from "@/lib/qr";
import { cn } from "@/lib/utils";

/** Pratinjau QR (dirender oleh qr-code-styling di browser). */
export function QrPreview({
  value,
  style,
  size = 220,
  className,
}: {
  value: string;
  style: QrStyle;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const qr = await createQr(value, style, size, "svg");
      if (cancelled || !ref.current) return;
      ref.current.replaceChildren();
      qr.append(ref.current);
    })();
    return () => {
      cancelled = true;
    };
  }, [value, style, size]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Pratinjau kode QR"
      className={cn("overflow-hidden rounded-lg bg-white", className)}
      style={{ width: size, height: size }}
    />
  );
}
