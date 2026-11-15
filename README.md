# Tandai — QR untuk apa saja

Buat tabel sendiri, tiap baris otomatis jadi QR. Orang yang memindai melihat kartu info
(atau langsung diarahkan ke sebuah link), dan kamu bisa mengubah isinya kapan saja tanpa cetak ulang.

Contoh pemakaian: label tanaman (nama, ordo, famili, jenis), kontak WhatsApp, nomor loker,
link Google Form. Nama aplikasi bisa diganti di `src/lib/config.ts`.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · komponen gaya shadcn/ui (Radix) ·
Supabase (Postgres, Auth, Storage, RLS) · qr-code-styling · fflate · papaparse

## Konsep

```
Workspace → Koleksi ("tabel") → Kolom → Baris → kode pendek 7 karakter → QR / link / ketik manual
```

- **QR berisi `{SITE_URL}/r/KODE`**, bukan datanya. Mengubah data atau tujuan tidak perlu cetak ulang.
- **Tiga jalur akses per baris:** QR, link pendek, dan kode (mis. `YUZ-MFHQ`) yang bisa diketik di halaman utama.
- **Mode koleksi:**
  - *Kartu info*: halaman rapi berisi kolom yang diatur "Tampil" (kolom lain tetap tersembunyi).
  - *Alihkan ke tautan*: scan langsung HTTP 307 ke URL di salah satu kolom (seperti Bitly).
  - *Aksi* (presensi, klaim loker): tabel `action_events` sudah disiapkan, UI-nya belum ada.
- Kolom bersifat dinamis: definisinya di tabel `fields`, nilainya di `records.data` (JSONB, kuncinya `fields.key`).
- Pengunjung anonim **tidak punya akses langsung ke tabel**; semuanya lewat fungsi `resolve_code()`
  yang hanya mengembalikan kolom publik dan menolak redirect selain `http(s)`.

## Setup

1. Buat project di [supabase.com](https://supabase.com).
2. Jalankan berurutan di **SQL Editor** (atau `supabase link` lalu `supabase db push`):
   `supabase/migrations/0001_init.sql` → `0002_scan_counts_and_backfill.sql` → `0003_storage_images.sql`
3. Supabase → **Authentication → URL Configuration**: isi *Site URL* (`http://localhost:3000`) dan tambahkan
   `http://localhost:3000/auth/callback` ke *Redirect URLs*. Untuk development, boleh matikan
   *Confirm email* di Authentication → Providers → Email supaya langsung bisa masuk setelah daftar.
4. `cp .env.example .env.local`, lalu isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   (Project Settings → API).
5. `npm install && npm run dev` → buka http://localhost:3000, daftar, buat koleksi pertama.

### Sebelum mencetak QR

Isi `NEXT_PUBLIC_SITE_URL` dengan domain produksi (mis. `https://tandai.example.com`) dan deploy dulu
(Vercel cocok). QR dari `localhost` hanya bisa dibuka di komputermu; aplikasi akan memperingatkan hal ini.
Di produksi, tambahkan juga domain tersebut ke Redirect URLs Supabase.

## Struktur

```
supabase/migrations/        skema, RLS, resolve_code(), view scan, bucket gambar
src/proxy.ts                menyegarkan sesi Supabase (pengganti middleware di Next 16)
src/app/page.tsx            landing + input kode
src/app/login               masuk / daftar
src/app/app                 dashboard koleksi, editor koleksi (/app/c/[id])
src/app/r/[code]            halaman scan publik (redirect atau kartu info)
src/components/collections  tabel data, form, QR dialog, impor CSV, editor kolom, pengaturan
src/components/ui           komponen dasar gaya shadcn (button, dialog, tabs, select, ...)
src/lib                     klien Supabase, template, util QR, ekspor ZIP
```

## Fitur yang sudah ada

Template (Tanaman, Kontak WhatsApp, Tautan, Loker, Kosong) · editor kolom (9 tipe, urutan, wajib, tampil) ·
tambah/ubah/hapus/nonaktifkan baris · unggah foto (diperkecil otomatis) · impor CSV · QR dengan pilihan warna dan
bentuk, unduh PNG/SVG · ekspor semua QR sebagai ZIP + `daftar-kode.csv` · statistik scan per baris ·
koleksi publik/privat · mode terang/gelap.

## Catatan penting

- **Gambar bersifat publik.** Bucket `record-images` publik; gambar dari koleksi privat tetap bisa dibuka bila
  alamatnya diketahui (berisi UUID acak). Jangan unggah gambar yang benar-benar rahasia.
- **Cache Components dimatikan** (`next.config.ts`) karena halaman `/r/[code]` harus memberi HTTP redirect
  sungguhan dan mencatat scan di setiap request.
- Bot pratinjau link (WhatsApp, Slack) yang membuka link `/r/...` ikut tercatat sebagai scan.
- Aksi/presensi dan peran anggota workspace (undang user lain) belum ada UI-nya; skemanya sudah siap.

## Skrip

`npm run dev` · `npm run build` · `npm run lint` · `npx tsc --noEmit`
