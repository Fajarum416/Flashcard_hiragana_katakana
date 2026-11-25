import { db } from './db'
import { supabase } from './supabase'
import { parseSelection, pickSelection } from './settings'
import { useAuth } from '../store/useAuth'
import { useSelection } from '../store/useSelection'
import { useVocabStore } from '../store/useVocabStore'
import { useKanjiStore } from '../store/useKanjiStore'

const LEGACY_SNAPSHOT = 'kana-legacy-snapshot'
const LEGACY_DONE = 'kana-legacy-migrated'

/** Mencatat satu jawaban kana: update stats lokal, lalu masuk antrean untuk dikirim ke server. */
export async function recordAnswer(kanaId: string, correct: boolean): Promise<void> {
  useSelection.getState().record(kanaId, correct)
  await db.pending_answers.add({
    userId: useAuth.getState().user?.id ?? '',
    kanaId,
    correct,
    at: Date.now(),
  })
  void syncNow()
}

/** Mencatat satu jawaban kosakata: update stats lokal, lalu masuk antrean sync ke tabel vocab_progress. */
export async function recordVocabAnswer(
  wordId: string,
  level: string,
  chapter: number,
  correct: boolean
): Promise<void> {
  useVocabStore.getState().recordAnswer(wordId, correct)
  await db.pending_vocab_answers.add({
    userId: useAuth.getState().user?.id ?? '',
    wordId,
    level,
    chapter,
    correct,
    at: Date.now(),
  })
  void syncNow()
}

export interface SessionInput {
  script: 'hiragana' | 'katakana'
  mode: 'char' | 'word'
  composite: boolean
  totalCards: number
  correctCards: number
  durationSec: number
  startedAt: string
}

export async function queueSession(s: SessionInput): Promise<void> {
  await db.pending_sessions.add({ ...s, userId: useAuth.getState().user?.id ?? '' })
  void syncNow()
}

export interface VocabSessionInput {
  level: string
  chapter: number
  totalCards: number
  correctCards: number
  durationSec: number
  startedAt: string
}

export async function queueVocabSession(s: VocabSessionInput): Promise<void> {
  await db.pending_vocab_sessions.add({ ...s, userId: useAuth.getState().user?.id ?? '' })
  void syncNow()
}

/** Mencatat satu jawaban kanji: update stats lokal, lalu masuk antrean sync ke tabel kanji_progress. */
export async function recordKanjiAnswer(
  kanjiId: string,
  level: string,
  chapter: number,
  correct: boolean
): Promise<void> {
  useKanjiStore.getState().recordAnswer(kanjiId, correct)
  await db.pending_kanji_answers.add({
    userId: useAuth.getState().user?.id ?? '',
    kanjiId,
    level,
    chapter,
    correct,
    at: Date.now(),
  })
  void syncNow()
}

export interface KanjiSessionInput {
  level: string
  chapter: number
  totalCards: number
  correctCards: number
  durationSec: number
  startedAt: string
}

export async function queueKanjiSession(s: KanjiSessionInput): Promise<void> {
  await db.pending_kanji_sessions.add({ ...s, userId: useAuth.getState().user?.id ?? '' })
  void syncNow()
}

/** Progres sebelum Tahap 4 hanya ada di stats lokal. Simpan salinannya sekali untuk dimigrasi. */
function initLegacySnapshot() {
  if (localStorage.getItem(LEGACY_SNAPSHOT) !== null) return
  localStorage.setItem(LEGACY_SNAPSHOT, JSON.stringify(useSelection.getState().stats))
}

/** Satu kali per perangkat: kirim progres lama lewat RPC merge_progress. */
async function migrateLegacy(): Promise<void> {
  if (!supabase || localStorage.getItem(LEGACY_DONE)) return
  let stats: Record<string, { ok: number; no: number }> = {}
  try {
    stats = JSON.parse(localStorage.getItem(LEGACY_SNAPSHOT) ?? '{}')
  } catch {
    /* snapshot rusak: anggap kosong */
  }
  const rows = Object.entries(stats)
    .filter(([, v]) => v && v.ok + v.no > 0)
    .map(([kana_id, v]) => ({ kana_id, ok: v.ok, no: v.no }))
  if (rows.length) {
    const { error } = await supabase.rpc('merge_progress', { p: rows })
    if (error) {
      console.warn('[sync] merge_progress gagal:', error.message)
      return // coba lagi di login/online berikutnya
    }
  }

  // Migrasikan progres kosakata lokal pertama kali
  const localVocab = useVocabStore.getState().stats
  const vRows = Object.entries(localVocab)
    .filter(([, v]) => v && v.ok + v.no > 0)
    .map(([word_id, v]) => ({
      word_id,
      level: word_id.startsWith('n4') ? 'N4' : 'N5',
      chapter: 1,
      ok: v.ok,
      no: v.no,
      box: v.box ?? 1,
    }))
  if (vRows.length) {
    try {
      await supabase.rpc('merge_vocab_progress', { p: vRows })
    } catch {
      /* Abaikan jika rpc belum dieksekusi di server */
    }
  }

  localStorage.setItem(LEGACY_DONE, '1')
}

