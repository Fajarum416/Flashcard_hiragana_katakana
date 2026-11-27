import { useEffect, useRef, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { SlidingTabs } from '../components/Segmented'
import { COL_IDS, TABLE, YOON_IDS, YOON_TABLE, type Script } from '../data/kana'
import { fetchUserDetail } from '../lib/admin'
import { TOTAL_CARDS, masteryLevel, percent, type Level, type ProgressRow } from '../lib/mastery'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mainTab, setMainTab] = useState<'kana' | 'vocab' | 'kanji'>('kana')
  const [activeTab, setActiveTab] = useState<Script>('hiragana')
  const [vocabLevel, setVocabLevel] = useState<'n5' | 'n4'>('n5')
  const [kanjiLevel, setKanjiLevel] = useState<KanjiLevel>('n5')
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

      setProgress(merged)
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
      <div className="bg-panel border border-line rounded-xl p-3.5 sm:p-4 mb-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-line shrink-0">
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
            <div className="flex flex-col min-w-0">
              <h2 className="m-0 text-sm sm:text-base font-bold text-ink leading-tight truncate">
                {user.user_metadata?.full_name || user.email || 'Pelajar'}
              </h2>
              {user.email && (
                <p className="text-[10px] sm:text-[11px] text-muted m-0 truncate">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 4 Mastery Progress Bars */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2.5 mt-2.5 sm:mt-3.5 pt-2.5 sm:pt-3.5 border-t border-line">
          {/* Hiragana */}
          <div className="bg-bg/50 border border-line rounded-lg sm:rounded-xl px-2 py-1.5 sm:p-2.5">
            <div className="flex justify-between items-center gap-1 text-[10px] sm:text-xs text-muted mb-1">
              <span className="truncate">Hiragana ({hiraMastered}/{TOTAL_CARDS})</span>
              <span className="font-semibold text-ink shrink-0">{hiraPct}%</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 bg-pill rounded-full sm:rounded overflow-hidden">
              <div className="h-full bg-ok transition-all" style={{ width: `${hiraPct}%` }} />
            </div>
          </div>

          {/* Katakana */}
          <div className="bg-bg/50 border border-line rounded-lg sm:rounded-xl px-2 py-1.5 sm:p-2.5">
            <div className="flex justify-between items-center gap-1 text-[10px] sm:text-xs text-muted mb-1">
              <span className="truncate">Katakana ({kataMastered}/{TOTAL_CARDS})</span>
              <span className="font-semibold text-ink shrink-0">{kataPct}%</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 bg-pill rounded-full sm:rounded overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${kataPct}%` }} />
            </div>
          </div>

          {/* Kosakata */}
          <div className="bg-bg/50 border border-line rounded-lg sm:rounded-xl px-2 py-1.5 sm:p-2.5">
            <div className="flex justify-between items-center gap-1 text-[10px] sm:text-xs text-muted mb-1">
              <span className="truncate">Kosakata ({vocabMastered}/{totalVocabWords})</span>
              <span className="font-semibold text-ink shrink-0">{vocabPct}%</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 bg-pill rounded-full sm:rounded overflow-hidden">
              <div className="h-full bg-[#e6a23c] transition-all" style={{ width: `${vocabPct}%` }} />
            </div>
          </div>

          {/* Kanji */}
          <div className="bg-bg/50 border border-line rounded-lg sm:rounded-xl px-2 py-1.5 sm:p-2.5">
            <div className="flex justify-between items-center gap-1 text-[10px] sm:text-xs text-muted mb-1">
              <span className="truncate">Kanji ({kanjiMastered}/{totalKanjiItems})</span>
              <span className="font-semibold text-ink shrink-0">{kanjiPct}%</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 bg-pill rounded-full sm:rounded overflow-hidden">
              <div className="h-full bg-secondary transition-all" style={{ width: `${kanjiPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[260px] sm:min-h-[320px] gap-3 text-muted text-[13px]">
          <span className="loading loading-spinner loading-xl text-accent" />
          <span>Memuat data analitik...</span>
        </div>
      ) : (
        <div>
          {/* Tab Navigation: 1 baris rapi di semua ukuran layar */}
          <SlidingTabs
            ariaLabel="Kategori Analitik"
            value={mainTab}
            onChange={setMainTab}
            className="grid grid-cols-3 gap-1 bg-pill border border-line rounded-xl p-1 mb-4"
            indicatorClassName="bg-panel rounded-lg shadow-sm"
            buttonClassName="py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-bold text-center"
            activeButtonClassName="text-accent"
            inactiveButtonClassName="text-muted hover:text-ink"
            options={[
              {
                value: 'kana',
                label: (
                  <>
                    <span className="sm:hidden">Kana</span>
                    <span className="hidden sm:inline">Hiragana & Katakana</span>
                  </>
                ),
              },
              {
                value: 'vocab',
                label: (
                  <>
                    <span className="sm:hidden">Kosakata</span>
                    <span className="hidden sm:inline">Kosakata (N5 & N4)</span>
                  </>
                ),
              },
              {
                value: 'kanji',
                label: (
                  <>
                    <span className="sm:hidden">Kanji</span>
                    <span className="hidden sm:inline">Kanji (N5, N4 & JFT)</span>
                  </>
                ),
              },
            ]}
          />

          {mainTab === 'kana' && (
            <div>
              {/* KANA ANALYTICS VIEW */}
          {/* Heatmap Section */}
          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-start sm:items-center flex-nowrap gap-2 sm:gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="m-0 text-sm sm:text-base font-semibold text-ink">Heatmap Hafalan Karakter</h3>
                <p className="text-muted text-[11px] leading-snug mt-0.5 mb-0">
                  Status hafalan tiap huruf berdasarkan tingkat akurasi & pengulangan.
                </p>
              </div>
              <SlidingTabs
                ariaLabel="Jenis Aksara Heatmap"
                value={activeTab}
                onChange={setActiveTab}
                className="inline-flex bg-pill border border-line rounded-full p-0.5 shrink-0"
                indicatorClassName="bg-accent rounded-full shadow-sm"
                buttonClassName="rounded-full text-xs font-medium px-3 py-1"
                activeButtonClassName="text-white"
                inactiveButtonClassName="text-muted hover:text-ink"
                options={[
                  { value: 'hiragana', label: 'Hiragana' },
                  { value: 'katakana', label: 'Katakana' },
                ]}
              />
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
            <h4 className="m-0 mb-2 text-xs sm:text-sm text-muted font-medium">Tunggal (Gojūon & Dakuten - 71 Huruf)</h4>
            <div className="overflow-x-auto pb-2 mb-4">
              <div className="grid grid-cols-[repeat(16,minmax(32px,1fr))] sm:grid-cols-[repeat(16,minmax(38px,1fr))] gap-1 min-w-[540px] sm:min-w-[640px]">
                {COL_IDS.map((id) => (
                  <div key={id} className="flex flex-col gap-1">
                    <div className="text-center text-[10px] text-muted">{id}</div>
                    {TABLE[activeTab][id].map((cell, idx) => {
                      if (!cell) return <div key={idx} className="h-9 sm:h-10 bg-transparent" />
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
                          className={`h-9 sm:h-10 rounded border flex flex-col items-center justify-center cursor-default ${st.boxClass}`}
                        >
                          <span className={`jp text-sm sm:text-base font-medium leading-none ${st.textClass}`}>{cell.k}</span>
                          <small className="text-[8px] sm:text-[9px] leading-tight mt-0.5 text-muted">{cell.r}</small>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Yoon Heatmap */}
            <h4 className="m-0 mb-2 text-xs sm:text-sm text-muted font-medium">Gabungan (Yōon - 33 Huruf)</h4>
            <div className="overflow-x-auto pb-2">
              <div className="grid grid-cols-[repeat(11,minmax(42px,1fr))] sm:grid-cols-[repeat(11,minmax(50px,1fr))] gap-1 min-w-[490px] sm:min-w-[580px]">
                {YOON_IDS.map((id) => (
                  <div key={id} className="flex flex-col gap-1">
                    <div className="text-center text-[10px] text-muted">{id}</div>
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
                          className={`h-9 sm:h-10 rounded border flex flex-col items-center justify-center cursor-default ${st.boxClass}`}
                        >
                          <span className={`jp text-xs sm:text-sm font-medium leading-none ${st.textClass}`}>{cell.k}</span>
                          <small className="text-[8px] sm:text-[9px] leading-tight mt-0.5 text-muted">{cell.r}</small>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
          )}

          {mainTab === 'vocab' && (
            <div className="space-y-4">
              {/* VOCABULARY ANALYTICS VIEW */}
          {/* SRS Distribution Overview */}
          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 shadow-sm">
            <h3 className="text-sm sm:text-base font-semibold text-ink mb-0.5">Distribusi Tingkat Hafalan Kosakata</h3>
            <p className="text-[11px] leading-snug text-muted mb-2.5">
              Pengelompokan kosakata berdasarkan seberapa kuat ingatan Anda.
            </p>

            <div className="stats stats-horizontal shadow w-full grid grid-cols-4 bg-pill/40 border border-line rounded-xl overflow-hidden">
              <div className="stat px-1.5 py-2 sm:py-2.5 sm:px-4 min-w-0">
                <div className="stat-title text-muted text-[10px] sm:text-[11px] truncate">
                  <span className="sm:hidden">Belum</span>
                  <span className="hidden sm:inline">Belum Dipelajari</span>
                </div>
                <div className="stat-value text-ink text-lg sm:text-2xl font-black tabular-nums">{vocabNone}</div>
                <div className="stat-desc text-muted text-[11px] hidden sm:block">Belum dibuka</div>
              </div>

              <div className="stat px-1.5 py-2 sm:py-2.5 sm:px-4 min-w-0">
                <div className="stat-title text-bad text-[10px] sm:text-[11px] truncate">
                  <span className="sm:hidden">Ulangi</span>
                  <span className="hidden sm:inline">Lemah / Ulangi</span>
                </div>
                <div className="stat-value text-bad text-lg sm:text-2xl font-black tabular-nums">{vocabWeak}</div>
                <div className="stat-desc text-muted text-[11px] hidden sm:block">Perlu diulang segera</div>
              </div>

              <div className="stat px-1.5 py-2 sm:py-2.5 sm:px-4 min-w-0">
                <div className="stat-title text-[#e6a23c] text-[10px] sm:text-[11px] truncate">
                  <span className="sm:hidden">Belajar</span>
                  <span className="hidden sm:inline">Belajar / Berkembang</span>
                </div>
                <div className="stat-value text-[#e6a23c] text-lg sm:text-2xl font-black tabular-nums">{vocabLearning + vocabAlmost}</div>
                <div className="stat-desc text-muted text-[11px] hidden sm:block">Sedang berproses</div>
              </div>

              <div className="stat px-1.5 py-2 sm:py-2.5 sm:px-4 min-w-0">
                <div className="stat-title text-ok text-[10px] sm:text-[11px] truncate">
                  <span className="sm:hidden">Hafal</span>
                  <span className="hidden sm:inline">Sudah Hafal Kuat</span>
                </div>
                <div className="stat-value text-ok text-lg sm:text-2xl font-black tabular-nums">{vocabMastered}</div>
                <div className="stat-desc text-muted text-[11px] hidden sm:block">Ingatan jangka panjang</div>
              </div>
            </div>
          </div>

          {/* Weak Words / Needs Review Section */}
          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-ink">
                  Kosakata yang Perlu Diperhatikan {weakWords.length > 0 ? `(${weakWords.length})` : ''}
                </h3>
                <p className="text-[11px] leading-snug text-muted">
                  Kata yang sering salah saat latihan
                </p>
              </div>

              {weakWords.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => weakScrollRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
                    className="w-7 h-7 rounded-lg bg-pill hover:bg-pill-on border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
                    title="Geser ke kiri"
                    aria-label="Geser ke kiri"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => weakScrollRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
                    className="w-7 h-7 rounded-lg bg-pill hover:bg-pill-on border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
                    title="Geser ke kanan"
                    aria-label="Geser ke kanan"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {weakWords.length === 0 ? (
              <div className="py-4 text-center text-xs sm:text-sm text-muted bg-pill/30 rounded-xl border border-line/60">
                🎉 Bagus sekali! Belum ada kosakata yang sering salah.
              </div>
            ) : (
              <div
                ref={weakScrollRef}
                className={`grid ${
                  weakWords.length > 5 ? 'grid-rows-2' : 'grid-rows-1'
                } grid-flow-col auto-cols-[160px] sm:auto-cols-[180px] gap-2.5 overflow-x-auto pb-1.5 scroll-smooth snap-x snap-mandatory`}
              >
                {weakWords.map((w) => {
                  const s = vocabStats[w.id]
                  return (
                    <div
                      key={w.id}
                      className="snap-start bg-pill/40 border border-line rounded-xl p-2.5 flex flex-col justify-between gap-1.5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[11px] font-bold text-accent">{w.level} Bab {w.chapter}</span>
                          <span className="badge badge-soft badge-error badge-xs font-semibold">
                            {s?.no ?? 0}x
                          </span>
                        </div>
                        <div className="text-base sm:text-lg font-bold text-ink font-japanese truncate">{w.kanji || w.kana}</div>
                        <div className="text-[11px] text-muted truncate">{w.kana} • {w.romaji}</div>
                      </div>
                      <div className="text-[11px] font-semibold text-ink/90 border-t border-line/40 pt-1 truncate">
                        {w.meaning}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Chapters Progress per Level */}
          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-ink">Progres Kosakata per Bab</h3>
                <p className="text-[11px] leading-snug text-muted">Pantau tingkat penyelesaian dan akurasi per materi bab.</p>
              </div>

              {/* Level Switcher */}
              <SlidingTabs
                ariaLabel="Level Kosakata"
                value={vocabLevel}
                onChange={setVocabLevel}
                className="inline-flex bg-pill border border-line rounded-xl p-1 self-start sm:self-auto"
                indicatorClassName="bg-panel rounded-lg shadow-sm"
                buttonClassName="px-4 py-1.5 rounded-lg text-xs font-bold"
                activeButtonClassName="text-accent"
                inactiveButtonClassName="text-muted hover:text-ink"
                options={[
                  { value: 'n5', label: 'JLPT N5' },
                  { value: 'n4', label: 'JLPT N4' },
                ]}
              />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {startedChapters.map(({ ch, stats }) => {
                    const percentLearned = Math.round((stats.learned / ch.words.length) * 100) || 0

                    return (
                      <div key={ch.chapter} className="bg-bg/40 border border-line rounded-xl p-3 flex flex-col justify-between gap-2">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-muted mb-0.5">
                            <span className="font-bold text-accent">Bab {ch.chapter}</span>
                            <span>{ch.words.length} Kosakata</span>
                          </div>
                          <h4 className="font-bold text-ink text-xs sm:text-sm truncate">{ch.title}</h4>
                        </div>

                        <div className="space-y-1.5 pt-1.5 border-t border-line/50">
                          <div className="flex justify-between items-center text-[11px] text-muted">
                            <span>Hafal: {stats.learned}/{ch.words.length}</span>
                            <span className="font-semibold text-ink">Akurasi: {stats.accuracy}%</span>
                          </div>
                          <div className="w-full bg-pill rounded-full h-1.5 overflow-hidden border border-line/40">
                            <div className="bg-accent h-full transition-all" style={{ width: `${percentLearned}%` }} />
                          </div>
                          <div className="flex justify-end pt-0.5">
                            <Link
                              to={`/vocab/${vocabLevel}/${ch.chapter}`}
                              className="btn btn-xs bg-accent hover:opacity-90 text-white font-semibold rounded-lg no-underline inline-flex items-center gap-1"
                            >
                              <span>Lanjut</span>
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
          </div>
          )}

          {mainTab === 'kanji' && (
            <div className="space-y-4">
              {/* KANJI ANALYTICS VIEW */}
            <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-ink mb-0.5">Distribusi Tingkat Hafalan Kanji</h3>
              <p className="text-[11px] leading-snug text-muted mb-2.5">
                Pengelompokan Kanji berdasarkan seberapa kuat ingatan Anda.
              </p>

              <div className="stats stats-horizontal shadow w-full grid grid-cols-4 bg-pill/40 border border-line rounded-xl overflow-hidden">
                <div className="stat px-1.5 py-2 sm:py-2.5 sm:px-4 min-w-0">
                  <div className="stat-title text-muted text-[10px] sm:text-[11px] truncate">
                    <span className="sm:hidden">Belum</span>
                    <span className="hidden sm:inline">Belum Dipelajari</span>
                  </div>
                  <div className="stat-value text-ink text-lg sm:text-2xl font-black tabular-nums">{kanjiNone}</div>
                  <div className="stat-desc text-muted text-[11px] hidden sm:block">Belum dibuka</div>
                </div>

                <div className="stat px-1.5 py-2 sm:py-2.5 sm:px-4 min-w-0">
                  <div className="stat-title text-bad text-[10px] sm:text-[11px] truncate">
                    <span className="sm:hidden">Ulangi</span>
                    <span className="hidden sm:inline">Lemah / Ulangi</span>
                  </div>
                  <div className="stat-value text-bad text-lg sm:text-2xl font-black tabular-nums">{kanjiWeak}</div>
                  <div className="stat-desc text-muted text-[11px] hidden sm:block">Perlu diulang segera</div>
                </div>

                <div className="stat px-1.5 py-2 sm:py-2.5 sm:px-4 min-w-0">
                  <div className="stat-title text-[#e6a23c] text-[10px] sm:text-[11px] truncate">
                    <span className="sm:hidden">Belajar</span>
                    <span className="hidden sm:inline">Belajar / Berkembang</span>
                  </div>
                  <div className="stat-value text-[#e6a23c] text-lg sm:text-2xl font-black tabular-nums">{kanjiLearning + kanjiAlmost}</div>
                  <div className="stat-desc text-muted text-[11px] hidden sm:block">Mulai hafal & berkembang</div>
                </div>

                <div className="stat px-1.5 py-2 sm:py-2.5 sm:px-4 min-w-0">
                  <div className="stat-title text-ok text-[10px] sm:text-[11px] truncate">
                    <span className="sm:hidden">Hafal</span>
                    <span className="hidden sm:inline">Sudah Hafal Kuat</span>
                  </div>
                  <div className="stat-value text-ok text-lg sm:text-2xl font-black tabular-nums">{kanjiMastered}</div>
                  <div className="stat-desc text-muted text-[11px] hidden sm:block">Ingatan jangka panjang</div>
                </div>
              </div>
            </div>

            {/* Weak Kanji / Needs Review Section */}
            <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-ink">
                    Kanji yang Perlu Diperhatikan {weakKanji.length > 0 ? `(${weakKanji.length})` : ''}
                  </h3>
                  <p className="text-[11px] leading-snug text-muted">
                    Kanji yang sering salah saat latihan
                  </p>
                </div>

                {weakKanji.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => weakKanjiScrollRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
                      className="w-7 h-7 rounded-lg bg-pill hover:bg-pill-on border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
                      title="Geser ke kiri"
                      aria-label="Geser ke kiri"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => weakKanjiScrollRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
                      className="w-7 h-7 rounded-lg bg-pill hover:bg-pill-on border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
                      title="Geser ke kanan"
                      aria-label="Geser ke kanan"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {weakKanji.length === 0 ? (
                <div className="py-4 text-center text-xs sm:text-sm text-muted bg-pill/30 rounded-xl border border-line/60">
                  🎉 Bagus sekali! Belum ada Kanji yang sering salah.
                </div>
              ) : (
                <div
                  ref={weakKanjiScrollRef}
                  className={`grid ${
                    weakKanji.length > 5 ? 'grid-rows-2' : 'grid-rows-1'
                  } grid-flow-col auto-cols-[160px] sm:auto-cols-[180px] gap-2.5 overflow-x-auto pb-1.5 scroll-smooth snap-x snap-mandatory`}
                >
                  {weakKanji.map((k) => {
                    const s = kanjiStats[k.id]
                    return (
                      <div
                        key={k.id}
                        className="snap-start bg-pill/40 border border-line rounded-xl p-2.5 flex flex-col justify-between gap-1.5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[11px] font-bold text-accent">{k.level} Bab {k.chapter}</span>
                            <span className="badge badge-soft badge-error badge-xs font-semibold">
                              {s?.no ?? 0}x
                            </span>
                          </div>
                          <div className="text-lg sm:text-xl font-black text-ink font-japanese">{k.kanji}</div>
                          <div className="text-[11px] text-muted truncate">On: {k.onyomi}</div>
                        </div>
                        <div className="text-[11px] font-semibold text-ink/90 border-t border-line/40 pt-1 truncate">
                          {k.meaning}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Kanji Chapters Progress per Level */}
            <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-ink">Progres Kanji per Bab</h3>
                  <p className="text-[11px] leading-snug text-muted">Pantau tingkat penyelesaian dan akurasi per materi bab Kanji.</p>
                </div>

                {/* Level Switcher */}
                <SlidingTabs
                  ariaLabel="Level Kanji"
                  value={kanjiLevel}
                  onChange={setKanjiLevel}
                  className="inline-flex bg-pill border border-line rounded-xl p-1 self-start sm:self-auto"
                  indicatorClassName="bg-panel rounded-lg shadow-sm"
                  buttonClassName="px-3.5 py-1.5 rounded-lg text-xs font-bold"
                  activeButtonClassName="text-accent"
                  inactiveButtonClassName="text-muted hover:text-ink"
                  options={[
                    { value: 'n5', label: 'JLPT N5' },
                    { value: 'n4', label: 'JLPT N4' },
                    { value: 'jft', label: 'JFT' },
                  ]}
                />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {startedChapters.map(({ ch, stats }) => {
                      const percentLearned = Math.round((stats.learned / ch.items.length) * 100) || 0

                      return (
                        <div key={`${ch.level}-${ch.chapter}`} className="bg-bg/40 border border-line rounded-xl p-3 flex flex-col justify-between gap-2">
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-muted mb-0.5">
                              <span className="font-bold text-accent">Bab {ch.chapter}</span>
                              <span>{ch.items.length} Kanji</span>
                            </div>
                            <h4 className="font-bold text-ink text-xs sm:text-sm truncate">{ch.title}</h4>
                          </div>

                          <div className="space-y-1.5 pt-1.5 border-t border-line/50">
                            <div className="flex justify-between items-center text-[11px] text-muted">
                              <span>Hafal: {stats.learned}/{ch.items.length}</span>
                              <span className="font-semibold text-ink">Akurasi: {stats.accuracy}%</span>
                            </div>
                            <div className="w-full bg-pill rounded-full h-1.5 overflow-hidden border border-line/40">
                              <div className="bg-accent h-full transition-all" style={{ width: `${percentLearned}%` }} />
                            </div>
                            <div className="flex justify-end pt-0.5">
                              <Link
                                to={`/kanji/${kanjiLevel}/${ch.chapter}`}
                                className="btn btn-xs bg-accent hover:opacity-90 text-white font-semibold rounded-lg no-underline inline-flex items-center gap-1"
                              >
                                <span>Lanjut</span>
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
          </div>
          )}
        </div>
      )}
    </div>
  )
}
