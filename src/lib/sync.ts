import { db } from './db'
import { supabase } from './supabase'
import { parseSelection, pickSelection } from './settings'
import { useAuth } from '../store/useAuth'
import { useSelection } from '../store/useSelection'

const LEGACY_SNAPSHOT = 'kana-legacy-snapshot'
const LEGACY_DONE = 'kana-legacy-migrated'

/** Mencatat satu jawaban: update stats lokal, lalu masuk antrean untuk dikirim ke server. */
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
      console.warn('[sync] merge_progress gagal (sudah menjalankan migrasi 20261121000100_sync.sql?):', error.message)
      return // coba lagi di login/online berikutnya
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

  const answers = await db.pending_answers.where('userId').equals(user.id).sortBy('id')
  for (const a of answers) {
    const { error } = await supabase.rpc('record_answer', { p_kana_id: a.kanaId, p_correct: a.correct })
    if (error) {
      console.warn('[sync] record_answer gagal:', error.message)
      return false
    }
    await db.pending_answers.delete(a.id!)
  }

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
  const [prog, set] = await Promise.all([
    supabase.from('card_progress').select('kana_id, ok, no'),
    supabase.from('user_settings').select('selection').eq('user_id', userId).maybeSingle(),
  ])

  if (prog.error) console.warn('[sync] ambil card_progress gagal:', prog.error.message)
  else {
    const stats: Record<string, { ok: number; no: number }> = {}
    for (const r of prog.data) stats[r.kana_id] = { ok: r.ok, no: r.no }
    useSelection.getState().setStats(stats)
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
    if (!supabase || !user) return
    try {
      await migrateLegacy()
      const empty = await flush()
      if (empty && localStorage.getItem(LEGACY_DONE)) await pull(user.id)
    } catch (e) {
      console.warn('[sync] gagal:', e)
    }
  })
  return chain
}

/** Mulai sinkronisasi otomatis. Mengembalikan fungsi pembersih. */
export function startSync(): () => void {
  initLegacySnapshot()

  const unsubAuth = useAuth.subscribe((s, prev) => {
    if (s.user?.id !== prev.user?.id) {
      lastPushed = ''
      void syncNow()
    }
  })

  let timer: number | undefined
  const unsubSel = useSelection.subscribe(() => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void pushSettings(), 800)
  })

  const onOnline = () => void syncNow()
  window.addEventListener('online', onOnline)
  void syncNow()

  return () => {
    unsubAuth()
    unsubSel()
    window.clearTimeout(timer)
    window.removeEventListener('online', onOnline)
  }
}
