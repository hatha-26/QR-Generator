export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "url"
  | "phone"
  | "image";

export type CollectionMode = "display" | "redirect" | "action";
export type Visibility = "public" | "private";

export interface Collection {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  template: string | null;
  mode: CollectionMode;
  visibility: Visibility;
  title_field_key: string | null;
  redirect_field_key: string | null;
  action_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Field {
  id: string;
  collection_id: string;
  key: string;
  label: string;
  type: FieldType;
  options: string[];
  required: boolean;
  is_public: boolean;
  sort_order: number;
}

export interface RecordRow {
  id: string;
  collection_id: string;
  code: string;
  data: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScanStat {
  scans: number;
  last_scan: string | null;
}

export type ScanStats = Record<string, ScanStat>;

export interface PublicField {
  key: string;
  label: string;
  type: FieldType;
  value: unknown;
}

/** Hasil RPC public.resolve_code() */
export type ResolveResult =
  | { status: "not_found" | "inactive" | "forbidden" | "invalid_target" }
  | { status: "ok"; mode: "redirect"; redirect_url: string }
  | {
      status: "ok";
      mode: "display" | "action";
      collection: string;
      title: string | null;
      fields: PublicField[];
      action: Record<string, unknown> | null;
    };

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Teks",
  longtext: "Teks panjang",
  number: "Angka",
  date: "Tanggal",
  select: "Pilihan",
  checkbox: "Centang",
  url: "Tautan (URL)",
  phone: "Telepon / WhatsApp",
  image: "Gambar",
};

export const MODE_LABELS: Record<CollectionMode, string> = {
  display: "Kartu info",
  redirect: "Alihkan ke tautan",
  action: "Aksi",
};
