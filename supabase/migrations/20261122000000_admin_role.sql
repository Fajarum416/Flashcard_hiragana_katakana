-- Enna Card: ubah peran pengguna (user <-> admin) dari panel admin
-- Jalankan di SQL Editor Supabase atau lewat `supabase db push`.

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'tidak dapat mengubah peran akun sendiri' using errcode = '42501';
  end if;
  if p_role not in ('user', 'admin') then
    raise exception 'peran tidak valid' using errcode = '22023';
  end if;
  update public.profiles set role = p_role where id = p_user;
end $$;

revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
