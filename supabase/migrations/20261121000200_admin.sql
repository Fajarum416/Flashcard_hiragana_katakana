-- Kana Practice: panel admin (Tahap 5)
-- Jalankan SETELAH 20261121000000_init.sql dan 20261121000100_sync.sql.
-- Semua fungsi memeriksa is_admin() di server. Menyembunyikan menu di UI saja tidak cukup.

alter table public.profiles add column if not exists disabled boolean not null default false;
-- Kolom 'disabled' tidak masuk grant update milik user (lihat init.sql), jadi hanya fungsi di bawah yang bisa mengubahnya.

-- Ringkasan untuk halaman /admin
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'dau', (select count(distinct user_id) from public.study_sessions where started_at > now() - interval '1 day'),
    'wau', (select count(distinct user_id) from public.study_sessions where started_at > now() - interval '7 days'),
    'top_mistakes', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select kana_id, sum(no)::int as wrong, sum(ok)::int as correct
        from public.card_progress
        group by kana_id
        having sum(no) > 0
        order by sum(no) desc, kana_id
        limit 10
      ) t
    )
  );
end $$;

-- Reset seluruh progres satu pengguna (riwayat sesi dibiarkan)
create or replace function public.admin_reset_progress(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.card_progress where user_id = p_user;
end $$;

-- Nonaktifkan / aktifkan akun. Akun nonaktif tidak bisa login lagi dan sesinya dicabut.
-- Access token yang sudah terbit tetap berlaku sampai kedaluwarsa (default 1 jam).
create or replace function public.admin_set_disabled(p_user uuid, p_disabled boolean)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'cannot change your own account' using errcode = '42501';
  end if;
  update public.profiles set disabled = p_disabled where id = p_user;
  update auth.users
     set banned_until = case when p_disabled then now() + interval '100 years' else null end
   where id = p_user;
  if p_disabled then
    delete from auth.sessions where user_id = p_user;
  end if;
end $$;

revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_reset_progress(uuid) from public, anon;
revoke all on function public.admin_set_disabled(uuid, boolean) from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_reset_progress(uuid) to authenticated;
grant execute on function public.admin_set_disabled(uuid, boolean) to authenticated;
