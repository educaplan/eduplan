-- Tahap Asisten AI: riwayat percakapan.
-- Aman dijalankan ulang. Butuh public.set_updated_at() dari 0001_init.sql.

create table if not exists public.ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ai_conversations_user_updated_idx
  on public.ai_conversations (user_id, updated_at desc);

drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table if not exists public.ai_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.ai_conversations (id) on delete cascade,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null check (char_length(content) between 1 and 8000),
  -- Rencana belajar terstruktur dari AI: { "sessions": [{date,start,durationMinutes,subject,title}] }
  plan             jsonb,
  -- Terisi saat user menekan "Terapkan ke Rencana Belajar".
  plan_applied_at  timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists ai_messages_conversation_idx
  on public.ai_messages (conversation_id, created_at);
create index if not exists ai_messages_user_role_created_idx
  on public.ai_messages (user_id, role, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "ai_conversations_select_own" on public.ai_conversations;
create policy "ai_conversations_select_own" on public.ai_conversations for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "ai_conversations_insert_own" on public.ai_conversations;
create policy "ai_conversations_insert_own" on public.ai_conversations for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "ai_conversations_update_own" on public.ai_conversations;
create policy "ai_conversations_update_own" on public.ai_conversations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "ai_conversations_delete_own" on public.ai_conversations;
create policy "ai_conversations_delete_own" on public.ai_conversations for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "ai_messages_select_own" on public.ai_messages;
create policy "ai_messages_select_own" on public.ai_messages for select to authenticated
  using ((select auth.uid()) = user_id);

-- Pesan hanya boleh masuk ke percakapan milik sendiri.
drop policy if exists "ai_messages_insert_own" on public.ai_messages;
create policy "ai_messages_insert_own" on public.ai_messages for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "ai_messages_update_own" on public.ai_messages;
create policy "ai_messages_update_own" on public.ai_messages for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.ai_conversations to authenticated;
-- Pesan tidak bisa diedit isinya; browser hanya boleh menandai rencana sudah diterapkan.
grant select, insert on public.ai_messages to authenticated;
revoke update on public.ai_messages from authenticated;
grant update (plan_applied_at) on public.ai_messages to authenticated;
