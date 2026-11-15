import type { CollectionMode, FieldType } from "./types";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  is_public?: boolean;
  options?: string[];
}

export type TemplateIcon =
  | "sprout"
  | "contact"
  | "link"
  | "locker"
  | "attendance"
  | "blank";

export interface CollectionTemplate {
  id: string;
  name: string;
  description: string;
  icon: TemplateIcon;
  mode: CollectionMode;
  titleKey: string | null;
  redirectKey?: string | null;
  fields: TemplateField[];
  soon?: boolean;
}

export const TEMPLATES: CollectionTemplate[] = [
  {
    id: "plant",
    name: "Tanaman",
    description: "Nama, ordo, famili, jenis, foto, dan keterangan.",
    icon: "sprout",
    mode: "display",
    titleKey: "nama",
    fields: [
      { key: "foto", label: "Foto", type: "image" },
      { key: "nama", label: "Nama", type: "text", required: true },
      { key: "nama_latin", label: "Nama latin", type: "text" },
      { key: "ordo", label: "Ordo", type: "text" },
      { key: "famili", label: "Famili", type: "text" },
      { key: "jenis", label: "Jenis", type: "text" },
      { key: "keterangan", label: "Keterangan", type: "longtext" },
    ],
  },
  {
    id: "contact",
    name: "Kontak WhatsApp",
    description: "Kartu kontak dengan tombol chat WhatsApp.",
    icon: "contact",
    mode: "display",
    titleKey: "nama",
    fields: [
      { key: "nama", label: "Nama", type: "text", required: true },
      { key: "jabatan", label: "Jabatan / peran", type: "text" },
      { key: "whatsapp", label: "Nomor WhatsApp", type: "phone", required: true },
      { key: "email", label: "Email", type: "text" },
    ],
  },
  {
    id: "link",
    name: "Tautan",
    description: "Scan langsung menuju link, misalnya Google Form.",
    icon: "link",
    mode: "redirect",
    titleKey: "judul",
    redirectKey: "url",
    fields: [
      { key: "judul", label: "Judul", type: "text", required: true },
      { key: "url", label: "Tautan tujuan", type: "url", required: true },
    ],
  },
  {
    id: "locker",
    name: "Loker",
    description: "Nomor loker, lokasi, pemilik, dan status.",
    icon: "locker",
    mode: "display",
    titleKey: "nomor",
    fields: [
      { key: "nomor", label: "Nomor loker", type: "text", required: true },
      { key: "lokasi", label: "Lokasi", type: "text" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Kosong", "Terisi", "Rusak"],
      },
      { key: "pemilik", label: "Pemilik", type: "text" },
      { key: "catatan", label: "Catatan", type: "longtext", is_public: false },
    ],
  },
  {
    id: "attendance",
    name: "Presensi",
    description: "Scan untuk mencatat kehadiran peserta.",
    icon: "attendance",
    mode: "action",
    titleKey: null,
    fields: [],
    soon: true,
  },
  {
    id: "blank",
    name: "Kosong",
    description: "Mulai dari nol, tentukan kolom sendiri.",
    icon: "blank",
    mode: "display",
    titleKey: "nama",
    fields: [{ key: "nama", label: "Nama", type: "text", required: true }],
  },
];

export function getTemplate(id: string | null | undefined) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}
