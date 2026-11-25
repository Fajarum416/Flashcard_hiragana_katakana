-- Flashcard Kosakata: Skema Tabel Khusus (Vocab Progress & Sessions)
-- Jalankan di SQL Editor Supabase atau lewat `supabase db push`

-- 1. Tabel Progres Hafalan Kosakata Siswa
CREATE TABLE IF NOT EXISTS public.vocab_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL,
  level TEXT NOT NULL,               -- 'N5' | 'N4'
  chapter INT NOT NULL,              -- Bab 1, 2, dst.
  ok INT NOT NULL DEFAULT 0,
  no INT NOT NULL DEFAULT 0,
  box INT NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
  last_reviewed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, word_id)
);

-- 2. Tabel Riwayat Sesi Latihan Kosakata Siswa
CREATE TABLE IF NOT EXISTS public.vocab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  chapter INT NOT NULL,
  total_cards INT NOT NULL,
  correct_cards INT NOT NULL,
  duration_sec INT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index untuk performa analitik
CREATE INDEX IF NOT EXISTS vocab_progress_user_level_idx ON public.vocab_progress (user_id, level, chapter);
CREATE INDEX IF NOT EXISTS vocab_sessions_user_idx ON public.vocab_sessions (user_id, started_at DESC);

-- ========== Row Level Security (RLS) ==========
ALTER TABLE public.vocab_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_sessions ENABLE ROW LEVEL SECURITY;

-- Policy vocab_progress
CREATE POLICY vp_select ON public.vocab_progress FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY vp_write ON public.vocab_progress FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policy vocab_sessions
CREATE POLICY vs_select ON public.vocab_sessions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY vs_insert ON public.vocab_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ========== RPC Mencatat Jawaban Kosakata ==========
CREATE OR REPLACE FUNCTION public.record_vocab_answer(
  p_word_id TEXT,
  p_level TEXT,
  p_chapter INT,
  p_correct BOOLEAN
)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  INSERT INTO public.vocab_progress (user_id, word_id, level, chapter, ok, no, box, last_reviewed_at)
  VALUES (
    auth.uid(),
    p_word_id,
    p_level,
    p_chapter,
    CASE WHEN p_correct THEN 1 ELSE 0 END,
    CASE WHEN p_correct THEN 0 ELSE 1 END,
    CASE WHEN p_correct THEN 2 ELSE 1 END,
    now()
  )
  ON CONFLICT (user_id, word_id) DO UPDATE SET
    level   = EXCLUDED.level,
    chapter = EXCLUDED.chapter,
    ok      = vocab_progress.ok + EXCLUDED.ok,
    no      = vocab_progress.no + EXCLUDED.no,
    box     = CASE WHEN p_correct THEN LEAST(vocab_progress.box + 1, 5) ELSE 1 END,
    last_reviewed_at = now();
END;
$$;

-- ========== RPC Menggabungkan Progres Kosakata Lama ==========
CREATE OR REPLACE FUNCTION public.merge_vocab_progress(p JSONB)
RETURNS VOID LANGUAGE sql SECURITY INVOKER AS $$
  INSERT INTO public.vocab_progress (user_id, word_id, level, chapter, ok, no, box, last_reviewed_at)
  SELECT auth.uid(),
         x.word_id,
         x.level,
         x.chapter,
         greatest(x.ok, 0),
         greatest(x.no, 0),
         greatest(1, least(5, coalesce(x.box, 1 + floor((x.ok - 2 * x.no) / 2.0)::int))),
         now()
  FROM jsonb_to_recordset(p) as x(word_id text, level text, chapter int, ok int, no int, box int)
  WHERE x.word_id IS NOT NULL
  ON CONFLICT (user_id, word_id) DO UPDATE SET
    level   = EXCLUDED.level,
    chapter = EXCLUDED.chapter,
    ok      = vocab_progress.ok + EXCLUDED.ok,
    no      = vocab_progress.no + EXCLUDED.no,
    box     = greatest(vocab_progress.box, EXCLUDED.box),
    last_reviewed_at = now();
$$;

-- Hak akses RPC
REVOKE ALL ON FUNCTION public.record_vocab_answer(TEXT, TEXT, INT, BOOLEAN) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_vocab_answer(TEXT, TEXT, INT, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.merge_vocab_progress(JSONB) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.merge_vocab_progress(JSONB) TO authenticated;

-- ========== View Analitik Penguasaan Kosakata ==========
CREATE OR REPLACE VIEW public.user_vocab_mastery WITH (security_invoker = true) AS
SELECT user_id,
       level,
       chapter,
       count(*) as total_studied,
       count(*) filter (where box >= 4 and ok::numeric / nullif(ok + no, 0) >= 0.8) as mastered,
       sum(ok) as total_ok,
       sum(no) as total_no
FROM public.vocab_progress
GROUP BY user_id, level, chapter;
