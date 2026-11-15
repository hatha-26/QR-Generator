-- =====================================================================
-- QR Collections — skema awal (Supabase / PostgreSQL 15+)
--
-- Alur konsep:
--   workspace → collection ("tabel") → fields (kolom) → records (baris)
--   tiap record punya `code` pendek  →  QR / link /r/{code} / ketik manual
--   tiap scan dicatat di `scans`
--
-- Mode collection:
--   display  : scan menampilkan kartu berisi field (tanaman, aset, produk)
--   redirect : scan langsung diarahkan ke URL di salah satu field (gaya Bitly)
--   action   : scan memicu aksi, mis. presensi / klaim loker (fase 3)
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
create type public.member_role as enum ('owner', 'editor', 'viewer');
create type public.collection_mode as enum ('display', 'redirect', 'action');
-- 'public'  : siapa saja yang punya kode/link bisa membuka
-- 'private' : hanya anggota workspace (harus login)
create type public.collection_visibility as enum ('public', 'private');
create type public.field_type as enum (
  'text', 'longtext', 'number', 'date', 'select', 'checkbox', 'url', 'phone', 'image'
);

-- ---------------------------------------------------------------------
-- Helper: updated_at
-- ---------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

-- ---------------------------------------------------------------------
-- WORKSPACE & ANGGOTA
-- ---------------------------------------------------------------------
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         public.member_role not null default 'editor',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

-- User baru otomatis mendapat workspace pribadi
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
begin
  insert into public.workspaces (name, created_by)
  values ('Personal', new.id)
  returning id into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws, new.id, 'owner');

  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- COLLECTION (= "tabel" buatan user)
-- ---------------------------------------------------------------------
create table public.collections (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 80),
  description        text,
  template           text,  -- 'plant' | 'contact' | 'locker' | 'attendance' | null (hanya penanda UI)
  mode               public.collection_mode not null default 'display',
  visibility         public.collection_visibility not null default 'public',
  title_field_key    text,  -- field yang jadi judul kartu publik
  redirect_field_key text,  -- field berisi URL tujuan (mode = redirect); divalidasi di aplikasi
  action_config      jsonb not null default '{}'::jsonb,  -- konfigurasi mode action (fase 3)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index collections_workspace_idx on public.collections (workspace_id);

create trigger collections_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- FIELD (kolom). `key` stabil agar ganti label tidak merusak data lama.
-- ---------------------------------------------------------------------
create table public.fields (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  key           text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label         text not null check (char_length(label) between 1 and 80),
  type          public.field_type not null default 'text',
  options       jsonb not null default '[]'::jsonb,  -- pilihan untuk tipe select
  required      boolean not null default false,
  is_public     boolean not null default true,       -- tampil di halaman publik?
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  unique (collection_id, key)
);

