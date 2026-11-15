-- Tahap Pengaturan: preferensi di profil + bucket foto profil.
-- Aman dijalankan ulang.

alter table public.profiles
  add column if not exists weekly_target_hours smallint not null default 15
    check (weekly_target_hours between 1 and 80),
  -- 1 = Senin, 0 = Minggu
  add column if not exists week_starts_on      smallint not null default 1
    check (week_starts_on in (0, 1)),
  add column if not exists notif_deadline      boolean  not null default true,
  add column if not exists notif_daily         boolean  not null default true,
  add column if not exists notif_ai            boolean  not null default true;

-- Bucket publik untuk foto profil (maks 2 MB; hanya PNG/JPEG/WebP).
-- Setiap user hanya boleh menulis di folder bernama id-nya: avatars/<user_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
