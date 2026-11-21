# Kana Practice (PWA)

Aplikasi web flashcard modern untuk belajar dan melatih aksara Jepang (**Hiragana & Katakana**), dilengkapi dengan sistem pengulangan berjarak (**Leitner SRS**), dukungan audio pengucapan native, offline-first PWA, sinkronisasi cloud dengan **Supabase**, dan **Panel Admin** untuk memantau hafalan pengguna.

---

## Fitur Utama

- **Latihan Aksara (Characters)**:
  - **Single**: 71 karakter Gojūon, Dakuten, dan Handakuten per aksara.
  - **Composite**: 33 gabungan Yōon (kya, shu, cho, dll.) per aksara.
  - Pengenalan variasi Romaji (Kunrei, Hepburn, vokal panjang, sokuon konsonan ganda, wo/o).
- **Latihan Kosakata (Words)**:
  - 80+ kosakata Jepang populer.
  - **Single Words**: Kosakata murni dari kolom karakter yang aktif.
  - **Composite Words**: Kosakata yang memuat Yōon dan Sokuon (っ / ッ).
- **Audio Native Pengucapan (Web Speech API)**:
  - Tombol audio 🔊 di panggung kartu latihan dan daftar kosakata.
  - Pengucapan otomatis saat jawaban benar atau saat reveal jawaban.
- **Leitner Spaced Repetition System (SRS)**:
  - 5 Kotak Leitner (Box 1 sampai 5) dengan interval peninjauan bertingkat (0 hari, 1 hari, 3 hari, 7 hari, 14 hari).
  - Kartu lemah atau jatuh tempo diprioritaskan muncul lebih awal.
- **Offline-First PWA**:
  - Service worker precaching untuk seluruh aset dan font.
  - Petunjuk instalasi untuk iOS Safari (_Add to Home Screen_) dan Android/Chrome.
- **Cloud Sync & Auth (Supabase)**:
  - Login dengan akun Google.
  - Sinkronisasi progres lokal (IndexedDB Dexie) ke cloud Postgres secara aman (RLS).
  - Cadangan offline: Antrean jawaban dikirim otomatis begitu online kembali.
- **Panel Admin (/admin)**:
  - Ringkasan metrik: Total pengguna, DAU, WAU, dan Top 10 kesalahan global.
  - Daftar pengguna, status hafalan Hiragana & Katakana, serta ekspor data ke CSV.
  - **Kana Heatmap**: Visualisasi warna status hafalan per huruf pengguna (Merah, Kuning, Biru, Hijau).
  - Riwayat sesi latihan dan streak harian.
  - Manajemen akun: Reset progres dan nonaktifkan pengguna.

---

## Menjalankan Proyek

### 1. Instalasi Dependensi & Pengembangan Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:5173` di browser.

### 2. Menjalankan Unit Tests

```bash
npm test
```

Menjalankan 42 unit test otomatis (Vitest) untuk memastikan kebenaran logika romaji, srs, deck, pengaturan, dan kalkulasi hafalan.

### 3. Build Produksi (PWA)

```bash
npm run build
npm run preview
```

---

## Konfigurasi Supabase & Google OAuth

1. Buat proyek di [Supabase](https://supabase.com).
2. Jalankan migrasi SQL di **SQL Editor** Supabase secara berurutan:
   - [supabase/migrations/20261121000000_init.sql](supabase/migrations/20261121000000_init.sql)
   - [supabase/migrations/20261121000100_sync.sql](supabase/migrations/20261121000100_sync.sql)
   - [supabase/migrations/20261121000200_admin.sql](supabase/migrations/20261121000200_admin.sql)
3. Google Cloud Console: Buat OAuth Client ID (Web Application) dengan redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. Di Supabase: **Authentication → Providers → Google** (masukkan Client ID & Secret).
5. Di Supabase: **Authentication → URL Configuration** (tambahkan domain produksi dan `http://localhost:5173` ke Redirect URLs).
6. Salin `.env.example` ke `.env` dan isi `VITE_SUPABASE_URL` serta `VITE_SUPABASE_ANON_KEY`.
7. Jadikan akun Anda administrator:
   ```sql
   update public.profiles set role = 'admin' where email = 'email-anda@gmail.com';
   ```
