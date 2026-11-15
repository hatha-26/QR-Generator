import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CollectionWorkspace } from "@/components/collections/collection-workspace";
import { fetchAllRecords, fetchScanStats } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Collection, Field, ScanStats } from "@/lib/types";

export const metadata: Metadata = { title: "Koleksi" };

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: collection } = await supabase.from("collections").select("*").eq("id", id).maybeSingle();
  if (!collection) notFound();

  const [fieldsRes, records, scans] = await Promise.all([
    supabase.from("fields").select("*").eq("collection_id", id).order("sort_order").order("created_at"),
    fetchAllRecords(supabase, id),
    // View record_scan_counts dibuat oleh migrasi 0002; jangan gagalkan halaman bila belum ada.
    fetchScanStats(supabase, id).catch((): ScanStats => ({})),
  ]);

  return (
    <CollectionWorkspace
      initialCollection={collection as Collection}
      initialFields={(fieldsRes.data ?? []) as Field[]}
      initialRecords={records}
      scans={scans}
      userId={user.id}
    />
  );
}
