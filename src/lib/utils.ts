import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Kode pendek: 7 karakter, ditampilkan sebagai ABC-DEFG. */
export function formatCode(code: string) {
  return code.length === 7 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

/** Bersihkan input kode dari pengguna (huruf besar, tanpa spasi/strip). */
export function normalizeCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Buat key kolom yang stabil (snake_case) dari label, unik terhadap `taken`. */
export function slugKey(label: string, taken: Set<string>) {
  const base =
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || "kolom";
  const root = (/^[a-z]/.test(base) ? base : `k_${base}`).slice(0, 36);
  let key = root;
  let i = 2;
  while (taken.has(key)) {
    key = `${root}_${i++}`;
  }
  return key;
}

export function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

/** Nomor telepon → format internasional untuk wa.me (0812… → 62812…). */
export function normalizePhone(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(d);
}

export function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** Nama file aman dari teks bebas. */
export function safeFileName(value: string, fallback = "qr") {
  const s = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || fallback;
}

/** Hanya terima path internal untuk parameter ?next= (cegah open redirect). */
export function safeNext(value: string | null | undefined, fallback = "/app") {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

/** Judul sebuah record, diambil dari kolom judul (atau kolom teks pertama). */
export function recordTitle(
  data: Record<string, unknown>,
  titleKey: string | null,
  fallbackKeys: string[] = [],
) {
  const keys = titleKey ? [titleKey, ...fallbackKeys] : fallbackKeys;
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}