/** Mengirim antrean milik akun yang sedang login. Mengembalikan true jika antrean kosong. */
async function flush(): Promise<boolean> {
  const user = useAuth.getState().user
  if (!supabase || !user || !navigator.onLine) return false

  // klaim item yang dibuat saat belum login
  await db.pending_answers.where('userId').equals('').modify({ userId: user.id })
  await db.pending_sessions.where('userId').equals('').modify({ userId: user.id })
  await db.pending_vocab_answers.where('userId').equals('').modify({ userId: user.id })
  await db.pending_vocab_sessions.where('userId').equals('').modify({ userId: user.id })
  await db.pending_kanji_answers.where('userId').equals('').modify({ userId: user.id })
  await db.pending_kanji_sessions.where('userId').equals('').modify({ userId: user.id })

  // 1. Flush antrean jawaban kana
  const answers = await db.pending_answers.where('userId').equals(user.id).sortBy('id')
  for (const a of answers) {
    const { error } = await supabase.rpc('record_answer', { p_kana_id: a.kanaId, p_correct: a.correct })
    if (error) {
      console.warn('[sync] record_answer gagal:', error.message)
      return false
    }
    await db.pending_answers.delete(a.id!)
  }

  // 2. Flush antrean sesi kana
  const sessions = await db.pending_sessions.where('userId').equals(user.id).sortBy('id')
  for (const s of sessions) {
    const { error } = await supabase.from('study_sessions').insert({
      user_id: user.id,
      script: s.script,
      mode: s.mode,
      composite: s.composite,
      total_cards: s.totalCards,
      correct_cards: s.correctCards,
      duration_sec: s.durationSec,
      started_at: s.startedAt,
    })
    if (error) {
      console.warn('[sync] insert study_sessions gagal:', error.message)
      return false
    }
    await db.pending_sessions.delete(s.id!)
  }

  // 3. Flush antrean jawaban kosakata ke tabel vocab_progress
  const vocabAnswers = await db.pending_vocab_answers.where('userId').equals(user.id).sortBy('id')
  for (const va of vocabAnswers) {
    const { error } = await supabase.rpc('record_vocab_answer', {
      p_word_id: va.wordId,
      p_level: va.level,
      p_chapter: va.chapter,
      p_correct: va.correct,
    })
    if (error) {
      console.warn('[sync] record_vocab_answer gagal:', error.message)
      return false
    }
    await db.pending_vocab_answers.delete(va.id!)
  }

  // 4. Flush antrean sesi kosakata ke tabel vocab_sessions
  const vocabSessions = await db.pending_vocab_sessions.where('userId').equals(user.id).sortBy('id')
  for (const vs of vocabSessions) {
    const { error } = await supabase.from('vocab_sessions').insert({
      user_id: user.id,
      level: vs.level,
      chapter: vs.chapter,
      total_cards: vs.totalCards,
      correct_cards: vs.correctCards,
      duration_sec: vs.durationSec,
      started_at: vs.startedAt,
    })
    if (error) {
      console.warn('[sync] insert vocab_sessions gagal:', error.message)
      return false
    }
    await db.pending_vocab_sessions.delete(vs.id!)
  }

  // 5. Flush antrean jawaban kanji ke tabel kanji_progress
  const kanjiAnswers = await db.pending_kanji_answers.where('userId').equals(user.id).sortBy('id')
  for (const ka of kanjiAnswers) {
    const { error } = await supabase.rpc('record_kanji_answer', {
      p_kanji_id: ka.kanjiId,
      p_level: ka.level,
      p_chapter: ka.chapter,
      p_correct: ka.correct,
    })
    if (error) {
      console.warn('[sync] record_kanji_answer gagal:', error.message)
      return false
    }
    await db.pending_kanji_answers.delete(ka.id!)
  }

  // 6. Flush antrean sesi kanji ke tabel kanji_sessions
  const kanjiSessions = await db.pending_kanji_sessions.where('userId').equals(user.id).sortBy('id')
  for (const ks of kanjiSessions) {
    const { error } = await supabase.from('kanji_sessions').insert({
      user_id: user.id,
      level: ks.level,
      chapter: ks.chapter,
      total_cards: ks.totalCards,
      correct_cards: ks.correctCards,
      duration_sec: ks.durationSec,
      started_at: ks.startedAt,
    })
    if (error) {
      console.warn('[sync] insert kanji_sessions gagal:', error.message)
      return false
    }
    await db.pending_kanji_sessions.delete(ks.id!)
  }

  return true
}

