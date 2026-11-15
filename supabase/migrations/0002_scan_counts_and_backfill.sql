-- =====================================================================
-- 0002 — jumlah scan per record + backfill workspace untuk user lama
-- =====================================================================

-- View jumlah scan. security_invoker = true → RLS tabel `scans` tetap berlaku,
-- jadi tiap user hanya melihat angka milik koleksinya sendiri.
create view public.record_scan_counts
with (security_invoker = true) as
select
  collection_id,
  record_id,
  count(*)::int      as scans,
  max(scanned_at)    as last_scan
from public.scans
group by collection_id, record_id;

revoke all on public.record_scan_counts from anon;
grant select on public.record_scan_counts to authenticated;

-- Backfill: user yang mendaftar sebelum 0001 dijalankan belum punya workspace.
-- Aman dijalankan berulang (hanya menyentuh user tanpa keanggotaan).
do $$
declare
  u  record;
  ws uuid;
begin
  for u in
    select x.id
    from auth.users x
    where not exists (
      select 1 from public.workspace_members m where m.user_id = x.id
    )
  loop
    insert into public.workspaces (name, created_by)
    values ('Personal', u.id)
    returning id into ws;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (ws, u.id, 'owner');
  end loop;
end
$$;
