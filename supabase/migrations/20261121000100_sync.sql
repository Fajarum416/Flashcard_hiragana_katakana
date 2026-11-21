-- Kana Practice: sinkronisasi (Tahap 4)
-- Jalankan SETELAH 20261121000000_init.sql.

-- Menggabungkan progres lama dari perangkat (localStorage prototipe) satu kali saat login pertama.
-- p = array JSON: [{"kana_id":"hiragana:あ","ok":3,"no":1}, ...]
-- Urutan jawaban tidak diketahui, jadi box hanya perkiraan dari selisih benar/salah.
-- security invoker: RLS tetap berlaku dan hanya baris milik auth.uid() yang tersentuh.
create or replace function public.merge_progress(p jsonb)
returns void language sql security invoker as $$
  insert into public.card_progress (user_id, kana_id, ok, no, box, last_reviewed_at)
  select auth.uid(),
         x.kana_id,
         greatest(x.ok, 0),
         greatest(x.no, 0),
         greatest(1, least(5, 1 + floor((x.ok - 2 * x.no) / 2.0)::int)),
         now()
  from jsonb_to_recordset(p) as x(kana_id text, ok int, no int)
  where x.kana_id is not null
  on conflict (user_id, kana_id) do update set
    ok  = card_progress.ok + excluded.ok,
    no  = card_progress.no + excluded.no,
    box = greatest(card_progress.box, excluded.box),
    last_reviewed_at = now();
$$;

revoke all on function public.merge_progress(jsonb) from public, anon;
grant execute on function public.merge_progress(jsonb) to authenticated;
