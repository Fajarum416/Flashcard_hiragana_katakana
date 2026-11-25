-- ==========================================================
-- Migrasi CMS Materi Kosakata & Kanji + Storage Ilustrasi
-- ==========================================================

-- 1. Tabel Bab Kosakata
CREATE TABLE IF NOT EXISTS public.vocab_chapters (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level       TEXT        NOT NULL CHECK (level IN ('n5', 'n4')),
  chapter     INT         NOT NULL CHECK (chapter > 0),
  title       TEXT        NOT NULL,
  description TEXT,
  published   BOOLEAN     NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (level, chapter)
);

-- 2. Tabel Daftar Kosakata
CREATE TABLE IF NOT EXISTS public.vocab_words (
  id          TEXT        PRIMARY KEY,
  chapter_id  UUID        NOT NULL REFERENCES public.vocab_chapters(id) ON DELETE CASCADE,
  sort_order  INT         NOT NULL DEFAULT 0,
  kanji       TEXT,
  kana        TEXT        NOT NULL,
  romaji      TEXT        NOT NULL,
  meaning     TEXT        NOT NULL,
  type        TEXT,
  example_jp  TEXT,
  example_id  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabel Bab Kanji
CREATE TABLE IF NOT EXISTS public.kanji_chapters (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level       TEXT        NOT NULL CHECK (level IN ('n5', 'n4', 'jft')),
  chapter     INT         NOT NULL CHECK (chapter > 0),
  title       TEXT        NOT NULL,
  description TEXT,
  published   BOOLEAN     NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (level, chapter)
);

-- 4. Tabel Daftar Kanji
CREATE TABLE IF NOT EXISTS public.kanji_items (
  id          TEXT        PRIMARY KEY,
  chapter_id  UUID        NOT NULL REFERENCES public.kanji_chapters(id) ON DELETE CASCADE,
  sort_order  INT         NOT NULL DEFAULT 0,
  kanji       TEXT        NOT NULL,
  onyomi      TEXT        NOT NULL DEFAULT '',
  kunyomi     TEXT        NOT NULL DEFAULT '',
  meaning     TEXT        NOT NULL,
  mnemonic    TEXT,
  image_url   TEXT,
  examples    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vocab_words_chapter_idx ON public.vocab_words (chapter_id, sort_order);
CREATE INDEX IF NOT EXISTS kanji_items_chapter_idx ON public.kanji_items (chapter_id, sort_order);

-- ========== Aktifkan RLS ==========
ALTER TABLE public.vocab_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanji_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanji_items ENABLE ROW LEVEL SECURITY;

-- Policy Baca (Siswa/Publik hanya bab published; Admin bisa semua)
CREATE POLICY vc_select ON public.vocab_chapters FOR SELECT
  USING (published = true OR public.is_admin());

CREATE POLICY vw_select ON public.vocab_words FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vocab_chapters c
      WHERE c.id = vocab_words.chapter_id AND (c.published = true OR public.is_admin())
    )
  );

CREATE POLICY kc_select ON public.kanji_chapters FOR SELECT
  USING (published = true OR public.is_admin());

CREATE POLICY ki_select ON public.kanji_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.kanji_chapters c
      WHERE c.id = kanji_items.chapter_id AND (c.published = true OR public.is_admin())
    )
  );

-- Policy Tulis (Hanya Admin)
CREATE POLICY vc_admin_write ON public.vocab_chapters FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY vw_admin_write ON public.vocab_words FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY kc_admin_write ON public.kanji_chapters FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY ki_admin_write ON public.kanji_items FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ========== Supabase Storage Bucket untuk Ilustrasi Kanji ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('kanji-illustrations', 'kanji-illustrations', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY kanji_img_public_read ON storage.objects FOR SELECT
  USING (bucket_id = 'kanji-illustrations');

CREATE POLICY kanji_img_admin_write ON storage.objects FOR ALL
  USING (bucket_id = 'kanji-illustrations' AND public.is_admin())
  WITH CHECK (bucket_id = 'kanji-illustrations' AND public.is_admin());
