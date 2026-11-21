-- Kana Practice: skema awal (Tahap 3)
-- Jalankan lewat `supabase db push` atau tempel di SQL Editor Supabase.

-- ========== Tabel ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- kana_id memakai format prototipe: 'hiragana:あ', 'katakana:キャ'
create table public.card_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  kana_id text not null,
  ok int not null default 0,
  no int not null default 0,
  box int not null default 1 check (box between 1 and 5),
  last_reviewed_at timestamptz,
  primary key (user_id, kana_id)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  script text not null check (script in ('hiragana','katakana')),
  mode text not null check (mode in ('char','word')),
  composite boolean not null default false,
  total_cards int not null,
  correct_cards int not null,
  duration_sec int,
  started_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selection jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index study_sessions_user_idx on public.study_sessions (user_id, started_at desc);

-- ========== Profil otomatis saat pendaftaran ==========
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== Row Level Security ==========
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'admin')
$$;

alter table public.profiles       enable row level security;
alter table public.card_progress  enable row level security;
alter table public.study_sessions enable row level security;
alter table public.user_settings  enable row level security;

-- profiles
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- user tidak boleh mengubah role-nya sendiri
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, last_login_at) on public.profiles to authenticated;

-- card_progress
create policy cp_select on public.card_progress for select
  using (user_id = auth.uid() or public.is_admin());
create policy cp_write on public.card_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- study_sessions
create policy ss_select on public.study_sessions for select
  using (user_id = auth.uid() or public.is_admin());
create policy ss_insert on public.study_sessions for insert
  with check (user_id = auth.uid());

-- user_settings
create policy us_all on public.user_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ========== Mencatat jawaban (dipakai Tahap 4) ==========
create or replace function public.record_answer(p_kana_id text, p_correct boolean)
returns void language sql security invoker as $$
  insert into public.card_progress (user_id, kana_id, ok, no, box, last_reviewed_at)
  values (auth.uid(), p_kana_id,
          case when p_correct then 1 else 0 end,
          case when p_correct then 0 else 1 end,
          case when p_correct then 2 else 1 end, now())
  on conflict (user_id, kana_id) do update set
    ok  = card_progress.ok + excluded.ok,
    no  = card_progress.no + excluded.no,
    box = case when p_correct then least(card_progress.box + 1, 5) else 1 end,
    last_reviewed_at = now();
$$;

-- ========== Ringkasan hafalan (dipakai Tahap 5) ==========
create view public.user_mastery with (security_invoker = true) as
select user_id,
       split_part(kana_id, ':', 1) as script,
       count(*) as practiced,
       count(*) filter (where box >= 4 and ok::numeric / nullif(ok + no, 0) >= 0.8) as mastered,
       sum(ok) as ok, sum(no) as no
from public.card_progress
group by user_id, split_part(kana_id, ':', 1);

-- ========== Hapus akun sendiri (cascade menghapus semua data) ==========
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Admin pertama ditetapkan MANUAL (bukan lewat aplikasi):
-- update public.profiles set role = 'admin' where email = 'email-admin@contoh.com';
