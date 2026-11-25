import type { KanjiChapter } from './types'

export const JFT_KANJI_CHAPTERS: KanjiChapter[] = [
  {
    level: 'jft',
    chapter: 1,
    title: 'Bab 1: Kehidupan Sehari-hari',
    description: 'Kanji praktis JFT-Basic yang sering ditemui di papan informasi dan aktivitas harian.',
    items: [
      {
        id: 'jft-k01-01',
        kanji: '禁',
        onyomi: 'キン (kin)',
        kunyomi: '-',
        meaning: 'Larangan / Dilarang',
        examples: [
          { word: '禁煙', reading: 'きんえん', meaning: 'dilarang merokok' },
          { word: '立入禁止', reading: 'たちいりきんし', meaning: 'dilarang masuk' },
        ],
      },
      {
        id: 'jft-k01-02',
        kanji: '止',
        onyomi: 'シ (shi)',
        kunyomi: 'と・まる (tomaru)',
        meaning: 'Berhenti',
        examples: [
          { word: '中止', reading: 'ちゅうし', meaning: 'dibatalkan' },
          { word: '止まる', reading: 'とまる', meaning: 'berhenti' },
        ],
      },
      {
        id: 'jft-k01-03',
        kanji: '開',
        onyomi: 'カイ (kai)',
        kunyomi: 'あ・ける / ひら・く (akeru / hiraku)',
        meaning: 'Buka / Membuka',
        examples: [
          { word: '開店', reading: 'かいてん', meaning: 'toko buka' },
          { word: '開ける', reading: 'あける', meaning: 'membuka' },
        ],
      },
      {
        id: 'jft-k01-04',
        kanji: '閉',
        onyomi: 'ヘイ (hei)',
        kunyomi: 'し・める (shimeru)',
        meaning: 'Tutup / Menutup',
        examples: [
          { word: '閉店', reading: 'へいてん', meaning: 'toko tutup' },
          { word: '閉める', reading: 'しめる', meaning: 'menutup' },
        ],
      },
      {
        id: 'jft-k01-05',
        kanji: '押',
        onyomi: 'オウ (ou)',
        kunyomi: 'お・す (osu)',
        meaning: 'Dorong / Tekan',
        examples: [
          { word: '押す', reading: 'おす', meaning: 'mendorong / menekan' },
        ],
      },
      {
        id: 'jft-k01-06',
        kanji: '引',
        onyomi: 'イン (in)',
        kunyomi: 'ひ・く (hiku)',
        meaning: 'Tarik / Diskon',
        examples: [
          { word: '引く', reading: 'ひく', meaning: 'menarik' },
          { word: '割引', reading: 'わりびき', meaning: 'diskon' },
        ],
      },
      {
        id: 'jft-k01-07',
        kanji: '無',
        onyomi: 'ム・ブ (mu / bu)',
        kunyomi: 'な・い (nai)',
        meaning: 'Tidak Ada / Gratis',
        examples: [
          { word: '無料', reading: 'むりょう', meaning: 'gratis' },
          { word: '無理', reading: 'むり', meaning: 'mustahil / berlebihan' },
        ],
      },
      {
        id: 'jft-k01-08',
        kanji: '料',
        onyomi: 'リョウ (ryou)',
        kunyomi: '-',
        meaning: 'Biaya / Bahan Masakan',
        examples: [
          { word: '料金', reading: 'りょうきん', meaning: 'tarif / biaya' },
          { word: '料理', reading: 'りょうり', meaning: 'masakan' },
        ],
      },
      {
        id: 'jft-k01-09',
        kanji: '注',
        onyomi: 'チュウ (chuu)',
        kunyomi: 'そそ・ぐ (sosogu)',
        meaning: 'Perhatian / Pesan / Tuang',
        examples: [
          { word: '注意', reading: 'ちゅうい', meaning: 'hati-hati / perhatian' },
          { word: '注文', reading: 'ちゅうもん', meaning: 'memesan' },
        ],
      },
      {
        id: 'jft-k01-10',
        kanji: '危',
        onyomi: 'キ (ki)',
        kunyomi: 'あぶ・ない (abunai)',
        meaning: 'Bahaya',
        examples: [
          { word: '危険', reading: 'きけん', meaning: 'berbahaya' },
          { word: '危ない', reading: 'あぶない', meaning: 'bahaya' },
        ],
      },
    ],
  },
  {
    level: 'jft',
    chapter: 2,
    title: 'Bab 2: Pekerjaan & Fasilitas Umum',
    description: 'Kanji JFT-Basic yang sering dipakai di tempat kerja, formulir, dan layanan publik.',
    items: [
      {
        id: 'jft-k02-01',
        kanji: '受',
        onyomi: 'ジュ (ju)',
        kunyomi: 'う・ける (ukeru)',
        meaning: 'Menerima / Mengikuti (Ujian)',
        examples: [
          { word: '受付', reading: 'うけつけ', meaning: 'resepsionis' },
          { word: '受ける', reading: 'うける', meaning: 'menerima / ikut tes' },
        ],
      },
      {
        id: 'jft-k02-02',
        kanji: '予',
        onyomi: 'ヨ (yo)',
        kunyomi: '-',
        meaning: 'Rencana / Sebelumnya',
        examples: [
          { word: '予約', reading: 'よやく', meaning: 'reservasi' },
          { word: '予定', reading: 'よてい', meaning: 'jadwal / rencana' },
        ],
      },
      {
        id: 'jft-k02-03',
        kanji: '約',
        onyomi: 'ヤク (yaku)',
        kunyomi: '-',
        meaning: 'Janji / Sekitar',
        examples: [
          { word: '約束', reading: 'やくそく', meaning: 'janji' },
          { word: '予約', reading: 'よやく', meaning: 'reservasi' },
        ],
      },
      {
        id: 'jft-k02-04',
        kanji: '連',
        onyomi: 'レン (ren)',
        kunyomi: 'つ・れる (tsureru)',
        meaning: 'Menghubungkan / Membawa',
        examples: [
          { word: '連絡', reading: 'れんらく', meaning: 'menghubungi / kontak' },
        ],
      },
      {
        id: 'jft-k02-05',
        kanji: '確',
        onyomi: 'カク (kaku)',
        kunyomi: 'たし・か (tashika)',
        meaning: 'Pasti / Memastikan',
        examples: [
          { word: '確認', reading: 'かくにん', meaning: 'konfirmasi / pengecekan' },
        ],
      },
      {
        id: 'jft-k02-06',
        kanji: '安',
        onyomi: 'アン (an)',
        kunyomi: 'やす・い (yasui)',
        meaning: 'Aman / Murah / Tenang',
        examples: [
          { word: '安全', reading: 'あんぜん', meaning: 'keselamatan / aman' },
          { word: '安い', reading: 'やすい', meaning: 'murah' },
        ],
      },
      {
        id: 'jft-k02-07',
        kanji: '全',
        onyomi: 'ゼン (zen)',
        kunyomi: 'すべ・て (subete)',
        meaning: 'Semua / Seluruh',
        examples: [
          { word: '全部', reading: 'ぜんぶ', meaning: 'semuanya' },
          { word: '安全', reading: 'あんぜん', meaning: 'aman' },
        ],
      },
      {
        id: 'jft-k02-08',
        kanji: '休',
        onyomi: 'キュウ (kyuu)',
        kunyomi: 'やす・む (yasumu)',
        meaning: 'Istirahat / Libur',
        examples: [
          { word: '休憩', reading: 'きゅうけい', meaning: 'istirahat sejenak' },
          { word: '休日', reading: 'きゅうじつ', meaning: 'hari libur' },
        ],
      },
      {
        id: 'jft-k02-09',
        kanji: '準',
        onyomi: 'ジュン (jun)',
        kunyomi: '-',
        meaning: 'Persiapan / Standar',
        examples: [
          { word: '準備', reading: 'じゅんび', meaning: 'persiapan' },
        ],
      },
      {
        id: 'jft-k02-10',
        kanji: '必',
        onyomi: 'ヒツ (hitsu)',
        kunyomi: 'かなら・ず (kanarazu)',
        meaning: 'Pasti / Perlu / Wajib',
        examples: [
          { word: '必要', reading: 'ひつよう', meaning: 'perlu / dibutuhkan' },
          { word: '必ず', reading: 'かならず', meaning: 'pasti / wajib' },
        ],
      },
    ],
  },
]
