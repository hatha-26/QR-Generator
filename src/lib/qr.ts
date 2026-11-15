"use client";

import type QRCodeStyling from "qr-code-styling";
import { useCallback, useState } from "react";

export type QrDots = "square" | "rounded" | "dots";

export interface QrStyle {
  color: string;
  dots: QrDots;
}

export const DEFAULT_QR_STYLE: QrStyle = { color: "#0a0a0a", dots: "square" };

export const QR_COLORS = [
  { value: "#0a0a0a", label: "Hitam" },
  { value: "#065f46", label: "Hijau" },
  { value: "#1e3a8a", label: "Biru" },
  { value: "#4c1d95", label: "Ungu" },
  { value: "#9f1239", label: "Merah" },
];

export const QR_DOTS: { value: QrDots; label: string }[] = [
  { value: "square", label: "Kotak" },
  { value: "rounded", label: "Membulat" },
  { value: "dots", label: "Titik" },
];

const STORAGE_KEY = "tandai:qr-style";

function readStoredStyle(): QrStyle {
  if (typeof window === "undefined") return DEFAULT_QR_STYLE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QR_STYLE;
    const parsed = JSON.parse(raw) as Partial<QrStyle>;
    return {
      color: QR_COLORS.some((c) => c.value === parsed.color)
        ? (parsed.color as string)
        : DEFAULT_QR_STYLE.color,
      dots: QR_DOTS.some((d) => d.value === parsed.dots)
        ? (parsed.dots as QrDots)
        : DEFAULT_QR_STYLE.dots,
    };
  } catch {
    return DEFAULT_QR_STYLE;
  }
}

/** Gaya QR yang diingat di browser (dipakai dialog QR dan ekspor ZIP). */
export function useQrStyle(): [QrStyle, (style: QrStyle) => void] {
  const [style, setStyle] = useState<QrStyle>(readStoredStyle);
  const update = useCallback((next: QrStyle) => {
    setStyle(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* penyimpanan tidak tersedia: abaikan */
    }
  }, []);
  return [style, update];
}

async function loadQrCtor(): Promise<typeof QRCodeStyling> {
  const mod = (await import("qr-code-styling")) as unknown as {
    default: typeof QRCodeStyling | { default: typeof QRCodeStyling };
  };
  const d = mod.default;
  return (typeof d === "function" ? d : d.default) as typeof QRCodeStyling;
}

export async function createQr(
  data: string,
  style: QrStyle,
  size: number,
  type: "canvas" | "svg" = "canvas",
) {
  const QR = await loadQrCtor();
  const cornerSquare =
    style.dots === "square" ? "square" : style.dots === "dots" ? "dot" : "extra-rounded";
  return new QR({
    width: size,
    height: size,
    type,
    data,
    margin: Math.round(size * 0.04),
    qrOptions: { errorCorrectionLevel: "Q" },
    backgroundOptions: { color: "#ffffff" },
    dotsOptions: { color: style.color, type: style.dots },
    cornersSquareOptions: { color: style.color, type: cornerSquare },
    cornersDotOptions: {
      color: style.color,
      type: style.dots === "square" ? "square" : "dot",
    },
  });
}

export async function qrBlob(
  data: string,
  style: QrStyle,
  ext: "png" | "svg",
  size = 1024,
): Promise<Blob> {
  const qr = await createQr(data, style, size, ext === "svg" ? "svg" : "canvas");
  const raw = await qr.getRawData(ext);
  if (!raw) throw new Error("Gagal membuat gambar QR");
  return raw as Blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Alamat dasar untuk link QR. Set NEXT_PUBLIC_SITE_URL di produksi. */
export function getOrigin() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function publicUrl(code: string) {
  return `${getOrigin()}/r/${code}`;
}

export function isLocalOrigin(origin: string) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|\.local(:|\/|$)/i.test(origin);
}
