import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SlidingTabs } from '../../components/Segmented'
import { COL_IDS, TABLE, YOON_IDS, YOON_TABLE, type Script } from '../../data/kana'
import { type KanjiLevel } from '../../data/kanji'
import { fetchUserDetail, resetProgress, setDisabled, setRole, type MaterialSessionRow, type UserDetail } from '../../lib/admin'
import { TOTAL_CARDS, masteryLevel, percent, streak, type Level, type ProgressRow } from '../../lib/mastery'
import { useAuth } from '../../store/useAuth'
import { useContentStore } from '../../store/useContentStore'
import { showToast } from '../../store/useToast'

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
    label: 'Belajar (Kotak 1-2)',
  },
  almost: {
    boxClass: 'bg-[rgba(138,167,255,0.25)] border-accent',
    textClass: 'text-accent',
    label: 'Hampir (Kotak 3)',
  },
  mastered: {
    boxClass: 'bg-[rgba(94,196,154,0.25)] border-ok',
    textClass: 'text-ok',
    label: 'Hafal (Kotak 4-5, ≥80%)',
  },
}

function calcCollectionStats(ids: string[], progressMap: Map<string, ProgressRow>) {
  let learned = 0
  let okCount = 0
  let noCount = 0
  for (const id of ids) {
    const s = progressMap.get(id)
    if (!s) continue
    okCount += s.ok
    noCount += s.no
    if (s.box >= 4) learned++
  }
  const total = okCount + noCount
  const accuracy = total > 0 ? Math.round((okCount / total) * 100) : 0
  return { learned, okCount, noCount, accuracy }
}

