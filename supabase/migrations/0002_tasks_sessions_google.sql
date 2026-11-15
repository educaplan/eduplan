-- EduPlan - migrasi 0002: tugas/ujian, sesi belajar, dan koneksi Google Calendar.
-- Jalankan SETELAH 0001_init.sql, di Supabase Dashboard -> SQL Editor -> New query -> Run.

-- 1. Tugas dan ujian ---------------------------------------------------------------
-- Ujian adalah kategori tugas (tidak ada tabel/halaman terpisah dan tidak ada tingkat kesulitan).
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 120),
  subject       text check (subject is null or char_length(subject) <= 60),
  category      text not null default 'tugas'
                check (category in ('tugas', 'ujian', 'latihan', 'proyek')),
  priority      text check (priority in ('tinggi', 'sedang', 'rendah')),
  due_at        timestamptz,
  due_all_day   boolean not null default false,
  status        text not null default 'todo' check (status in ('todo', 'selesai')),
  completed_at  timestamptz,
  notes         text check (notes is null or char_length(notes) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tasks_user_status_due_idx
  on public.tasks (user_id, status, due_at);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.tasks to authenticated;

-- 2. Sesi belajar --------------------------------------------------------------------
create table if not exists public.study_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title             text not null check (char_length(btrim(title)) between 1 and 120),
  subject           text check (subject is null or char_length(subject) <= 60),
  starts_at         timestamptz not null,
  duration_minutes  integer not null default 45 check (duration_minutes between 5 and 480),
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists study_sessions_user_start_idx
  on public.study_sessions (user_id, starts_at);

drop trigger if exists study_sessions_set_updated_at on public.study_sessions;
create trigger study_sessions_set_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();

alter table public.study_sessions enable row level security;

drop policy if exists "study_sessions_select_own" on public.study_sessions;
create policy "study_sessions_select_own" on public.study_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "study_sessions_insert_own" on public.study_sessions;
create policy "study_sessions_insert_own" on public.study_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "study_sessions_update_own" on public.study_sessions;
create policy "study_sessions_update_own" on public.study_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "study_sessions_delete_own" on public.study_sessions;
create policy "study_sessions_delete_own" on public.study_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.study_sessions to authenticated;

-- 3. Koneksi Google Calendar ----------------------------------------------------------
-- Menyimpan refresh token Google. Tabel ini SENGAJA tidak bisa diakses dari browser:
-- hanya Edge Function (service role) yang membaca/menulisnya.
create table if not exists public.google_calendar_connections (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  google_email   text,
  refresh_token  text not null,
  scope          text,
  connected_at   timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;
-- Tidak ada policy untuk anon/authenticated = tidak ada akses. Cabut juga hak tabelnya.
revoke all on public.google_calendar_connections from anon, authenticated;

-- Browser hanya boleh tahu "sudah terhubung atau belum" (tanpa token).
create or replace function public.google_calendar_status()
returns table (connected boolean, google_email text, connected_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select true, c.google_email, c.connected_at
  from public.google_calendar_connections c
  where c.user_id = (select auth.uid());
$$;

revoke all on function public.google_calendar_status() from public, anon;
grant execute on function public.google_calendar_status() to authenticated;
