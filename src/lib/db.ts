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

export const db = new Dexie('kana-sync') as Dexie & {
  pending_answers: EntityTable<PendingAnswer, 'id'>
  pending_sessions: EntityTable<PendingSession, 'id'>
}

db.version(1).stores({
  pending_answers: '++id, userId',
  pending_sessions: '++id, userId',
})
