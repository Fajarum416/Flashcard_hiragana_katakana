import Dexie, { type EntityTable } from 'dexie'

/** userId '' = dibuat saat belum login; diklaim oleh akun yang login berikutnya di perangkat ini. */
export interface PendingAnswer {
  id?: number
  userId: string
  kanaId: string
  correct: boolean
  at: number
}

export interface PendingSession {
  id?: number
  userId: string
  script: 'hiragana' | 'katakana'
  mode: 'char' | 'word'
  composite: boolean
  totalCards: number
  correctCards: number
  durationSec: number
  startedAt: string
}

export interface PendingVocabAnswer {
  id?: number
  userId: string
  wordId: string
  level: string
  chapter: number
  correct: boolean
  at: number
}

export interface PendingVocabSession {
  id?: number
  userId: string
  level: string
  chapter: number
  totalCards: number
  correctCards: number
  durationSec: number
  startedAt: string
}

export interface PendingKanjiAnswer {
  id?: number
  userId: string
  kanjiId: string
  level: string
  chapter: number
  correct: boolean
  at: number
}

export interface PendingKanjiSession {
  id?: number
  userId: string
  level: string
  chapter: number
  totalCards: number
  correctCards: number
  durationSec: number
  startedAt: string
}

export interface CachedVocabChapter {
  id: string
  level: 'n5' | 'n4'
  chapter: number
  title: string
  description?: string
  published?: boolean
}

export interface CachedVocabWord {
  id: string
  chapterId: string
  sortOrder: number
  kanji?: string
  kana: string
  romaji: string
  meaning: string
  type?: string
  exampleJp?: string
  exampleId?: string
}

export interface CachedKanjiChapter {
  id: string
  level: 'n5' | 'n4' | 'jft'
  chapter: number
  title: string
  description?: string
  published?: boolean
}

export interface CachedKanjiItem {
  id: string
  chapterId: string
  sortOrder: number
  kanji: string
  onyomi: string
  kunyomi: string
  meaning: string
  mnemonic?: string
  image?: string
  examples?: { word: string; reading: string; meaning: string }[]
}

export const db = new Dexie('kana-sync') as Dexie & {
  pending_answers: EntityTable<PendingAnswer, 'id'>
  pending_sessions: EntityTable<PendingSession, 'id'>
  pending_vocab_answers: EntityTable<PendingVocabAnswer, 'id'>
  pending_vocab_sessions: EntityTable<PendingVocabSession, 'id'>
  pending_kanji_answers: EntityTable<PendingKanjiAnswer, 'id'>
  pending_kanji_sessions: EntityTable<PendingKanjiSession, 'id'>
  cached_vocab_chapters: EntityTable<CachedVocabChapter, 'id'>
  cached_vocab_words: EntityTable<CachedVocabWord, 'id'>
  cached_kanji_chapters: EntityTable<CachedKanjiChapter, 'id'>
  cached_kanji_items: EntityTable<CachedKanjiItem, 'id'>
}

db.version(1).stores({
  pending_answers: '++id, userId',
  pending_sessions: '++id, userId',
})

db.version(2).stores({
  pending_answers: '++id, userId',
  pending_sessions: '++id, userId',
  pending_vocab_answers: '++id, userId',
  pending_vocab_sessions: '++id, userId',
})

db.version(3).stores({
  pending_answers: '++id, userId',
  pending_sessions: '++id, userId',
  pending_vocab_answers: '++id, userId',
  pending_vocab_sessions: '++id, userId',
  pending_kanji_answers: '++id, userId',
  pending_kanji_sessions: '++id, userId',
})

db.version(4).stores({
  pending_answers: '++id, userId',
  pending_sessions: '++id, userId',
  pending_vocab_answers: '++id, userId',
  pending_vocab_sessions: '++id, userId',
  pending_kanji_answers: '++id, userId',
  pending_kanji_sessions: '++id, userId',
  cached_vocab_chapters: 'id, level, chapter',
  cached_vocab_words: 'id, chapterId, sortOrder',
  cached_kanji_chapters: 'id, level, chapter',
  cached_kanji_items: 'id, chapterId, sortOrder',
})
