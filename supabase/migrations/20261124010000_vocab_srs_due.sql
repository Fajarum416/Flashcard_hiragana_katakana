-- Memastikan record_vocab_answer hanya menaikkan Box SRS jika kartu sudah jatuh tempo (isDue),
-- sehingga pengulangan kuis di hari yang sama tidak mempercepat kenaikan Box secara instan.

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
    box     = CASE
      WHEN NOT p_correct THEN 1
      WHEN vocab_progress.last_reviewed_at + (
        CASE vocab_progress.box
          WHEN 1 THEN INTERVAL '0 days'
          WHEN 2 THEN INTERVAL '1 day'
          WHEN 3 THEN INTERVAL '3 days'
          WHEN 4 THEN INTERVAL '7 days'
          ELSE INTERVAL '14 days'
        END
      ) <= now() THEN LEAST(vocab_progress.box + 1, 5)
      ELSE vocab_progress.box
    END,
    last_reviewed_at = CASE
      WHEN NOT p_correct THEN now()
      WHEN vocab_progress.last_reviewed_at + (
        CASE vocab_progress.box
          WHEN 1 THEN INTERVAL '0 days'
          WHEN 2 THEN INTERVAL '1 day'
          WHEN 3 THEN INTERVAL '3 days'
          WHEN 4 THEN INTERVAL '7 days'
          ELSE INTERVAL '14 days'
        END
      ) <= now() THEN now()
      ELSE vocab_progress.last_reviewed_at
    END;
END;
$$;
