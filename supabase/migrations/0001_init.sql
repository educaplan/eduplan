-- EduPlan - migrasi 0001: tabel profil, RLS, dan trigger pembuatan profil otomatis.
-- Jalankan seluruh isi file ini di Supabase Dashboard -> SQL Editor -> New query -> Run.

-- 1. Tabel profil (satu baris per user di auth.users) ----------------------------
create table if not exists public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  email                  text,
  nickname               text,
  avatar_url             text,
  education_level        text check (education_level in ('SMP', 'SMA', 'SMK', 'Kuliah')),
  school_name            text,
  grade                  text,
  major                  text,
  academic_goal          text,
  study_session_minutes  integer not null default 45
                         check (study_session_minutes between 10 and 240),
  onboarding_completed   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.profiles is 'Profil pengguna EduPlan, termasuk data onboarding.';

-- 2. Otomatis memperbarui updated_at ---------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 3. Row Level Security: user hanya boleh mengakses profilnya sendiri -------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- (Sengaja tidak ada policy delete: profil ikut terhapus saat akun auth dihapus.)

-- 4. Buat profil otomatis saat user baru mendaftar (email maupun Google) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nickname, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Hak akses tabel untuk role authenticated (RLS tetap membatasi per baris) -----
grant select, insert, update on public.profiles to authenticated;