let lastPushed = ''

async function pushSettings(): Promise<void> {
  const user = useAuth.getState().user
  if (!supabase || !user || !navigator.onLine) return
  const selection = pickSelection(useSelection.getState())
  const json = JSON.stringify(selection)
  if (json === lastPushed) return
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, selection, updated_at: new Date().toISOString() })
  if (error) console.warn('[sync] simpan user_settings gagal:', error.message)
  else lastPushed = json
}

/** Server menjadi sumber kebenaran: ambil progres dan pilihan kolom. */
async function pull(userId: string): Promise<void> {
  if (!supabase) return
  const [prog, set, vprog, kprog] = await Promise.all([
    supabase.from('card_progress').select('kana_id, ok, no, box, last_reviewed_at'),
    supabase.from('user_settings').select('selection').eq('user_id', userId).maybeSingle(),
    supabase.from('vocab_progress').select('word_id, ok, no, box, last_reviewed_at'),
    supabase.from('kanji_progress').select('kanji_id, ok, no, box, last_reviewed_at'),
  ])

  // Pull progress aksara kana
  if (prog.error) {
    console.warn('[sync] ambil card_progress gagal:', prog.error.message)
  } else if (prog.data) {
    const stats: Record<string, { ok: number; no: number; box?: number; lastReviewedAt?: number }> = {}
    for (const r of prog.data) {
      stats[r.kana_id] = {
        ok: r.ok,
        no: r.no,
        box: r.box,
        lastReviewedAt: r.last_reviewed_at ? new Date(r.last_reviewed_at).getTime() : undefined,
      }
    }
    useSelection.getState().setStats(stats)
  }

  // Pull progress kosakata dari tabel vocab_progress
  if (vprog.error) {
    console.warn('[sync] ambil vocab_progress gagal (tabel belum dibuat?):', vprog.error.message)
  } else if (vprog.data) {
    const vocabStats: Record<string, { ok: number; no: number; box?: number; lastReviewedAt?: number }> = {}
    for (const r of vprog.data) {
      vocabStats[r.word_id] = {
        ok: r.ok,
        no: r.no,
        box: r.box,
        lastReviewedAt: r.last_reviewed_at ? new Date(r.last_reviewed_at).getTime() : undefined,
      }
    }
    useVocabStore.getState().setStats(vocabStats)
  }

  // Pull progress kanji dari tabel kanji_progress
  if (kprog.error) {
    console.warn('[sync] ambil kanji_progress gagal (tabel belum dibuat?):', kprog.error.message)
  } else if (kprog.data) {
    const kanjiStats: Record<string, { ok: number; no: number; box?: number; lastReviewedAt?: number }> = {}
    for (const r of kprog.data) {
      kanjiStats[r.kanji_id] = {
        ok: r.ok,
        no: r.no,
        box: r.box,
        lastReviewedAt: r.last_reviewed_at ? new Date(r.last_reviewed_at).getTime() : undefined,
      }
    }
    useKanjiStore.getState().setStats(kanjiStats)
  }

  if (set.error) {
    console.warn('[sync] ambil user_settings gagal:', set.error.message)
    return
  }
  const remote = set.data ? parseSelection(set.data.selection) : null
  if (remote) {
    useSelection.getState().applySelection(remote)
    lastPushed = JSON.stringify(remote)
  } else {
    lastPushed = '' // belum ada di server: unggah pilihan lokal
    await pushSettings()
  }
}

let chain: Promise<void> = Promise.resolve()

/** Sinkronisasi penuh, dijalankan berurutan agar tidak saling tabrak. */
export function syncNow(): Promise<void> {
  chain = chain.then(async () => {
    const user = useAuth.getState().user
    if (!user) return
    initLegacySnapshot()
    await migrateLegacy()
    const flushed = await flush()
    if (flushed) await pull(user.id)
  })
  return chain
}

export function startSync(): () => void {
  const onOnline = () => void syncNow()
  window.addEventListener('online', onOnline)
  const timer = window.setInterval(() => {
    if (navigator.onLine && useAuth.getState().user) void syncNow()
  }, 60_000)
  return () => {
    window.removeEventListener('online', onOnline)
    window.clearInterval(timer)
  }
}