-- ---------------------------------------------------------------------
-- RECORD (baris). Nilai kolom disimpan di `data`, kuncinya = fields.key
-- ---------------------------------------------------------------------
create table public.records (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  -- 7 karakter, tanpa I/L/O/0/1 supaya tidak ambigu saat diketik manual
  code          text not null unique check (code ~ '^[A-HJKMNP-Z2-9]{7}$'),
  data          jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  is_active     boolean not null default true,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index records_collection_idx on public.records (collection_id, created_at desc);

create trigger records_updated_at
  before update on public.records
  for each row execute function public.set_updated_at();

-- Generator kode: acak kriptografis, diulang bila bentrok.
-- (31 karakter dari 256 nilai byte → bias sangat kecil, tidak masalah untuk ID publik.)
create function public.generate_record_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  alphabet  constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes     bytea;
  candidate text;
  i         int;
  attempts  int := 0;
begin
  if new.code is not null then
    return new;
  end if;

  loop
    bytes := extensions.gen_random_bytes(7);
    candidate := '';
    for i in 0..6 loop
      candidate := candidate || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
    end loop;

    exit when not exists (select 1 from public.records where code = candidate);

    attempts := attempts + 1;
    if attempts > 10 then
      raise exception 'could not generate a unique record code';
    end if;
  end loop;

  new.code := candidate;
  return new;
end
$$;

-- BEFORE INSERT: kolom `code` boleh dikosongkan saat insert (termasuk import CSV massal)
create trigger records_generate_code
  before insert on public.records
  for each row execute function public.generate_record_code();

-- ---------------------------------------------------------------------
-- LOG SCAN (statistik)
-- ---------------------------------------------------------------------
create table public.scans (
  id            bigint generated always as identity primary key,
  record_id     uuid not null references public.records (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  scanned_at    timestamptz not null default now(),
  user_agent    text,
  referrer      text,
  ip_hash       text  -- hash dari IP + salt, jangan simpan IP mentah
);
create index scans_record_idx on public.scans (record_id, scanned_at desc);
create index scans_collection_idx on public.scans (collection_id, scanned_at desc);

-- ---------------------------------------------------------------------
-- EVENT AKSI (fase 3: presensi, klaim/lepas loker, dst.)
-- ---------------------------------------------------------------------
create table public.action_events (
  id            bigint generated always as identity primary key,
  record_id     uuid not null references public.records (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  kind          text not null,  -- 'checkin' | 'claim' | 'release' | ...
  payload       jsonb not null default '{}'::jsonb,
  actor_id      uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index action_events_record_idx on public.action_events (record_id, created_at desc);

-- ---------------------------------------------------------------------
-- RLS — fungsi bantu (security definer agar tidak rekursif)
-- ---------------------------------------------------------------------
create function public.has_workspace_role(ws uuid, roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and m.role = any (roles)
  );
$$;

create function public.can_access_collection(col uuid, roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.collections c
    join public.workspace_members m on m.workspace_id = c.workspace_id
    where c.id = col
      and m.user_id = (select auth.uid())
      and m.role = any (roles)
  );
$$;

alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.collections       enable row level security;
alter table public.fields            enable row level security;
alter table public.records           enable row level security;
alter table public.scans             enable row level security;
alter table public.action_events     enable row level security;

-- Tidak ada policy untuk `anon`: pengunjung publik TIDAK bisa membaca tabel
-- secara langsung. Mereka hanya lewat fungsi resolve_code() di bawah.

-- workspaces
create policy workspaces_select on public.workspaces for select to authenticated
  using (public.has_workspace_role(id, '{owner,editor,viewer}'));
create policy workspaces_update on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, '{owner}'))
  with check (public.has_workspace_role(id, '{owner}'));
create policy workspaces_delete on public.workspaces for delete to authenticated
  using (public.has_workspace_role(id, '{owner}'));

-- workspace_members
create policy members_select on public.workspace_members for select to authenticated
  using (user_id = (select auth.uid()) or public.has_workspace_role(workspace_id, '{owner}'));
create policy members_insert on public.workspace_members for insert to authenticated
  with check (public.has_workspace_role(workspace_id, '{owner}'));
create policy members_update on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, '{owner}'))
  with check (public.has_workspace_role(workspace_id, '{owner}'));
create policy members_delete on public.workspace_members for delete to authenticated
  using (public.has_workspace_role(workspace_id, '{owner}'));

-- collections
create policy collections_select on public.collections for select to authenticated
  using (public.has_workspace_role(workspace_id, '{owner,editor,viewer}'));
create policy collections_insert on public.collections for insert to authenticated
  with check (public.has_workspace_role(workspace_id, '{owner,editor}'));
create policy collections_update on public.collections for update to authenticated
  using (public.has_workspace_role(workspace_id, '{owner,editor}'))
  with check (public.has_workspace_role(workspace_id, '{owner,editor}'));
create policy collections_delete on public.collections for delete to authenticated
  using (public.has_workspace_role(workspace_id, '{owner,editor}'));

-- fields
create policy fields_select on public.fields for select to authenticated
  using (public.can_access_collection(collection_id, '{owner,editor,viewer}'));
create policy fields_insert on public.fields for insert to authenticated
  with check (public.can_access_collection(collection_id, '{owner,editor}'));
create policy fields_update on public.fields for update to authenticated
  using (public.can_access_collection(collection_id, '{owner,editor}'))
  with check (public.can_access_collection(collection_id, '{owner,editor}'));
create policy fields_delete on public.fields for delete to authenticated
  using (public.can_access_collection(collection_id, '{owner,editor}'));

-- records
create policy records_select on public.records for select to authenticated
  using (public.can_access_collection(collection_id, '{owner,editor,viewer}'));
