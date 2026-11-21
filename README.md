# Kana Practice

Flashcard Hiragana & Katakana (React + Vite + TypeScript). Lihat dokumentasi teknis untuk arsitektur dan roadmap.

```
npm install
npm run dev     # pengembangan
npm test        # unit test
npm run build   # build produksi
```

## Setup Supabase (login Google)

1. Buat proyek Supabase, lalu jalankan [supabase/migrations/20261121000000_init.sql](supabase/migrations/20261121000000_init.sql) di SQL Editor.
2. Google Cloud Console: buat OAuth client (Web application), redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase: Authentication → Providers → Google (isi Client ID/Secret); URL Configuration → isi Site URL dan Redirect URLs (produksi dan `http://localhost:5173`).
4. Salin `.env.example` menjadi `.env`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (anon key saja, bukan service_role).
5. Jadikan akun admin pertama lewat SQL: `update public.profiles set role = 'admin' where email = '...';`

Tanpa `.env`, aplikasi tetap berjalan lokal tanpa login.
