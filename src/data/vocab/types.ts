export interface VocabWord {
  id: string              // Contoh: "n5-b01-01"
  kanji?: string          // Kanji (jika ada), contoh: "先生"
  kana: string            // Pembacaan Hiragana/Katakana, contoh: "せんせい"
  romaji: string          // Cara baca alfabet, contoh: "sensei"
  meaning: string         // Terjemahan Bahasa Indonesia, contoh: "Guru / Pengajar"
  type?: string           // Tipe kata (KB, KK, KS-i, KS-na, dll.)
  exampleJp?: string      // Contoh kalimat bahasa Jepang
  exampleId?: string      // Terjemahan contoh kalimat
}

export interface VocabChapter {
  chapter: number         // 1, 2, 3...
  title: string           // Contoh: "Bab 1: Perkenalan Diri"
  description?: string    // Penjelasan singkat bab
  words: VocabWord[]
}

export interface VocabLevel {
  level: 'N5' | 'N4'
  title: string
  chapters: VocabChapter[]
}
