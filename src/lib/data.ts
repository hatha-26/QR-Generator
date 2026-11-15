import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecordRow, ScanStats } from "./types";

const PAGE = 1000;
const MAX_ROWS = 20000;

/** Ambil semua record sebuah koleksi (PostgREST membatasi 1000 baris per request). */
export async function fetchAllRecords(
  supabase: SupabaseClient,
  collectionId: string,
): Promise<RecordRow[]> {
  const out: RecordRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as RecordRow[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** Jumlah scan per record (view record_scan_counts). */
export async function fetchScanStats(
  supabase: SupabaseClient,
  collectionId: string,
): Promise<ScanStats> {
  const stats: ScanStats = {};
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from("record_scan_counts")
      .select("record_id, scans, last_scan")
      .eq("collection_id", collectionId)
      .order("record_id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      stats[row.record_id as string] = {
        scans: Number(row.scans),
        last_scan: (row.last_scan as string | null) ?? null,
      };
    }
    if (!data || data.length < PAGE) break;
  }
  return stats;
}
