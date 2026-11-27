import { supabase } from './supabase'
import { TOTAL_CARDS, percent, type ProgressRow } from './mastery'

function client() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi')
  return supabase
}

export interface Overview {
  total_users: number
  dau: number
  wau: number
  top_mistakes: { kana_id: string; wrong: number; correct: number }[]
}

export async function fetchOverview(): Promise<Overview> {
  const { data, error } = await client().rpc('admin_overview')
  if (error) throw new Error(error.message)
  return data as Overview
}

export interface AdminUser {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: 'user' | 'admin'
  disabled: boolean
  created_at: string
  last_login_at: string | null
  hiraganaPct: number
  katakanaPct: number
  vocabMastered: number
  kanjiMastered: number
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const c = client()
  const [profiles, mastery, vocabMastery, kanjiMastery] = await Promise.all([
    c.from('profiles').select('id, email, display_name, avatar_url, role, disabled, created_at, last_login_at').order('created_at', { ascending: false }),
    c.from('user_mastery').select('user_id, script, mastered'),
    c.from('vocab_progress').select('user_id').gte('box', 4),
    c.from('kanji_progress').select('user_id').gte('box', 4),
  ])
  if (profiles.error) throw new Error(profiles.error.message)
  if (mastery.error) throw new Error(mastery.error.message)
  const m = new Map<string, number>()
  for (const r of mastery.data) m.set(`${r.user_id}:${r.script}`, Number(r.mastered))

  const vocabCounts = new Map<string, number>()
  if (!vocabMastery.error && vocabMastery.data) {
    for (const r of vocabMastery.data) {
      vocabCounts.set(r.user_id, (vocabCounts.get(r.user_id) ?? 0) + 1)
    }
  }

  const kanjiCounts = new Map<string, number>()
  if (!kanjiMastery.error && kanjiMastery.data) {
    for (const r of kanjiMastery.data) {
      kanjiCounts.set(r.user_id, (kanjiCounts.get(r.user_id) ?? 0) + 1)
    }
  }

  return profiles.data.map((p) => ({
    ...(p as Omit<AdminUser, 'hiraganaPct' | 'katakanaPct' | 'vocabMastered' | 'kanjiMastered'>),
    hiraganaPct: percent(m.get(`${p.id}:hiragana`) ?? 0, TOTAL_CARDS),
    katakanaPct: percent(m.get(`${p.id}:katakana`) ?? 0, TOTAL_CARDS),
    vocabMastered: vocabCounts.get(p.id) ?? 0,
    kanjiMastered: kanjiCounts.get(p.id) ?? 0,
  }))
}

export interface SessionRow {
  id: string
  script: 'hiragana' | 'katakana'
  mode: 'char' | 'word'
  composite: boolean
  total_cards: number
  correct_cards: number
  duration_sec: number | null
  started_at: string
}

export interface MaterialSessionRow {
  id: string | number
  level: string
  chapter: number
  total_cards: number
  correct_cards: number
  duration_sec: number | null
  started_at: string
}

export interface UserDetail {
  profile: Omit<AdminUser, 'hiraganaPct' | 'katakanaPct' | 'vocabMastered' | 'kanjiMastered'>
  progress: Map<string, ProgressRow>
  sessions: SessionRow[]
  vocabProgress: Map<string, ProgressRow>
  vocabSessions: MaterialSessionRow[]
  kanjiProgress: Map<string, ProgressRow>
  kanjiSessions: MaterialSessionRow[]
}

export async function fetchUserDetail(id: string): Promise<UserDetail> {
  const c = client()
  const [p, prog, ses, vp, vs, kp, ks] = await Promise.all([
    c.from('profiles').select('id, email, display_name, avatar_url, role, disabled, created_at, last_login_at').eq('id', id).maybeSingle(),
    c.from('card_progress').select('kana_id, ok, no, box').eq('user_id', id),
    c.from('study_sessions').select('*').eq('user_id', id).order('started_at', { ascending: false }).limit(500),
    c.from('vocab_progress').select('word_id, ok, no, box').eq('user_id', id),
    c.from('vocab_sessions').select('id, level, chapter, total_cards, correct_cards, duration_sec, started_at').eq('user_id', id).order('started_at', { ascending: false }).limit(200),
    c.from('kanji_progress').select('kanji_id, ok, no, box').eq('user_id', id),
    c.from('kanji_sessions').select('id, level, chapter, total_cards, correct_cards, duration_sec, started_at').eq('user_id', id).order('started_at', { ascending: false }).limit(200),
  ])
  if (p.error) throw new Error(p.error.message)
  if (!p.data) throw new Error('Pengguna tidak ditemukan')
  if (prog.error) throw new Error(prog.error.message)
  if (ses.error) throw new Error(ses.error.message)

  const progress = new Map<string, ProgressRow>()
  for (const r of prog.data) progress.set(r.kana_id, { ok: r.ok, no: r.no, box: r.box })

  const vocabProgress = new Map<string, ProgressRow>()
  if (!vp.error && vp.data) {
    for (const r of vp.data) vocabProgress.set(r.word_id, { ok: r.ok, no: r.no, box: r.box })
  }

  const kanjiProgress = new Map<string, ProgressRow>()
  if (!kp.error && kp.data) {
    for (const r of kp.data) kanjiProgress.set(r.kanji_id, { ok: r.ok, no: r.no, box: r.box })
  }

  return {
    profile: p.data as UserDetail['profile'],
    progress,
    sessions: ses.data as SessionRow[],
    vocabProgress,
    vocabSessions: (!vs.error && vs.data ? vs.data : []) as MaterialSessionRow[],
    kanjiProgress,
    kanjiSessions: (!ks.error && ks.data ? ks.data : []) as MaterialSessionRow[],
  }
}

export async function resetProgress(id: string): Promise<void> {
  const { error } = await client().rpc('admin_reset_progress', { p_user: id })
  if (error) throw new Error(error.message)
}

export async function setDisabled(id: string, disabled: boolean): Promise<void> {
  const { error } = await client().rpc('admin_set_disabled', { p_user: id, p_disabled: disabled })
  if (error) throw new Error(error.message)
}

export async function setRole(id: string, role: 'user' | 'admin'): Promise<void> {
  const { error } = await client().rpc('admin_set_role', { p_user: id, p_role: role })
  if (error) throw new Error(error.message)
}
