export type KanjiLevel = 'n5' | 'n4' | 'jft'

export interface KanjiExample {
  word: string
  reading: string
  meaning: string
}

export interface KanjiItem {
  id: string // e.g., 'n5-k01-01'
  kanji: string
  onyomi: string // katakana / romaji reading
  kunyomi: string // hiragana / romaji reading
  meaning: string // Bahasa Indonesia
  mnemonic?: string
  image?: string
  examples?: KanjiExample[]
}

export interface KanjiChapter {
  level: KanjiLevel
  chapter: number
  title: string
  description?: string
  items: KanjiItem[]
}
