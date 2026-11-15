-- Tahap Rencana Belajar: detail sesi belajar.
-- Aman dijalankan ulang (if not exists).

alter table public.study_sessions
  add column if not exists notes      text check (notes is null or char_length(notes) <= 1000),
  add column if not exists started_at timestamptz,
  add column if not exists remind_me  boolean not null default false;

-- Dipakai lonceng pengingat: sesi belum selesai yang minta diingatkan.
create index if not exists study_sessions_remind_idx
  on public.study_sessions (user_id, starts_at)
  where remind_me and completed_at is null;