function MaterialSessionsTable({ title, rows }: { title: string; rows: MaterialSessionRow[] }) {
  return (
    <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 md:p-6 shadow-sm">
      <h3 className="m-0 mb-3 text-sm sm:text-base md:text-lg font-semibold text-ink">
        {title} ({rows.length})
      </h3>
      {rows.length === 0 ? (
        <p className="text-muted text-xs md:text-sm">Belum ada riwayat sesi latihan.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-base-content/5 bg-base-100">
          <table className="table table-xs sm:table-sm md:table-md">
            <thead>
              <tr>
                <th>#</th>
                <th>Waktu Sesi</th>
                <th>Level & Bab</th>
                <th>Total Kartu</th>
                <th>Benar</th>
                <th>Akurasi</th>
                <th>Durasi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, idx) => {
                const acc = s.total_cards > 0 ? Math.round((s.correct_cards / s.total_cards) * 100) : 0
                return (
                  <tr key={s.id} className="hover:bg-pill/20">
                    <th className="tabular-nums text-muted">{idx + 1}</th>
                    <td>{new Date(s.started_at).toLocaleString('id-ID')}</td>
                    <td>
                      <span className="font-semibold text-ink uppercase">{s.level}</span> · Bab {s.chapter}
                    </td>
                    <td className="tabular-nums">{s.total_cards}</td>
                    <td className="text-ok font-semibold tabular-nums">{s.correct_cards}</td>
                    <td className="font-semibold tabular-nums">{acc}%</td>
                    <td className="text-muted">{s.duration_sec ? `${s.duration_sec} dtk` : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const currentUser = useAuth((s) => s.user)
  const vocabChapters = useContentStore((s) => s.vocabChapters)
  const kanjiChapters = useContentStore((s) => s.kanjiChapters)
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mainTab, setMainTab] = useState<'kana' | 'vocab' | 'kanji'>('kana')
  const [activeTab, setActiveTab] = useState<Script>('hiragana')
  const [vocabLevel, setVocabLevel] = useState<'n5' | 'n4'>('n5')
  const [kanjiLevel, setKanjiLevel] = useState<KanjiLevel>('n5')
  const [avatarError, setAvatarError] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    fetchUserDetail(id)
      .then((res) => {
        setData(res)
        setAvatarError(false)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
  }, [id])

  if (loading) return <p className="text-muted text-[13px] text-center py-10">Memuat data pengguna...</p>
  if (error || !data) {
    return <p className="text-bad text-center py-10">Error: {error || 'Pengguna tidak ditemukan'}</p>
  }

  const { profile, progress, sessions, vocabProgress, vocabSessions, kanjiProgress, kanjiSessions } = data
  const userStreak = streak([
    ...sessions.map((s) => s.started_at),
    ...vocabSessions.map((s) => s.started_at),
    ...kanjiSessions.map((s) => s.started_at),
  ])
  const isSelf = currentUser?.id === profile.id

  // Kana Mastery
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

  // Vocab Analytics
  const allVocab = vocabChapters.flatMap((c) => c.words)
  const totalVocabWords = allVocab.length
  let vocabMastered = 0
  let vocabAlmost = 0
  let vocabLearning = 0
  let vocabWeak = 0
  let vocabNone = 0
  for (const w of allVocab) {
    const s = vocabProgress.get(w.id)
    if (!s || (s.ok === 0 && s.no === 0)) vocabNone++
    else if (s.box >= 4) vocabMastered++
    else if (s.box === 3) vocabAlmost++
    else if (s.no > s.ok) vocabWeak++
    else vocabLearning++
  }
  const vocabPct = totalVocabWords > 0 ? Math.round((vocabMastered / totalVocabWords) * 100) : 0

  const weakWords = allVocab
    .map((w) => {
      const ch = vocabChapters.find((c) => c.words.some((word) => word.id === w.id))
      return { ...w, level: (ch?.level ?? 'n5').toUpperCase(), chapter: ch?.chapter ?? 1 }
    })
    .filter((w) => {
      const s = vocabProgress.get(w.id)
      return s && (s.no > 0 || (s.ok > 0 && s.box === 1))
    })
    .sort((a, b) => (vocabProgress.get(b.id)?.no ?? 0) - (vocabProgress.get(a.id)?.no ?? 0))

  const activeVocabChapters = vocabChapters.filter((c) => c.level === vocabLevel)

  // Kanji Analytics
  const allKanji = kanjiChapters.flatMap((c) => c.items)
  const totalKanjiItems = allKanji.length
  let kanjiMastered = 0
  let kanjiNone = 0
  let kanjiWeak = 0
  let kanjiLearning = 0
  let kanjiAlmost = 0
  for (const k of allKanji) {
    const s = kanjiProgress.get(k.id)
    if (!s || s.ok + s.no === 0) kanjiNone++
    else if (s.box >= 4) kanjiMastered++
    else if (s.box === 3) kanjiAlmost++
    else if (s.box === 2) kanjiLearning++
    else kanjiWeak++
  }
  const kanjiPct = totalKanjiItems > 0 ? Math.round((kanjiMastered / totalKanjiItems) * 100) : 0

  const weakKanji = allKanji
    .map((k) => {
      const ch = kanjiChapters.find((c) => c.items.some((item) => item.id === k.id))
      return { ...k, level: (ch?.level ?? 'n5').toUpperCase(), chapter: ch?.chapter ?? 1 }
    })
    .filter((k) => {
      const s = kanjiProgress.get(k.id)
      return s && (s.no > 0 || (s.ok > 0 && s.box === 1))
    })
    .sort((a, b) => (kanjiProgress.get(b.id)?.no ?? 0) - (kanjiProgress.get(a.id)?.no ?? 0))

  const activeKanjiChapters = kanjiChapters.filter((c) => c.level === kanjiLevel)

  const handleReset = async () => {
    ;(document.getElementById('reset_confirm_modal') as HTMLDialogElement | null)?.close()
    try {
      await resetProgress(profile.id)
      showToast('Progres berhasil direset.', 'success')
      load()
    } catch (err: any) {
      showToast(`Gagal mereset: ${err.message}`, 'error')
    }
  }

  const handleToggleDisabled = async () => {
    ;(document.getElementById('status_confirm_modal') as HTMLDialogElement | null)?.close()
    const action = profile.disabled ? 'mengaktifkan' : 'menonaktifkan'
    try {
      await setDisabled(profile.id, !profile.disabled)
      showToast(`Akun berhasil di-${action}.`, 'success')
      load()
    } catch (err: any) {
      showToast(`Gagal: ${err.message}`, 'error')
    }
  }

  const handleToggleRole = async () => {
    ;(document.getElementById('detail_role_confirm_modal') as HTMLDialogElement | null)?.close()
    const nextRole = profile.role === 'admin' ? 'user' : 'admin'
    try {
      await setRole(profile.id, nextRole)
      showToast(`Peran berhasil diubah menjadi ${nextRole === 'admin' ? 'Admin' : 'Pengguna'}.`, 'success')
      load()
    } catch (err: any) {
      showToast(`Gagal mengubah peran: ${err.message}`, 'error')
    }
  }

  const fallbackInitials = (profile.display_name || profile.email || 'U').trim().slice(0, 2).toUpperCase()

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Profile Header Card + 4 Progress Bars */}
      <div className="bg-panel border border-line rounded-xl sm:rounded-2xl p-3.5 sm:p-4 md:p-6 shadow-sm">
        <div className="flex justify-between items-start gap-2.5 sm:gap-3">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            {profile.avatar_url && !avatarError ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || profile.email || 'Profil'}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-8 h-8 sm:w-11 sm:h-11 rounded-full object-cover ring-1 ring-line shrink-0"
              />
            ) : (
              <span className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-pill ring-1 ring-line text-xs sm:text-sm font-bold text-ink flex items-center justify-center shrink-0">
                {fallbackInitials}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="m-0 mb-0.5 text-sm sm:text-xl md:text-2xl font-bold text-ink leading-tight truncate">
                {profile.display_name || 'Tanpa Nama'}
              </h2>
              {profile.email && (
                <div className="text-muted text-[10px] sm:text-xs md:text-sm mb-1.5 sm:mb-2 truncate">
                  {profile.email}
                </div>
              )}
              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                <span
                  className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${
                    profile.role === 'admin' ? 'bg-accent text-white' : 'bg-pill text-muted'
                  }`}
                >
                  Peran: {profile.role === 'admin' ? 'Admin' : 'Pengguna'}
                </span>
                <span
                  className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full text-white ${
                    profile.disabled ? 'bg-bad' : 'bg-ok'
                  }`}
                >
                  Status: {profile.disabled ? 'Nonaktif' : 'Aktif'}
                </span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-pill text-ink">
                  🔥 Beruntun: {userStreak} hari
                </span>
              </div>
            </div>
          </div>

          {/* 3-Dot Action Dropdown */}
          <div className="dropdown dropdown-end shrink-0">
            <button
              type="button"
              tabIndex={0}
              aria-label="Menu Aksi Pengguna"
              title="Aksi Pengguna"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-pill/80 hover:bg-pill border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="12" cy="19" r="1.75" />
              </svg>
            </button>
            <ul
              tabIndex={-1}
              className="menu menu-sm dropdown-content bg-panel rounded-2xl z-50 mt-2 w-52 p-2 shadow-xl border border-line text-xs"
            >
              <li>
                <button
                  type="button"
                  onClick={() => {
                    ;(document.activeElement as HTMLElement | null)?.blur()
                    ;(document.getElementById('reset_confirm_modal') as HTMLDialogElement | null)?.showModal()
                  }}
                  className="py-2 rounded-xl font-semibold text-ink"
                >
                  <span>🔄</span>
                  <span>Reset Progres</span>
                </button>
              </li>
              {!isSelf && (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        ;(document.activeElement as HTMLElement | null)?.blur()
                        ;(document.getElementById('detail_role_confirm_modal') as HTMLDialogElement | null)?.showModal()
                      }}
                      className="py-2 rounded-xl font-semibold text-accent"
                    >
                      <span>{profile.role === 'admin' ? 'Jadikan Pengguna' : 'Jadikan Admin'}</span>
                    </button>
                  </li>
                  <li className="border-t border-line mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        ;(document.activeElement as HTMLElement | null)?.blur()
                        ;(document.getElementById('status_confirm_modal') as HTMLDialogElement | null)?.showModal()
                      }}
                      className={`py-2 rounded-xl font-semibold ${profile.disabled ? 'text-ok' : 'text-bad'}`}
                    >
                      <span>{profile.disabled ? 'Aktifkan Akun' : 'Nonaktifkan Akun'}</span>
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* 4 Mastery Progress Bars */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2.5 mt-2.5 sm:mt-3.5 pt-2.5 sm:pt-3.5 border-t border-line">
          <div className="bg-bg/50 border border-line rounded-lg sm:rounded-xl px-2 py-1.5 sm:p-2.5">
            <div className="flex justify-between items-center gap-1 text-[10px] sm:text-xs text-muted mb-1">
              <span className="truncate">Hiragana ({hiraMastered}/{TOTAL_CARDS})</span>
              <span className="font-semibold text-ink shrink-0">{hiraPct}%</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 bg-pill rounded-full sm:rounded overflow-hidden">
              <div className="h-full bg-ok transition-all" style={{ width: `${hiraPct}%` }} />
            </div>
          </div>

          <div className="bg-bg/50 border border-line rounded-lg sm:rounded-xl px-2 py-1.5 sm:p-2.5">
            <div className="flex justify-between items-center gap-1 text-[10px] sm:text-xs text-muted mb-1">
              <span className="truncate">Katakana ({kataMastered}/{TOTAL_CARDS})</span>
              <span className="font-semibold text-ink shrink-0">{kataPct}%</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 bg-pill rounded-full sm:rounded overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${kataPct}%` }} />
            </div>
          </div>

          <div className="bg-bg/50 border border-line rounded-lg sm:rounded-xl px-2 py-1.5 sm:p-2.5">
            <div className="flex justify-between items-center gap-1 text-[10px] sm:text-xs text-muted mb-1">
              <span className="truncate">Kosakata ({vocabMastered}/{totalVocabWords})</span>
              <span className="font-semibold text-ink shrink-0">{vocabPct}%</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 bg-pill rounded-full sm:rounded overflow-hidden">
              <div className="h-full bg-[#e6a23c] transition-all" style={{ width: `${vocabPct}%` }} />
            </div>
          </div>

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

      {/* 3 Category Tabs */}
      <SlidingTabs
        ariaLabel="Kategori Detail Pengguna"
        value={mainTab}
        onChange={setMainTab}
        className="grid grid-cols-3 gap-1 bg-pill border border-line rounded-xl p-1"
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

      {/* TAB 1: KANA */}
      {mainTab === 'kana' && (
        <div className="space-y-4">
          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 md:p-6 shadow-sm">
            <div className="flex justify-between items-start sm:items-center flex-nowrap gap-2 sm:gap-3 mb-3 md:mb-4">
              <div className="min-w-0">
                <h3 className="m-0 text-sm sm:text-base md:text-lg font-semibold text-ink">Heatmap Hafalan Karakter</h3>
                <p className="text-muted text-[11px] sm:text-xs md:text-sm leading-snug mt-0.5 mb-0">
                  Status hafalan tiap huruf berdasarkan tingkat akurasi & Leitner Box.
                </p>
              </div>
              <SlidingTabs
                ariaLabel="Jenis Aksara"
                value={activeTab}
                onChange={setActiveTab}
                className="inline-flex bg-pill border border-line rounded-full p-0.5 sm:p-1 shrink-0"
                indicatorClassName="bg-accent rounded-full shadow-xs"
                buttonClassName="rounded-full text-xs sm:text-sm font-medium px-3 py-1 sm:px-4 sm:py-1.5"
                activeButtonClassName="text-white"
                inactiveButtonClassName="text-muted hover:text-ink"
                options={[
                  { value: 'hiragana', label: 'Hiragana' },
                  { value: 'katakana', label: 'Katakana' },
                ]}
              />
            </div>

            <div className="flex gap-3 flex-wrap mb-5 text-xs">
              {Object.entries(LEVEL_STYLES).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-[3px] border ${val.boxClass}`} />
                  <span className="text-muted">{val.label}</span>
                </div>
              ))}
            </div>

            <h4 className="m-0 mb-2 text-xs sm:text-sm text-muted font-medium">Tunggal (Gojūon & Dakuten - 71 Huruf)</h4>
            <div className="overflow-x-auto pb-2 mb-4">
              <div className="grid grid-cols-[repeat(16,minmax(32px,1fr))] sm:grid-cols-[repeat(16,minmax(38px,1fr))] gap-1 min-w-[540px] sm:min-w-[640px]">
                {COL_IDS.map((colId) => (
                  <div key={colId} className="flex flex-col gap-1">
                    <div className="text-center text-[10px] text-muted">{colId}</div>
                    {TABLE[activeTab][colId].map((cell, idx) => {
                      if (!cell) return <div key={idx} className="h-9 sm:h-10 bg-transparent" />
                      const key = `${activeTab}:${cell.k}`
                      const stat = progress.get(key)
                      const level = masteryLevel(stat)
                      const st = LEVEL_STYLES[level]
                      const title = stat
                        ? `${cell.k} (${cell.r}) - Benar: ${stat.ok}, Salah: ${stat.no}, Kotak: ${stat.box}`
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

            <h4 className="m-0 mb-2 text-xs sm:text-sm text-muted font-medium">Gabungan (Yōon - 33 Huruf)</h4>
            <div className="overflow-x-auto pb-2">
              <div className="grid grid-cols-[repeat(11,minmax(42px,1fr))] sm:grid-cols-[repeat(11,minmax(50px,1fr))] gap-1 min-w-[490px] sm:min-w-[580px]">
                {YOON_IDS.map((colId) => (
                  <div key={colId} className="flex flex-col gap-1">
                    <div className="text-center text-[10px] text-muted">{colId}</div>
                    {YOON_TABLE[activeTab][colId].map((cell) => {
                      const key = `${activeTab}:${cell.k}`
                      const stat = progress.get(key)
                      const level = masteryLevel(stat)
                      const st = LEVEL_STYLES[level]
                      const title = stat
                        ? `${cell.k} (${cell.r}) - Benar: ${stat.ok}, Salah: ${stat.no}, Kotak: ${stat.box}`
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

          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 md:p-6 shadow-sm">
            <h3 className="m-0 mb-3 text-sm sm:text-base md:text-lg font-semibold text-ink">
              Riwayat Sesi Kana ({sessions.length})
            </h3>
            {sessions.length === 0 ? (
              <p className="text-muted text-xs md:text-sm">Belum ada riwayat sesi latihan.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-base-content/5 bg-base-100">
                <table className="table table-xs sm:table-sm md:table-md">
                  <thead>
                    <tr>
                      <th>#</th>
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
                        <tr key={s.id} className="hover:bg-pill/20">
                          <th className="tabular-nums text-muted">{idx + 1}</th>
                          <td>{new Date(s.started_at).toLocaleString('id-ID')}</td>
                          <td className="capitalize">{s.script}</td>
                          <td>
                            {s.mode === 'char' ? 'Huruf' : 'Kata'} {s.composite ? '(Gabungan)' : '(Tunggal)'}
                          </td>
                          <td className="tabular-nums">{s.total_cards}</td>
                          <td className="text-ok font-semibold tabular-nums">{s.correct_cards}</td>
                          <td className="font-semibold tabular-nums">{acc}%</td>
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
      )}

      {/* TAB 2: KOSAKATA */}
      {mainTab === 'vocab' && (
        <div className="space-y-4">
          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 md:p-6 shadow-sm">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-ink mb-0.5">
              Distribusi Tingkat Hafalan Kosakata
            </h3>
            <p className="text-[11px] sm:text-xs text-muted mb-2.5">
              Pengelompokan kosakata berdasarkan kekuatan ingatan siswa.
            </p>
            <div className="stats stats-horizontal shadow-xs w-full grid grid-cols-4 bg-pill/40 border border-line rounded-xl overflow-hidden">
              <div className="stat px-2 py-2 sm:px-4 sm:py-2.5 min-w-0">
                <div className="stat-title text-muted text-[10px] sm:text-xs truncate">
                  <span className="sm:hidden">Belum</span>
                  <span className="hidden sm:inline">Belum Dipelajari</span>
                </div>
                <div className="stat-value text-ink text-lg sm:text-2xl font-black tabular-nums">{vocabNone}</div>
              </div>
              <div className="stat px-2 py-2 sm:px-4 sm:py-2.5 min-w-0">
                <div className="stat-title text-bad text-[10px] sm:text-xs truncate">
                  <span className="sm:hidden">Ulangi</span>
                  <span className="hidden sm:inline">Lemah / Ulangi</span>
                </div>
                <div className="stat-value text-bad text-lg sm:text-2xl font-black tabular-nums">{vocabWeak}</div>
              </div>
              <div className="stat px-2 py-2 sm:px-4 sm:py-2.5 min-w-0">
                <div className="stat-title text-[#e6a23c] text-[10px] sm:text-xs truncate">
                  <span className="sm:hidden">Belajar</span>
                  <span className="hidden sm:inline">Belajar / Berkembang</span>
                </div>
                <div className="stat-value text-[#e6a23c] text-lg sm:text-2xl font-black tabular-nums">{vocabLearning + vocabAlmost}</div>
              </div>
              <div className="stat px-2 py-2 sm:px-4 sm:py-2.5 min-w-0">
                <div className="stat-title text-ok text-[10px] sm:text-xs truncate">
                  <span className="sm:hidden">Hafal</span>
                  <span className="hidden sm:inline">Sudah Hafal Kuat</span>
                </div>
                <div className="stat-value text-ok text-lg sm:text-2xl font-black tabular-nums">{vocabMastered}</div>
              </div>
            </div>
          </div>

          {weakWords.length > 0 && (
            <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 md:p-6 shadow-sm space-y-2.5">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-ink m-0">
                Kosakata yang Sering Salah ({weakWords.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {weakWords.slice(0, 15).map((w) => {
                  const s = vocabProgress.get(w.id)
                  return (
                    <div key={w.id} className="bg-pill/40 border border-line rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-accent">{w.level} Bab {w.chapter}</span>
                        <span className="badge badge-soft badge-error badge-xs font-semibold">{s?.no ?? 0}x</span>
                      </div>
                      <div className="font-bold font-japanese text-base text-ink truncate">{w.kanji || w.kana}</div>
                      <div className="text-[11px] font-meaning text-muted truncate">{w.meaning}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 md:p-6 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-ink m-0">Progres Kosakata per Bab</h3>
                <p className="text-[11px] sm:text-xs text-muted m-0">Tingkat penyelesaian dan akurasi per materi bab.</p>
              </div>
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
              const started = activeVocabChapters
                .map((ch) => ({ ch, stats: calcCollectionStats(ch.words.map((w) => w.id), vocabProgress) }))
                .filter(({ stats }) => stats.okCount + stats.noCount > 0)

              if (started.length === 0) {
                return (
                  <p className="text-xs sm:text-sm text-muted py-6 text-center bg-bg/40 rounded-xl border border-dashed border-line">
                    Belum ada bab {vocabLevel.toUpperCase()} yang dikerjakan oleh siswa ini.
                  </p>
                )
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {started.map(({ ch, stats }) => {
                    const pct = ch.words.length > 0 ? Math.round((stats.learned / ch.words.length) * 100) : 0
                    return (
                      <div key={ch.id} className="bg-bg/40 border border-line rounded-xl p-3 space-y-2">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-muted">
                            <span className="font-bold text-accent">Bab {ch.chapter}</span>
                            <span>{ch.words.length} Kosakata</span>
                          </div>
                          <div className="font-bold text-ink text-xs sm:text-sm truncate">{ch.title}</div>
                        </div>
                        <div className="space-y-1 pt-1.5 border-t border-line/50">
                          <div className="flex justify-between text-[11px] text-muted">
                            <span>Hafal: {stats.learned}/{ch.words.length}</span>
                            <span className="font-semibold text-ink">Akurasi: {stats.accuracy}%</span>
                          </div>
                          <div className="w-full bg-pill rounded-full h-1.5 overflow-hidden">
                            <div className="bg-accent h-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          <MaterialSessionsTable title="Riwayat Sesi Kosakata" rows={vocabSessions} />
        </div>
      )}

      {/* TAB 3: KANJI */}
      {mainTab === 'kanji' && (
        <div className="space-y-4">
          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 md:p-6 shadow-sm">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-ink mb-0.5">
              Distribusi Tingkat Hafalan Kanji
            </h3>
            <p className="text-[11px] sm:text-xs text-muted mb-2.5">
              Pengelompokan Kanji berdasarkan kekuatan ingatan siswa.
            </p>
            <div className="stats stats-horizontal shadow-xs w-full grid grid-cols-4 bg-pill/40 border border-line rounded-xl overflow-hidden">
              <div className="stat px-2 py-2 sm:px-4 sm:py-2.5 min-w-0">
                <div className="stat-title text-muted text-[10px] sm:text-xs truncate">
                  <span className="sm:hidden">Belum</span>
                  <span className="hidden sm:inline">Belum Dipelajari</span>
                </div>
                <div className="stat-value text-ink text-lg sm:text-2xl font-black tabular-nums">{kanjiNone}</div>
              </div>
              <div className="stat px-2 py-2 sm:px-4 sm:py-2.5 min-w-0">
                <div className="stat-title text-bad text-[10px] sm:text-xs truncate">
                  <span className="sm:hidden">Ulangi</span>
                  <span className="hidden sm:inline">Lemah / Ulangi</span>
                </div>
                <div className="stat-value text-bad text-lg sm:text-2xl font-black tabular-nums">{kanjiWeak}</div>
              </div>
              <div className="stat px-2 py-2 sm:px-4 sm:py-2.5 min-w-0">
                <div className="stat-title text-[#e6a23c] text-[10px] sm:text-xs truncate">
                  <span className="sm:hidden">Belajar</span>
                  <span className="hidden sm:inline">Belajar / Berkembang</span>
                </div>
                <div className="stat-value text-[#e6a23c] text-lg sm:text-2xl font-black tabular-nums">{kanjiLearning + kanjiAlmost}</div>
              </div>
              <div className="stat px-2 py-2 sm:px-4 sm:py-2.5 min-w-0">
                <div className="stat-title text-ok text-[10px] sm:text-xs truncate">
                  <span className="sm:hidden">Hafal</span>
                  <span className="hidden sm:inline">Sudah Hafal Kuat</span>
                </div>
                <div className="stat-value text-ok text-lg sm:text-2xl font-black tabular-nums">{kanjiMastered}</div>
              </div>
            </div>
          </div>

          {weakKanji.length > 0 && (
            <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 md:p-6 shadow-sm space-y-2.5">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-ink m-0">
                Kanji yang Sering Salah ({weakKanji.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {weakKanji.slice(0, 15).map((k) => {
                  const s = kanjiProgress.get(k.id)
                  return (
                    <div key={k.id} className="bg-pill/40 border border-line rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-accent">{k.level} Bab {k.chapter}</span>
                        <span className="badge badge-soft badge-error badge-xs font-semibold">{s?.no ?? 0}x</span>
                      </div>
                      <div className="font-bold font-japanese text-xl text-ink">{k.kanji}</div>
                      <div className="text-[11px] font-meaning text-muted truncate">{k.meaning}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 md:p-6 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-ink m-0">Progres Kanji per Bab</h3>
                <p className="text-[11px] sm:text-xs text-muted m-0">Tingkat penyelesaian dan akurasi per materi bab Kanji.</p>
              </div>
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
              const started = activeKanjiChapters
                .map((ch) => ({ ch, stats: calcCollectionStats(ch.items.map((i) => i.id), kanjiProgress) }))
                .filter(({ stats }) => stats.okCount + stats.noCount > 0)

              if (started.length === 0) {
                return (
                  <p className="text-xs sm:text-sm text-muted py-6 text-center bg-bg/40 rounded-xl border border-dashed border-line">
                    Belum ada bab Kanji {kanjiLevel.toUpperCase()} yang dikerjakan oleh siswa ini.
                  </p>
                )
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {started.map(({ ch, stats }) => {
                    const pct = ch.items.length > 0 ? Math.round((stats.learned / ch.items.length) * 100) : 0
                    return (
                      <div key={ch.id} className="bg-bg/40 border border-line rounded-xl p-3 space-y-2">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-muted">
                            <span className="font-bold text-accent">Bab {ch.chapter}</span>
                            <span>{ch.items.length} Kanji</span>
                          </div>
                          <div className="font-bold text-ink text-xs sm:text-sm truncate">{ch.title}</div>
                        </div>
                        <div className="space-y-1 pt-1.5 border-t border-line/50">
                          <div className="flex justify-between text-[11px] text-muted">
                            <span>Hafal: {stats.learned}/{ch.items.length}</span>
                            <span className="font-semibold text-ink">Akurasi: {stats.accuracy}%</span>
                          </div>
                          <div className="w-full bg-pill rounded-full h-1.5 overflow-hidden">
                            <div className="bg-accent h-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          <MaterialSessionsTable title="Riwayat Sesi Kanji" rows={kanjiSessions} />
        </div>
      )}

      <dialog id="reset_confirm_modal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Reset Progres Hafalan?</h3>
          <p className="py-4">
            Yakin ingin mereset seluruh progres hafalan untuk {profile.display_name || profile.email}?
          </p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button className="btn">Tutup</button>
              <button type="button" className="btn btn-error text-white" onClick={() => void handleReset()}>
                Reset Progres
              </button>
            </form>
          </div>
        </div>
      </dialog>

      <dialog id="status_confirm_modal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">{profile.disabled ? 'Aktifkan Akun?' : 'Nonaktifkan Akun?'}</h3>
          <p className="py-4">
            Yakin ingin {profile.disabled ? 'mengaktifkan' : 'menonaktifkan'} akun {profile.display_name || profile.email}?
          </p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button className="btn">Tutup</button>
              <button
                type="button"
                className={`btn text-white ${profile.disabled ? 'btn-success' : 'btn-error'}`}
                onClick={() => void handleToggleDisabled()}
              >
                {profile.disabled ? 'Aktifkan' : 'Nonaktifkan'}
              </button>
            </form>
          </div>
        </div>
      </dialog>

      <dialog id="detail_role_confirm_modal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Ubah Peran Pengguna?</h3>
          <p className="py-4">
            Yakin ingin mengubah peran {profile.display_name || profile.email} menjadi{' '}
            <strong>{profile.role === 'admin' ? 'Pengguna' : 'Admin'}</strong>?
          </p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button className="btn">Tutup</button>
              <button
                type="button"
                className="btn bg-[#5eb839] hover:bg-[#4ea32e] border-0 text-white"
                onClick={() => void handleToggleRole()}
              >
                Simpan Peran
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  )
}
