-- ==========================================================
-- Migrasi Tabel Khusus Fitur Flashcard Kanji (JLPT N5, N4 & JFT)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.kanji_progress (
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kanji_id         TEXT        NOT NULL,
  level            TEXT        NOT NULL DEFAULT 'N5',
  chapter          INT         NOT NULL DEFAULT 1,
  ok               INT         NOT NULL DEFAULT 0 CHECK (ok >= 0),
  no               INT         NOT NULL DEFAULT 0 CHECK (no >= 0),
  box              SMALLINT    NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kanji_id)
);

CREATE TABLE IF NOT EXISTS public.kanji_sessions (
  id            BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level         TEXT        NOT NULL DEFAULT 'N5',
  chapter       INT         NOT NULL DEFAULT 1,
  total_cards   INT         NOT NULL CHECK (total_cards >= 0),
  correct_cards INT         NOT NULL CHECK (correct_cards >= 0),
  duration_sec  INT         NOT NULL DEFAULT 0 CHECK (duration_sec >= 0),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kanji_sessions_user_started_idx ON public.kanji_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS kanji_progress_user_level_idx ON public.kanji_progress (user_id, level, chapter);

-- ========== Aktifkan RLS ==========
ALTER TABLE public.kanji_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanji_sessions ENABLE ROW LEVEL SECURITY;

-- Policy kanji_progress
CREATE POLICY kp_select ON public.kanji_progress FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY kp_write ON public.kanji_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policy kanji_sessions
CREATE POLICY ks_select ON public.kanji_sessions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY ks_insert ON public.kanji_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ========== RPC Mencatat Jawaban Kanji (dengan aturan isDue SRS) ==========
CREATE OR REPLACE FUNCTION public.record_kanji_answer(
  p_kanji_id TEXT,
  p_level TEXT,
  p_chapter INT,
  p_correct BOOLEAN
)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  INSERT INTO public.kanji_progress (user_id, kanji_id, level, chapter, ok, no, box, last_reviewed_at)
  VALUES (
    auth.uid(),
    p_kanji_id,
    p_level,
    p_chapter,
    CASE WHEN p_correct THEN 1 ELSE 0 END,
    CASE WHEN p_correct THEN 0 ELSE 1 END,
    CASE WHEN p_correct THEN 2 ELSE 1 END,
    now()
  )
  ON CONFLICT (user_id, kanji_id) DO UPDATE SET
    level   = EXCLUDED.level,
    chapter = EXCLUDED.chapter,
    ok      = kanji_progress.ok + EXCLUDED.ok,
    no      = kanji_progress.no + EXCLUDED.no,
    box     = CASE
      WHEN NOT p_correct THEN 1
      WHEN kanji_progress.last_reviewed_at + (
        CASE kanji_progress.box
          WHEN 1 THEN INTERVAL '0 days'
          WHEN 2 THEN INTERVAL '1 day'
          WHEN 3 THEN INTERVAL '3 days'
          WHEN 4 THEN INTERVAL '7 days'
          ELSE INTERVAL '14 days'
        END
      ) <= now() THEN LEAST(kanji_progress.box + 1, 5)
      ELSE kanji_progress.box
    END,
    last_reviewed_at = CASE
      WHEN NOT p_correct THEN now()
      WHEN kanji_progress.last_reviewed_at + (
        CASE kanji_progress.box
          WHEN 1 THEN INTERVAL '0 days'
          WHEN 2 THEN INTERVAL '1 day'
          WHEN 3 THEN INTERVAL '3 days'
          WHEN 4 THEN INTERVAL '7 days'
          ELSE INTERVAL '14 days'
        END
      ) <= now() THEN now()
      ELSE kanji_progress.last_reviewed_at
    END;
END;
$$;

-- ========== RPC Menggabungkan Progres Kanji ==========
CREATE OR REPLACE FUNCTION public.merge_kanji_progress(p JSONB)
RETURNS VOID LANGUAGE sql SECURITY INVOKER AS $$
  INSERT INTO public.kanji_progress (user_id, kanji_id, level, chapter, ok, no, box, last_reviewed_at)
  SELECT auth.uid(),
         x.kanji_id,
         COALESCE(x.level, 'N5'),
         COALESCE(x.chapter, 1),
         greatest(x.ok, 0),
         greatest(x.no, 0),
         LEAST(GREATEST(COALESCE(x.box, 1), 1), 5),
         now()
  FROM jsonb_to_recordset(p) AS x(kanji_id TEXT, level TEXT, chapter INT, ok INT, no INT, box INT)
  WHERE x.ok + x.no > 0
  ON CONFLICT (user_id, kanji_id) DO UPDATE SET
    ok      = kanji_progress.ok + EXCLUDED.ok,
    no      = kanji_progress.no + EXCLUDED.no,
    box     = greatest(kanji_progress.box, EXCLUDED.box),
    last_reviewed_at = greatest(kanji_progress.last_reviewed_at, EXCLUDED.last_reviewed_at);
$$;

-- Hak akses eksekusi RPC
REVOKE ALL ON FUNCTION public.record_kanji_answer(TEXT, TEXT, INT, BOOLEAN) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_kanji_answer(TEXT, TEXT, INT, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.merge_kanji_progress(JSONB) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.merge_kanji_progress(JSONB) TO authenticated;