create policy records_insert on public.records for insert to authenticated
  with check (public.can_access_collection(collection_id, '{owner,editor}'));
create policy records_update on public.records for update to authenticated
  using (public.can_access_collection(collection_id, '{owner,editor}'))
  with check (public.can_access_collection(collection_id, '{owner,editor}'));
create policy records_delete on public.records for delete to authenticated
  using (public.can_access_collection(collection_id, '{owner,editor}'));

-- scans & action_events: anggota hanya boleh membaca; penulisan lewat fungsi security definer
create policy scans_select on public.scans for select to authenticated
  using (public.can_access_collection(collection_id, '{owner,editor,viewer}'));
create policy action_events_select on public.action_events for select to authenticated
  using (public.can_access_collection(collection_id, '{owner,editor,viewer}'));

-- ---------------------------------------------------------------------
-- resolve_code(): satu-satunya pintu masuk publik.
-- Dipanggil dari route Next.js /r/[code] (RPC). Mengembalikan jsonb:
--   { status: 'ok' | 'not_found' | 'inactive' | 'forbidden' | 'invalid_target', ... }
-- Redirect hanya untuk URL http(s) — menolak javascript:, data:, dst.
-- ---------------------------------------------------------------------
create function public.resolve_code(
  p_code       text,
  p_user_agent text default null,
  p_referrer   text default null,
  p_ip_hash    text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code   text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  r        public.records;
  c        public.collections;
  v_target text;
  v_fields jsonb;
begin
  select * into r from public.records where code = v_code;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into c from public.collections where id = r.collection_id;

  if not r.is_active then
    return jsonb_build_object('status', 'inactive');
  end if;

  if c.visibility = 'private'
     and not public.can_access_collection(c.id, '{owner,editor,viewer}') then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if c.mode = 'redirect' then
    v_target := r.data ->> c.redirect_field_key;
    if v_target is null or v_target !~* '^https?://' then
      return jsonb_build_object('status', 'invalid_target');
    end if;

    insert into public.scans (record_id, collection_id, user_agent, referrer, ip_hash)
    values (r.id, c.id, p_user_agent, p_referrer, p_ip_hash);

    return jsonb_build_object('status', 'ok', 'mode', 'redirect', 'redirect_url', v_target);
  end if;

  -- display / action: kembalikan field yang boleh tampil
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'key',   f.key,
               'label', f.label,
               'type',  f.type,
               'value', r.data -> f.key
             )
             order by f.sort_order
           ),
           '[]'::jsonb)
    into v_fields
    from public.fields f
   where f.collection_id = c.id
     and (f.is_public or c.visibility = 'private');

  insert into public.scans (record_id, collection_id, user_agent, referrer, ip_hash)
  values (r.id, c.id, p_user_agent, p_referrer, p_ip_hash);

  return jsonb_build_object(
    'status',     'ok',
    'mode',       c.mode,
    'collection', c.name,
    'title',      r.data ->> c.title_field_key,
    'fields',     v_fields,
    'action',     case when c.mode = 'action' then c.action_config else null end
  );
end
$$;

revoke all on function public.resolve_code(text, text, text, text) from public;
grant execute on function public.resolve_code(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- CONTOH (jangan dijalankan di produksi; hanya gambaran data)
--
-- Collection "Tanaman Kebun", mode display:
--   insert into public.collections (workspace_id, name, template, title_field_key)
--     values ('<ws-id>', 'Tanaman Kebun', 'plant', 'nama');
--   insert into public.fields (collection_id, key, label, type, sort_order) values
--     ('<col-id>', 'nama',   'Nama',   'text', 0),
--     ('<col-id>', 'ordo',   'Ordo',   'text', 1),
--     ('<col-id>', 'famili', 'Famili', 'text', 2),
--     ('<col-id>', 'jenis',  'Jenis',  'text', 3);
--   insert into public.records (collection_id, data)       -- `code` terisi otomatis
--     values ('<col-id>', '{"nama":"Mawar","ordo":"Rosales","famili":"Rosaceae","jenis":"Rosa"}');
--
-- Pemakaian dari Next.js (route /r/[code]):
--   const { data } = await supabase.rpc('resolve_code', { p_code: code, ... })
-- ---------------------------------------------------------------------
