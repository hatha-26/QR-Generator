-- =====================================================================
-- 0003 — bucket gambar untuk kolom bertipe "Gambar"
--
-- Bucket bersifat publik: siapa pun yang tahu alamat gambarnya bisa membukanya,
-- termasuk gambar dari koleksi privat. Alamat berisi UUID acak sehingga tidak
-- bisa ditebak, tetapi jangan unggah gambar yang benar-benar rahasia.
-- Setiap user hanya boleh menulis ke folder miliknya: <user_id>/...
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'record-images',
  'record-images',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "record_images_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'record-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "record_images_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'record-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'record-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "record_images_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'record-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
