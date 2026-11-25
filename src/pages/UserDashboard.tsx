import { useEffect, useRef, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { COL_IDS, TABLE, YOON_IDS, YOON_TABLE, type Script } from '../data/kana'
import { fetchUserDetail, type SessionRow } from '../lib/admin'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { TOTAL_CARDS, masteryLevel, percent, streak, type Level, type ProgressRow } from '../lib/mastery'
import { getMasteryLabel } from '../lib/srs'
import { syncNow } from '../lib/sync'
import { useAuth } from '../store/useAuth'
import { useSelection } from '../store/useSelection'
import { useVocabStore } from '../store/useVocabStore'
import { useKanjiStore } from '../store/useKanjiStore'
import { useContentStore } from '../store/useContentStore'
import { type KanjiLevel } from '../data/kanji'

const LEVEL_STYLES: Record<Level, { boxClass: string; textClass: string; label: string }> = {
  none: {
    boxClass: 'bg-pill border-muted',
    textClass: 'text-muted',
    label: 'Belum dipelajari',
  },
  weak: {
    boxClass: 'bg-[rgba(240,131,111,0.25)] border-bad',
    textClass: 'text-bad',
    label: 'Lemah (<60%)',
  },
  learning: {
    boxClass: 'bg-[rgba(235,185,80,0.25)] border-[#e6a23c]',
    textClass: 'text-[#e6a23c]',
    label: 'Masih Belajar',
  },
  almost: {
    boxClass: 'bg-[rgba(138,167,255,0.25)] border-accent',
    textClass: 'text-accent',
    label: 'Hampir Hafal',
  },
  mastered: {
    boxClass: 'bg-[rgba(94,196,154,0.25)] border-ok',
    textClass: 'text-ok',
    label: 'Hafal Kuat (≥80%)',
  },
}

export default function UserDashboard() {
  const { user, loading: authLoading } = useAuth()
  const localStats = useSelection((s) => s.stats)

  const [progress, setProgress] = useState<Map<string, ProgressRow>>(new Map())
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mainTab, setMainTab] = useState<'kana' | 'vocab' | 'kanji'>('kana')
  const [activeTab, setActiveTab] = useState<Script>('hiragana')
  const [vocabLevel, setVocabLevel] = useState<'n5' | 'n4'>('n5')
  const [vocabSessions, setVocabSessions] = useState<any[]>([])
  const [kanjiLevel, setKanjiLevel] = useState<KanjiLevel>('n5')
  const [kanjiSessions, setKanjiSessions] = useState<any[]>([])
  const weakScrollRef = useRef<HTMLDivElement>(null)
  const weakKanjiScrollRef = useRef<HTMLDivElement>(null)

  const vocabStats = useVocabStore((s) => s.stats)
  const getChapterStats = useVocabStore((s) => s.getChapterStats)
  const kanjiStats = useKanjiStore((s) => s.stats)
  const getKanjiChapterStats = useKanjiStore((s) => s.getChapterStats)
  const vocabChapters = useContentStore((s) => s.vocabChapters)
  const kanjiChapters = useContentStore((s) => s.kanjiChapters)

  const load = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      await syncNow()
      const detail = await fetchUserDetail(user.id)
      const merged = new Map<string, ProgressRow>(detail.progress)
      for (const [k, v] of Object.entries(useSelection.getState().stats)) {
        if (!merged.has(k) && v && v.ok + v.no > 0) {
          merged.set(k, { ok: v.ok, no: v.no, box: v.box ?? 1 })
        }
      }

      const pendingSes = await db.pending_sessions.toArray()
      const localRows: SessionRow[] = pendingSes.map((p, idx) => ({
        id: `local-${p.id ?? idx}`,
        script: p.script,
        mode: p.mode,
        composite: p.composite,
        total_cards: p.totalCards,
        correct_cards: p.correctCards,
        duration_sec: p.durationSec,
        started_at: p.startedAt,
      }))

      setProgress(merged)
      setSessions([...localRows, ...detail.sessions])

      // Load vocab sessions from Dexie and Supabase
      const pendingVocabSes = await db.pending_vocab_sessions.toArray()
      const localVocabRows = pendingVocabSes.map((p, idx) => ({
        id: `local-vocab-${p.id ?? idx}`,
        level: p.level,
        chapter: p.chapter,
        total_cards: p.totalCards,
        correct_cards: p.correctCards,
        duration_sec: p.durationSec,
        started_at: p.startedAt,
      }))

      let remoteVocabSessions: any[] = []
      if (supabase) {
        try {
          const { data: vSes } = await supabase
            .from('vocab_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false })
            .limit(20)
          if (vSes) remoteVocabSessions = vSes
        } catch {
          /* Abaikan jika tabel belum ada */
        }
      }
      setVocabSessions([...localVocabRows, ...remoteVocabSessions])

      // Load kanji sessions from Dexie and Supabase
      const pendingKanjiSes = await db.pending_kanji_sessions.toArray()
      const localKanjiRows = pendingKanjiSes.map((p, idx) => ({
        id: `local-kanji-${p.id ?? idx}`,
        level: p.level,
        chapter: p.chapter,
        total_cards: p.totalCards,
        correct_cards: p.correctCards,
        duration_sec: p.durationSec,
        started_at: p.startedAt,
      }))

      let remoteKanjiSessions: any[] = []
      if (supabase) {
        try {
          const { data: kSes } = await supabase
            .from('kanji_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false })
            .limit(20)
          if (kSes) remoteKanjiSessions = kSes
        } catch {
          /* Abaikan jika tabel belum ada */
        }
      }
      setKanjiSessions([...localKanjiRows, ...remoteKanjiSessions])
    } catch (err: any) {
      // Fallback ke data lokal jika sedang offline
      const fallback = new Map<string, ProgressRow>()
      for (const [k, v] of Object.entries(localStats)) {
        if (v && v.ok + v.no > 0) {
          fallback.set(k, { ok: v.ok, no: v.no, box: v.box ?? 1 })
        }
      }
      setProgress(fallback)
      setError(err?.message ?? null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) void load()
  }, [user?.id])

  if (authLoading) {
    return <p className="text-muted text-[13px] text-center py-[60px]">Memuat sesi pengguna...</p>
  }

  if (!user) {
    return <Navigate to="/hiragana/flashcard" replace />
  }

  let hiraMastered = 0
  let kataMastered = 0
  for (const [k, v] of progress.entries()) {
    if (masteryLevel(v) === 'mastered') {
      if (k.startsWith('hiragana:')) hiraMastered++
      else if (k.startsWith('katakana:')) kataMastered++
    }
  }
  const hiraPct = percent(hiraMastered, TOTAL_CARDS)
  const kataPct = percent(kataMastered, TOTAL_CARDS)
  const userStreak = streak(sessions.map((s) => s.started_at))

  // Analitik Kosakata
  const n5VocabChapters = vocabChapters.filter((c) => c.level === 'n5')
  const n4VocabChapters = vocabChapters.filter((c) => c.level === 'n4')
  const allVocab = vocabChapters.flatMap((c) => c.words)
  const totalVocabWords = allVocab.length
  let vocabMastered = 0
  let vocabAlmost = 0
  let vocabLearning = 0
  let vocabWeak = 0
  let vocabNone = 0

  for (const w of allVocab) {
    const s = vocabStats[w.id]
    if (!s || (s.ok === 0 && s.no === 0)) {
      vocabNone++
    } else if ((s.box ?? 1) >= 4) {
      vocabMastered++
    } else if ((s.box ?? 1) === 3) {
      vocabAlmost++
    } else if (s.no > s.ok) {
      vocabWeak++
    } else {
      vocabLearning++
    }
  }

  const vocabPct = totalVocabWords > 0 ? Math.round((vocabMastered / totalVocabWords) * 100) : 0

  // Kosakata yang butuh review / sering salah
  const weakWords = allVocab
    .map((w) => {
      const ch = vocabChapters.find((c) => c.words.some((word) => word.id === w.id))
      return {
        ...w,
        level: (ch?.level ?? 'n5').toUpperCase(),
        chapter: ch?.chapter ?? 1,
      }
    })
    .filter((w) => {
      const s = vocabStats[w.id]
      return s && (s.no > 0 || (s.ok > 0 && (s.box ?? 1) === 1))
    })
    .sort((a, b) => {
      const sA = vocabStats[a.id]?.no ?? 0
      const sB = vocabStats[b.id]?.no ?? 0
      return sB - sA
    })

  const activeChapters = vocabLevel === 'n5' ? n5VocabChapters : n4VocabChapters

  // Kalkulasi statistik Kanji
  const allKanji = kanjiChapters.flatMap((c) => c.items)
  const totalKanjiItems = allKanji.length
  let kanjiMastered = 0
  let kanjiNone = 0
  let kanjiWeak = 0
  let kanjiLearning = 0
  let kanjiAlmost = 0

  for (const k of allKanji) {
    const s = kanjiStats[k.id]
    if (!s || s.ok + s.no === 0) {
      kanjiNone++
    } else if ((s.box ?? 1) >= 4) {
      kanjiMastered++
    } else if ((s.box ?? 1) === 3) {
      kanjiAlmost++
    } else if ((s.box ?? 1) === 2) {
      kanjiLearning++
    } else {
      kanjiWeak++
    }
  }

  const kanjiPct = totalKanjiItems > 0 ? Math.round((kanjiMastered / totalKanjiItems) * 100) : 0

  const weakKanji = allKanji
    .map((k) => {
      const ch = kanjiChapters.find((c) => c.items.some((item) => item.id === k.id))
      return {
        ...k,
        level: (ch?.level ?? 'n5').toUpperCase(),
        chapter: ch?.chapter ?? 1,
      }
    })
    .filter((k) => {
      const s = kanjiStats[k.id]
      return s && (s.no > 0 || (s.ok > 0 && (s.box ?? 1) === 1))
    })
    .sort((a, b) => {
      const sA = kanjiStats[a.id]?.no ?? 0
      const sB = kanjiStats[b.id]?.no ?? 0
      return sB - sA
    })

  const activeKanjiChapters = kanjiChapters.filter((c) => c.level === kanjiLevel)

  return (
    <div>
      {error && (
        <div className="mb-4 text-xs text-muted">
          Menampilkan sinkronisasi terakhir ({error})
        </div>
      )}

      {/* Progress Summary Header */}
      <div className="bg-panel border border-line rounded-xl p-5 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-line shrink-0">
              <img
                alt={user.user_metadata?.full_name ?? user.email ?? 'Profil'}
                className="w-full h-full object-cover"
                src={
                  user.user_metadata?.avatar_url ||
                  user.user_metadata?.picture ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email ?? 'User')}`
                }
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="m-0 text-xl font-bold text-ink">
                  {user.user_metadata?.full_name || user.email || 'Pelajar'}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-pill text-ink font-medium border border-line">
                  🔥 {userStreak} hari
                </span>
              </div>
              {user.email && (
                <p className="text-xs text-muted m-0 mt-0.5">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="border border-line rounded-full bg-pill hover:bg-pill-on text-ink font-semibold text-xs px-4 py-2 cursor-pointer transition-colors"
              onClick={() => void load()}
            >
              ↻ Segarkan Data
            </button>
          </div>
        </div>

        {/* 5 Mastery Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-5 pt-5 border-t border-line">
          {/* Hiragana */}
          <div className="bg-bg/50 border border-line rounded-xl p-3.5">
            <div className="flex justify-between items-center text-xs text-muted mb-1.5">
              <span>Hiragana ({hiraMastered}/{TOTAL_CARDS})</span>
              <span className="font-semibold text-ink">{hiraPct}%</span>
            </div>
            <div className="w-full h-2 bg-pill rounded overflow-hidden">
              <div className="h-full bg-ok transition-all" style={{ width: `${hiraPct}%` }} />
            </div>
          </div>

          {/* Katakana */}
          <div className="bg-bg/50 border border-line rounded-xl p-3.5">
            <div className="flex justify-between items-center text-xs text-muted mb-1.5">
              <span>Katakana ({kataMastered}/{TOTAL_CARDS})</span>
              <span className="font-semibold text-ink">{kataPct}%</span>
            </div>
            <div className="w-full h-2 bg-pill rounded overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${kataPct}%` }} />
            </div>
          </div>

          {/* Kosakata */}
          <div className="bg-bg/50 border border-line rounded-xl p-3.5">
            <div className="flex justify-between items-center text-xs text-muted mb-1.5">
              <span>Kosakata ({vocabMastered}/{totalVocabWords})</span>
              <span className="font-semibold text-ink">{vocabPct}%</span>
            </div>
            <div className="w-full h-2 bg-pill rounded overflow-hidden">
              <div className="h-full bg-[#e6a23c] transition-all" style={{ width: `${vocabPct}%` }} />
            </div>
          </div>

          {/* Kanji */}
          <div className="bg-bg/50 border border-line rounded-xl p-3.5">
            <div className="flex justify-between items-center text-xs text-muted mb-1.5">
              <span>Kanji ({kanjiMastered}/{totalKanjiItems})</span>
              <span className="font-semibold text-ink">{kanjiPct}%</span>
            </div>
            <div className="w-full h-2 bg-pill rounded overflow-hidden">
              <div className="h-full bg-secondary transition-all" style={{ width: `${kanjiPct}%` }} />
            </div>
          </div>

          {/* Sesi */}
          <div className="bg-bg/50 border border-line rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <small className="text-muted block text-xs">Total Sesi Latihan</small>
              <span className="text-xl font-bold text-ink">
                {sessions.length + vocabSessions.length + kanjiSessions.length} Sesi
              </span>
            </div>
            <span className="text-2xl">📊</span>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-[13px] text-center py-10">Memuat data analitik...</p>
      ) : (
        <div className="tabs tabs-lift">
          <input
            type="radio"
            name="dashboard_main_tabs"
            className="tab font-bold text-sm"
            aria-label="Hiragana & Katakana"
            checked={mainTab === 'kana'}
            onChange={() => setMainTab('kana')}
          />
          <div className="tab-content bg-base-100 border-base-300 p-4 sm:p-6">
            {/* KANA ANALYTICS VIEW */}
          {/* Heatmap Section */}
          <div className="bg-panel border border-line rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
              <div>
                <h3 className="m-0 text-base font-semibold text-ink">Heatmap Hafalan Karakter</h3>
                <p className="text-muted text-xs mt-1 mb-0">
                  Status hafalan tiap huruf berdasarkan tingkat akurasi & pengulangan.
                </p>
              </div>
              <div className="inline-flex bg-pill border border-line rounded-full p-1" role="group">
                <button
                  type="button"
                  className={`border-0 rounded-full cursor-pointer text-sm font-medium px-4 py-1.5 transition-colors ${
                    activeTab === 'hiragana' ? 'bg-accent text-white shadow-sm' : 'bg-transparent text-muted hover:text-ink'
                  }`}
                  onClick={() => setActiveTab('hiragana')}
                >
                  Hiragana
                </button>
                <button
                  type="button"
                  className={`border-0 rounded-full cursor-pointer text-sm font-medium px-4 py-1.5 transition-colors ${
                    activeTab === 'katakana' ? 'bg-accent text-white shadow-sm' : 'bg-transparent text-muted hover:text-ink'
                  }`}
                  onClick={() => setActiveTab('katakana')}
                >
                  Katakana
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-3 flex-wrap mb-5 text-xs">
              {Object.entries(LEVEL_STYLES).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-[3px] border ${val.boxClass}`} />
                  <span className="text-muted">{val.label}</span>
                </div>
              ))}
            </div>

            {/* Gojuon Heatmap */}
            <h4 className="m-0 mb-2.5 text-sm text-muted font-medium">Tunggal (Gojūon & Dakuten - 71 Huruf)</h4>
            <div className="overflow-x-auto pb-3 mb-5">
              <div className="grid grid-cols-[repeat(16,minmax(48px,1fr))] gap-1.5 min-w-[800px]">
                {COL_IDS.map((id) => (
                  <div key={id} className="flex flex-col gap-1.5">
                    <div className="text-center text-[11px] text-muted">{id}</div>
                    {TABLE[activeTab][id].map((cell, idx) => {
                      if (!cell) return <div key={idx} className="h-12 bg-transparent" />
                      const key = `${activeTab}:${cell.k}`
                      const stat = progress.get(key)
                      const level = masteryLevel(stat)
                      const st = LEVEL_STYLES[level]
                      const title = stat
                        ? `${cell.k} (${cell.r}) - Benar: ${stat.ok}, Salah: ${stat.no}, Status: ${getMasteryLabel(stat.box)}`
                        : `${cell.k} (${cell.r}) - Belum dicoba`
                      return (
                        <div
                          key={cell.k}
                          title={title}
                          className={`h-12 rounded-md border flex flex-col items-center justify-center cursor-default ${st.boxClass}`}
                        >
                          <span className={`jp text-lg font-medium ${st.textClass}`}>{cell.k}</span>
                          <small className="text-[9px] text-muted">{cell.r}</small>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Yoon Heatmap */}
            <h4 className="m-0 mb-2.5 text-sm text-muted font-medium">Gabungan (Yōon - 33 Huruf)</h4>
            <div className="overflow-x-auto pb-3">
              <div className="grid grid-cols-[repeat(11,minmax(64px,1fr))] gap-1.5 min-w-[700px]">
                {YOON_IDS.map((id) => (
                  <div key={id} className="flex flex-col gap-1.5">
                    <div className="text-center text-[11px] text-muted">{id}</div>
                    {YOON_TABLE[activeTab][id].map((cell) => {
                      const key = `${activeTab}:${cell.k}`
                      const stat = progress.get(key)
                      const level = masteryLevel(stat)
                      const st = LEVEL_STYLES[level]
                      const title = stat
                        ? `${cell.k} (${cell.r}) - Benar: ${stat.ok}, Salah: ${stat.no}, Status: ${getMasteryLabel(stat.box)}`
                        : `${cell.k} (${cell.r}) - Belum dicoba`
                      return (
                        <div
                          key={cell.k}
                          title={title}
                          className={`h-12 rounded-md border flex flex-col items-center justify-center cursor-default ${st.boxClass}`}
                        >
                          <span className={`jp text-base font-medium ${st.textClass}`}>{cell.k}</span>
                          <small className="text-[9px] text-muted">{cell.r}</small>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Session History */}
          <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm">
            <h3 className="m-0 mb-4 text-base font-semibold text-ink">Riwayat Pengerjaan Latihan ({sessions.length})</h3>
            {sessions.length === 0 ? (
              <p className="text-muted text-[13px]">Belum ada riwayat sesi latihan yang dikerjakan.</p>
            ) : (
              <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
                <table className="table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Waktu Sesi</th>
                      <th>Aksara</th>
                      <th>Mode</th>
                      <th>Total Kartu</th>
                      <th>Benar</th>
                      <th>Akurasi</th>
                      <th>Durasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, idx) => {
                      const acc = s.total_cards > 0 ? Math.round((s.correct_cards / s.total_cards) * 100) : 0
                      return (
                        <tr key={s.id}>
                          <th>{idx + 1}</th>
                          <td>{new Date(s.started_at).toLocaleString('id-ID')}</td>
                          <td className="capitalize">{s.script}</td>
                          <td>
                            {s.mode === 'char' ? 'Huruf' : 'Kata'} {s.composite ? '(Gabungan)' : '(Tunggal)'}
                          </td>
                          <td>{s.total_cards}</td>
                          <td className="text-ok">{s.correct_cards}</td>
                          <td className="font-semibold">{acc}%</td>
                          <td className="text-muted">{s.duration_sec ? `${s.duration_sec} dtk` : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>

          <input
            type="radio"
            name="dashboard_main_tabs"
            className="tab font-bold text-sm"
            aria-label="Kosakata (JLPT N5 & N4)"
            checked={mainTab === 'vocab'}
            onChange={() => setMainTab('vocab')}
          />
          <div className="tab-content bg-base-100 border-base-300 p-4 sm:p-6 space-y-6">
            {/* VOCABULARY ANALYTICS VIEW */}
          {/* SRS Distribution Overview */}
          <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-semibold text-ink mb-1">Distribusi Tingkat Hafalan Kosakata</h3>
            <p className="text-xs text-muted mb-4">
              Pengelompokan kosakata berdasarkan seberapa kuat ingatan Anda.
            </p>

            <div className="stats stats-vertical sm:stats-horizontal shadow-sm w-full bg-pill/50 border border-line rounded-2xl">
              <div className="stat">
                <div className="stat-title text-muted text-xs">Belum Dipelajari</div>
                <div className="stat-value text-ink text-3xl font-black tabular-nums">{vocabNone}</div>
                <div className="stat-desc text-muted">Belum dibuka</div>
              </div>

              <div className="stat">
                <div className="stat-title text-bad text-xs">Lemah / Ulangi</div>
                <div className="stat-value text-bad text-3xl font-black tabular-nums">{vocabWeak}</div>
                <div className="stat-desc text-muted">Perlu diulang segera</div>
              </div>

              <div className="stat">
                <div className="stat-title text-[#e6a23c] text-xs">Belajar / Berkembang</div>
                <div className="stat-value text-[#e6a23c] text-3xl font-black tabular-nums">{vocabLearning + vocabAlmost}</div>
                <div className="stat-desc text-muted">Sedang berproses</div>
              </div>

              <div className="stat">
                <div className="stat-title text-ok text-xs">Sudah Hafal Kuat</div>
                <div className="stat-value text-ok text-3xl font-black tabular-nums">{vocabMastered}</div>
                <div className="stat-desc text-muted">Ingatan jangka panjang</div>
              </div>
            </div>
          </div>

          {/* Weak Words / Needs Review Section */}
          <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-semibold text-ink">
                  Kosakata yang Perlu Diperhatikan {weakWords.length > 0 ? `(${weakWords.length})` : ''}
                </h3>
                <p className="text-xs text-muted">
                  Kata yang sering salah saat latihan — geser ke samping untuk melihat lebih banyak.
                </p>
              </div>

              {weakWords.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => weakScrollRef.current?.scrollBy({ left: -440, behavior: 'smooth' })}
                    className="w-8 h-8 rounded-lg bg-pill hover:bg-pill-on border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
                    title="Geser ke kiri"
                    aria-label="Geser ke kiri"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => weakScrollRef.current?.scrollBy({ left: 440, behavior: 'smooth' })}
                    className="w-8 h-8 rounded-lg bg-pill hover:bg-pill-on border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
                    title="Geser ke kanan"
                    aria-label="Geser ke kanan"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {weakWords.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted bg-pill/30 rounded-xl border border-line/60">
                🎉 Bagus sekali! Belum ada kosakata yang sering salah.
              </div>
            ) : (
              <div
                ref={weakScrollRef}
                className={`grid ${
                  weakWords.length > 5 ? 'grid-rows-2' : 'grid-rows-1'
                } grid-flow-col auto-cols-[200px] sm:auto-cols-[215px] gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory`}
              >
                {weakWords.map((w) => {
                  const s = vocabStats[w.id]
                  return (
                    <div
                      key={w.id}
                      className="snap-start bg-pill/40 border border-line rounded-xl p-3 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-accent">{w.level} Bab {w.chapter}</span>
                          <span className="badge badge-soft badge-error badge-xs font-semibold">
                            Salah: {s?.no ?? 0}x
                          </span>
                        </div>
                        <div className="text-xl font-bold text-ink font-japanese">{w.kanji || w.kana}</div>
                        <div className="text-xs text-muted">{w.kana} • {w.romaji}</div>
                      </div>
                      <div className="text-xs font-semibold text-ink/90 border-t border-line/40 pt-1.5 truncate">
                        {w.meaning}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Chapters Progress per Level */}
          <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-ink">Progres Kosakata per Bab</h3>
                <p className="text-xs text-muted">Pantau tingkat penyelesaian dan akurasi per materi bab.</p>
              </div>

              {/* Level Switcher */}
              <div className="inline-flex bg-pill border border-line rounded-xl p-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setVocabLevel('n5')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    vocabLevel === 'n5' ? 'bg-panel text-accent shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  JLPT N5
                </button>
                <button
                  type="button"
                  onClick={() => setVocabLevel('n4')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    vocabLevel === 'n4' ? 'bg-panel text-accent shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  JLPT N4
                </button>
              </div>
            </div>

            {(() => {
              const startedChapters = activeChapters
                .map((ch) => ({ ch, stats: getChapterStats(ch.words) }))
                .filter(({ stats }) => stats.okCount + stats.noCount > 0)

              if (startedChapters.length === 0) {
                return (
                  <div className="text-center py-8 px-4 bg-bg/40 border border-dashed border-line rounded-xl space-y-3">
                    <p className="text-sm text-muted">
                      Belum ada bab {vocabLevel.toUpperCase()} yang dikerjakan.
                    </p>
                    <Link
                      to="/vocab"
                      className="btn btn-sm bg-accent hover:opacity-90 text-white border-0 font-semibold rounded-xl no-underline"
                    >
                      Mulai Latihan Kosakata
                    </Link>
                  </div>
                )
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {startedChapters.map(({ ch, stats }) => {
                    const percentLearned = Math.round((stats.learned / ch.words.length) * 100) || 0

                    return (
                      <div key={ch.chapter} className="bg-bg/40 border border-line rounded-xl p-4 flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted mb-1">
                            <span className="font-bold text-accent">Bab {ch.chapter}</span>
                            <span>{ch.words.length} Kosakata</span>
                          </div>
                          <h4 className="font-bold text-ink text-sm">{ch.title}</h4>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-line/50">
                          <div className="flex justify-between items-center text-xs text-muted">
                            <span>Hafal: {stats.learned}/{ch.words.length} kata</span>
                            <span className="font-semibold text-ink">Akurasi: {stats.accuracy}%</span>
                          </div>
                          <div className="w-full bg-pill rounded-full h-2 overflow-hidden border border-line/40">
                            <div className="bg-accent h-full transition-all" style={{ width: `${percentLearned}%` }} />
                          </div>
                          <div className="flex justify-end pt-1">
                            <Link
                              to={`/vocab/${vocabLevel}/${ch.chapter}`}
                              className="btn btn-xs bg-accent hover:opacity-90 text-white font-semibold rounded-lg no-underline inline-flex items-center gap-1"
                            >
                              <span>Lanjut Latihan</span>
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Riwayat Sesi Kosakata */}
          <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm">
            <h3 className="m-0 mb-4 text-base font-semibold text-ink">Riwayat Sesi Kosakata ({vocabSessions.length})</h3>
            {vocabSessions.length === 0 ? (
              <p className="text-muted text-[13px]">Belum ada riwayat sesi latihan kosakata.</p>
            ) : (
              <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
                <table className="table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Waktu Sesi</th>
                      <th>Level</th>
                      <th>Bab</th>
                      <th>Total Kartu</th>
                      <th>Benar</th>
                      <th>Akurasi</th>
                      <th>Durasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vocabSessions.map((s, idx) => {
                      const acc = s.total_cards > 0 ? Math.round((s.correct_cards / s.total_cards) * 100) : 0
                      return (
                        <tr key={s.id}>
                          <th>{idx + 1}</th>
                          <td>{new Date(s.started_at).toLocaleString('id-ID')}</td>
                          <td>
                            <span className="badge badge-soft badge-accent badge-sm font-bold">
                              {s.level}
                            </span>
                          </td>
                          <td>Bab {s.chapter}</td>
                          <td>{s.total_cards}</td>
                          <td className="text-ok">{s.correct_cards}</td>
                          <td className="font-semibold">{acc}%</td>
                          <td className="text-muted">{s.duration_sec ? `${s.duration_sec} dtk` : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>

          <input
            type="radio"
            name="dashboard_main_tabs"
            className="tab font-bold text-sm"
            aria-label="Kanji (N5, N4 & JFT)"
            checked={mainTab === 'kanji'}
            onChange={() => setMainTab('kanji')}
          />
          <div className="tab-content bg-base-100 border-base-300 p-4 sm:p-6 space-y-6">
            {/* KANJI ANALYTICS VIEW */}
            <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm">
              <h3 className="text-base font-semibold text-ink mb-1">Distribusi Tingkat Hafalan Kanji</h3>
              <p className="text-xs text-muted mb-4">
                Pengelompokan Kanji berdasarkan seberapa kuat ingatan Anda.
              </p>

              <div className="stats stats-vertical sm:stats-horizontal shadow-sm w-full bg-pill/50 border border-line rounded-2xl">
                <div className="stat">
                  <div className="stat-title text-muted text-xs">Belum Dipelajari</div>
                  <div className="stat-value text-ink text-3xl font-black tabular-nums">{kanjiNone}</div>
                  <div className="stat-desc text-muted">Belum dibuka</div>
                </div>

                <div className="stat">
                  <div className="stat-title text-bad text-xs">Lemah / Ulangi</div>
                  <div className="stat-value text-bad text-3xl font-black tabular-nums">{kanjiWeak}</div>
                  <div className="stat-desc text-muted">Perlu diulang segera</div>
                </div>

                <div className="stat">
                  <div className="stat-title text-[#e6a23c] text-xs">Belajar / Berkembang</div>
                  <div className="stat-value text-[#e6a23c] text-3xl font-black tabular-nums">{kanjiLearning + kanjiAlmost}</div>
                  <div className="stat-desc text-muted">Mulai hafal & berkembang</div>
                </div>

                <div className="stat">
                  <div className="stat-title text-ok text-xs">Sudah Hafal Kuat</div>
                  <div className="stat-value text-ok text-3xl font-black tabular-nums">{kanjiMastered}</div>
                  <div className="stat-desc text-muted">Ingatan jangka panjang</div>
                </div>
              </div>
            </div>

            {/* Weak Kanji / Needs Review Section */}
            <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    Kanji yang Perlu Diperhatikan {weakKanji.length > 0 ? `(${weakKanji.length})` : ''}
                  </h3>
                  <p className="text-xs text-muted">
                    Kanji yang sering salah saat latihan — geser ke samping untuk melihat lebih banyak.
                  </p>
                </div>

                {weakKanji.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => weakKanjiScrollRef.current?.scrollBy({ left: -440, behavior: 'smooth' })}
                      className="w-8 h-8 rounded-lg bg-pill hover:bg-pill-on border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
                      title="Geser ke kiri"
                      aria-label="Geser ke kiri"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => weakKanjiScrollRef.current?.scrollBy({ left: 440, behavior: 'smooth' })}
                      className="w-8 h-8 rounded-lg bg-pill hover:bg-pill-on border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
                      title="Geser ke kanan"
                      aria-label="Geser ke kanan"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {weakKanji.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted bg-pill/30 rounded-xl border border-line/60">
                  🎉 Bagus sekali! Belum ada Kanji yang sering salah.
                </div>
              ) : (
                <div
                  ref={weakKanjiScrollRef}
                  className={`grid ${
                    weakKanji.length > 5 ? 'grid-rows-2' : 'grid-rows-1'
                  } grid-flow-col auto-cols-[200px] sm:auto-cols-[215px] gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory`}
                >
                  {weakKanji.map((k) => {
                    const s = kanjiStats[k.id]
                    return (
                      <div
                        key={k.id}
                        className="snap-start bg-pill/40 border border-line rounded-xl p-3 flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-bold text-accent">{k.level} Bab {k.chapter}</span>
                            <span className="badge badge-soft badge-error badge-xs font-semibold">
                              Salah: {s?.no ?? 0}x
                            </span>
                          </div>
                          <div className="text-2xl font-black text-ink font-japanese">{k.kanji}</div>
                          <div className="text-xs text-muted truncate">On: {k.onyomi}</div>
                        </div>
                        <div className="text-xs font-semibold text-ink/90 border-t border-line/40 pt-1.5 truncate">
                          {k.meaning}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Kanji Chapters Progress per Level */}
            <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">Progres Kanji per Bab</h3>
                  <p className="text-xs text-muted">Pantau tingkat penyelesaian dan akurasi per materi bab Kanji.</p>
                </div>

                {/* Level Switcher */}
                <div className="inline-flex bg-pill border border-line rounded-xl p-1 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setKanjiLevel('n5')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      kanjiLevel === 'n5' ? 'bg-panel text-accent shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    JLPT N5
                  </button>
                  <button
                    type="button"
                    onClick={() => setKanjiLevel('n4')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      kanjiLevel === 'n4' ? 'bg-panel text-accent shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    JLPT N4
                  </button>
                  <button
                    type="button"
                    onClick={() => setKanjiLevel('jft')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      kanjiLevel === 'jft' ? 'bg-panel text-accent shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    JFT
                  </button>
                </div>
              </div>

              {(() => {
                const startedChapters = activeKanjiChapters
                  .map((ch) => ({ ch, stats: getKanjiChapterStats(ch.items) }))
                  .filter(({ stats }) => stats.okCount + stats.noCount > 0)

                if (startedChapters.length === 0) {
                  return (
                    <div className="text-center py-8 px-4 bg-bg/40 border border-dashed border-line rounded-xl space-y-3">
                      <p className="text-sm text-muted">
                        Belum ada bab Kanji {kanjiLevel.toUpperCase()} yang dikerjakan.
                      </p>
                      <Link
                        to={`/kanji?level=${kanjiLevel}`}
                        className="btn btn-sm bg-accent hover:opacity-90 text-white border-0 font-semibold rounded-xl no-underline"
                      >
                        Mulai Latihan Kanji
                      </Link>
                    </div>
                  )
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {startedChapters.map(({ ch, stats }) => {
                      const percentLearned = Math.round((stats.learned / ch.items.length) * 100) || 0

                      return (
                        <div key={`${ch.level}-${ch.chapter}`} className="bg-bg/40 border border-line rounded-xl p-4 flex flex-col justify-between gap-3">
                          <div>
                            <div className="flex items-center justify-between text-xs text-muted mb-1">
                              <span className="font-bold text-accent">Bab {ch.chapter}</span>
                              <span>{ch.items.length} Kanji</span>
                            </div>
                            <h4 className="font-bold text-ink text-sm">{ch.title}</h4>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-line/50">
                            <div className="flex justify-between items-center text-xs text-muted">
                              <span>Hafal: {stats.learned}/{ch.items.length} kanji</span>
                              <span className="font-semibold text-ink">Akurasi: {stats.accuracy}%</span>
                            </div>
                            <div className="w-full bg-pill rounded-full h-2 overflow-hidden border border-line/40">
                              <div className="bg-accent h-full transition-all" style={{ width: `${percentLearned}%` }} />
                            </div>
                            <div className="flex justify-end pt-1">
                              <Link
                                to={`/kanji/${kanjiLevel}/${ch.chapter}`}
                                className="btn btn-xs bg-accent hover:opacity-90 text-white font-semibold rounded-lg no-underline inline-flex items-center gap-1"
                              >
                                <span>Lanjut Latihan</span>
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </Link>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* Riwayat Sesi Kanji */}
            <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm">
              <h3 className="m-0 mb-4 text-base font-semibold text-ink">Riwayat Sesi Kanji ({kanjiSessions.length})</h3>
              {kanjiSessions.length === 0 ? (
                <p className="text-muted text-[13px]">Belum ada riwayat sesi latihan Kanji.</p>
              ) : (
                <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
                  <table className="table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Waktu Sesi</th>
                        <th>Level</th>
                        <th>Bab</th>
                        <th>Total Kartu</th>
                        <th>Benar</th>
                        <th>Akurasi</th>
                        <th>Durasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kanjiSessions.map((s, idx) => {
                        const acc = s.total_cards > 0 ? Math.round((s.correct_cards / s.total_cards) * 100) : 0
                        return (
                          <tr key={s.id}>
                            <th>{idx + 1}</th>
                            <td>{new Date(s.started_at).toLocaleString('id-ID')}</td>
                            <td>
                              <span className="badge badge-soft badge-accent badge-sm font-bold">
                                {s.level}
                              </span>
                            </td>
                            <td>Bab {s.chapter}</td>
                            <td>{s.total_cards}</td>
                            <td className="text-ok">{s.correct_cards}</td>
                            <td className="font-semibold">{acc}%</td>
                            <td className="text-muted">{s.duration_sec ? `${s.duration_sec} dtk` : '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
