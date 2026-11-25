import type { VocabChapter } from './types'

export const N5_CHAPTERS: VocabChapter[] = [
  {
    chapter: 1,
    title: 'Bab 1: Perkenalan Diria',
    description: 'Kosakata seputar perkenalan diri, panggilan orang, profesi, dan kewarganegaraan.',
    words: [
      {
        id: 'n5-b01-01',
        kana: 'わたし',
        romaji: 'watashi',
        meaning: 'Saya',
        type: 'Kata Ganti',
        exampleJp: 'わたしは がくせいです。',
        exampleId: 'Saya adalah seorang siswa.'
      },
      {
        id: 'n5-b01-02',
        kanji: '私たち',
        kana: 'わたしたち',
        romaji: 'watashitachi',
        meaning: 'Kita / Kami',
        type: 'Kata Ganti'
      },
      {
        id: 'n5-b01-03',
        kana: 'あなた',
        romaji: 'anata',
        meaning: 'Anda / Kamu',
        type: 'Kata Ganti'
      },
      {
        id: 'n5-b01-04',
        kanji: 'あの人',
        kana: 'あのひと',
        romaji: 'ano hito',
        meaning: 'Orang itu',
        type: 'Frasa'
      },
      {
        id: 'n5-b01-05',
        kanji: 'あの方',
        kana: 'あのかた',
        romaji: 'ano kata',
        meaning: 'Beliau (bentuk sopan dari あの人)',
        type: 'Frasa'
      },
      {
        id: 'n5-b01-06',
        kanji: '皆さん',
        kana: 'みなさん',
        romaji: 'minasan',
        meaning: 'Semuanya / Saudara-saudara sekalian',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-07',
        kana: '〜さん',
        romaji: '~san',
        meaning: 'Sdr. / Ibu / Bapak (akhiran sopan untuk nama)',
        type: 'Akhiran'
      },
      {
        id: 'n5-b01-08',
        kana: '〜ちゃん',
        romaji: '~chan',
        meaning: 'Akhiran panggilan akrab untuk anak-anak / teman',
        type: 'Akhiran'
      },
      {
        id: 'n5-b01-09',
        kana: '〜くん',
        romaji: '~kun',
        meaning: 'Akhiran panggilan untuk anak laki-laki / teman sebaya',
        type: 'Akhiran'
      },
      {
        id: 'n5-b01-10',
        kanji: '〜人',
        kana: '〜じん',
        romaji: '~jin',
        meaning: 'Orang (akhiran kewarganegaraan, cth: インドネシア人)',
        type: 'Akhiran'
      },
      {
        id: 'n5-b01-11',
        kanji: '先生',
        kana: 'せんせい',
        romaji: 'sensei',
        meaning: 'Guru / Pengajar / Dokter (panggilan)',
        type: 'Kata Benda',
        exampleJp: 'たなかせんせいは にほんごの せんせいです。',
        exampleId: 'Guru Tanaka adalah guru bahasa Jepang.'
      },
      {
        id: 'n5-b01-12',
        kanji: '教師',
        kana: 'きょうし',
        romaji: 'kyoushi',
        meaning: 'Guru / Pengajar (profesi diri sendiri)',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-13',
        kanji: '学生',
        kana: 'がくせい',
        romaji: 'gakusei',
        meaning: 'Siswa / Mahasiswa',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-14',
        kanji: '会社員',
        kana: 'かいしゃいん',
        romaji: 'kaishain',
        meaning: 'Karyawan perusahaan',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-15',
        kanji: '社員',
        kana: 'しゃいん',
        romaji: 'shain',
        meaning: 'Karyawan perusahaan ~ (cth: IMCのしゃいん)',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-16',
        kanji: '銀行員',
        kana: 'ぎんこういん',
        romaji: 'ginkouin',
        meaning: 'Pegawai bank',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-17',
        kanji: '医者',
        kana: 'いしゃ',
        romaji: 'isha',
        meaning: 'Dokter',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-18',
        kanji: '研究者',
        kana: 'けんきゅうしゃ',
        romaji: 'kenkyuusha',
        meaning: 'Peneliti',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-19',
        kanji: 'エンジニア',
        kana: 'エンジニア',
        romaji: 'enjinia',
        meaning: 'Insinyur / Teknisi',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-20',
        kanji: '大学',
        kana: 'だいがく',
        romaji: 'daigaku',
        meaning: 'Universitas',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-21',
        kanji: '病院',
        kana: 'びょういん',
        romaji: 'byouin',
        meaning: 'Rumah Sakit',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-22',
        kanji: '電気',
        kana: 'でんき',
        romaji: 'denki',
        meaning: 'Listrik / Lampu',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b01-23',
        kana: 'だれ',
        romaji: 'dare',
        meaning: 'Siapa (bentuk biasa)',
        type: 'Kata Tanya'
      },
      {
        id: 'n5-b01-24',
        kanji: 'どなた',
        kana: 'どなた',
        romaji: 'donata',
        meaning: 'Siapa (bentuk sopan)',
        type: 'Kata Tanya'
      },
      {
        id: 'n5-b01-25',
        kanji: '〜歳',
        kana: '〜さい',
        romaji: '~sai',
        meaning: 'Umur / Berusia ~ tahun',
        type: 'Akhiran'
      },
      {
        id: 'n5-b01-26',
        kanji: '何歳',
        kana: 'なんさい',
        romaji: 'nansai',
        meaning: 'Berapa usia / umur berapa',
        type: 'Kata Tanya'
      },
      {
        id: 'n5-b01-27',
        kana: 'おいくつ',
        romaji: 'oikutsu',
        meaning: 'Berapa usia (bentuk sopan)',
        type: 'Kata Tanya'
      },
      {
        id: 'n5-b01-28',
        kana: 'はい',
        romaji: 'hai',
        meaning: 'Ya / Benar',
        type: 'Ungkapan'
      },
      {
        id: 'n5-b01-29',
        kana: 'いいえ',
        romaji: 'iie',
        meaning: 'Tidak / Bukan',
        type: 'Ungkapan'
      },
      {
        id: 'n5-b01-30',
        kanji: '初めまして',
        kana: 'はじめまして',
        romaji: 'hajimemashite',
        meaning: 'Salam kenal / Pertama kali bertemu',
        type: 'Ungkapan'
      },
      {
        id: 'n5-b01-31',
        kana: 'どうぞよろしく',
        romaji: 'douzo yoroshiku',
        meaning: 'Senang berkenalan dengan Anda / Mohon bantuannya',
        type: 'Ungkapan'
      }
    ]
  },
  {
    chapter: 2,
    title: 'Bab 2: Benda di Sekitar Kita',
    description: 'Kosakata benda sehari-hari, kata tunjuk (kore, sore, are), dan kepemilikan.',
    words: [
      {
        id: 'n5-b02-01',
        kana: 'これ',
        romaji: 'kore',
        meaning: 'Ini (dekat pembicara)',
        type: 'Kata Tunjuk'
      },
      {
        id: 'n5-b02-02',
        kana: 'それ',
        romaji: 'sore',
        meaning: 'Itu (dekat lawan bicara)',
        type: 'Kata Tunjuk'
      },
      {
        id: 'n5-b02-03',
        kana: 'あれ',
        romaji: 'are',
        meaning: 'Itu (jauh dari keduanya)',
        type: 'Kata Tunjuk'
      },
      {
        id: 'n5-b02-04',
        kanji: '本',
        kana: 'ほん',
        romaji: 'hon',
        meaning: 'Buku',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b02-05',
        kanji: '辞書',
        kana: 'じしょ',
        romaji: 'jisho',
        meaning: 'Kamus',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b02-06',
        kanji: '雑誌',
        kana: 'ざっし',
        romaji: 'zasshi',
        meaning: 'Majalah',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b02-07',
        kanji: '新聞',
        kana: 'しんぶん',
        romaji: 'shinbun',
        meaning: 'Koran',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b02-08',
        kanji: '手帳',
        kana: 'てちょう',
        romaji: 'techou',
        meaning: 'Buku catatan / agenda saku',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b02-09',
        kanji: '鉛筆',
        kana: 'えんぴつ',
        romaji: 'enpitsu',
        meaning: 'Pensil',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b02-10',
        kanji: '時計',
        kana: 'とけい',
        romaji: 'tokei',
        meaning: 'Jam / Jam tangan',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b02-11',
        kanji: '傘',
        kana: 'かさ',
        romaji: 'kasa',
        meaning: 'Payung',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b02-12',
        kanji: '鞄',
        kana: 'かばん',
        romaji: 'kaban',
        meaning: 'Tas',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b02-13',
        kanji: '車',
        kana: 'くるま',
        romaji: 'kuruma',
        meaning: 'Mobil / Kendaraan',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b02-14',
        kanji: '鍵',
        kana: 'かぎ',
        romaji: 'kagi',
        meaning: 'Kunci',
        type: 'Kata Benda'
      },
      {
        id: 'n5-b02-15',
        kanji: '机',
        kana: 'つくえ',
        romaji: 'tsukue',
        meaning: 'Meja',
        type: 'Kata Benda'
      }
    ]
  }
]
