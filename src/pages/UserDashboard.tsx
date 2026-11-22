import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { COL_IDS, TABLE, YOON_IDS, YOON_TABLE, type Script } from '../data/kana'
import { fetchUserDetail, type SessionRow } from '../lib/admin'
import { db } from '../lib/db'
import { TOTAL_CARDS, masteryLevel, percent, streak, type Level, type ProgressRow } from '../lib/mastery'
import { syncNow } from '../lib/sync'
import { useAuth } from '../store/useAuth'
import { useSelection } from '../store/useSelection'

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

export default function UserDashboard() {
  const { user, role, loading: authLoading } = useAuth()
  const localStats = useSelection((s) => s.stats)

  const [progress, setProgress] = useState<Map<string, ProgressRow>>(new Map())
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Script>('hiragana')

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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <Link
          to="/hiragana/flashcard"
          className="inline-flex items-center gap-1.5 border border-line rounded-full bg-pill hover:bg-pill-on text-ink font-semibold text-xs px-4 py-2 no-underline cursor-pointer transition-all"
        >
          ← Kembali
        </Link>
        {error && <span className="text-xs text-muted">Menampilkan sinkronisasi terakhir ({error})</span>}
      </div>

      {/* User Profile & Summary Header */}
      <div className="bg-panel border border-line rounded-xl p-5 mb-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-line shrink-0">
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
            <div>
              <h2 className="m-0 mb-1 text-xl font-bold">
                {user.user_metadata?.full_name || 'Pelajar'}
              </h2>
              <div className="text-muted text-[13px] mb-2">{user.email}</div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-pill text-muted font-medium">
                  Peran: {role === 'admin' ? 'Admin' : 'Pengguna'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#5eb839] text-white font-semibold">
                  Status: Aktif
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-pill text-ink font-medium">
                  🔥 Beruntun: {userStreak} hari
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="border-0 rounded-full bg-pill hover:bg-pill-on text-ink font-semibold text-xs px-4 py-2 cursor-pointer transition-all"
              onClick={() => void load()}
            >
              ↻ Segarkan Data
            </button>
          </div>
        </div>

        {/* Mastery Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-line">
          <div className="bg-bg/50 border border-line rounded-xl p-3.5">
            <div className="flex justify-between items-center text-xs text-muted mb-1.5">
              <span>Penguasaan Hiragana ({hiraMastered}/{TOTAL_CARDS})</span>
              <span className="font-semibold text-ink">{hiraPct}%</span>
            </div>
            <div className="w-full h-2 bg-pill rounded overflow-hidden">
              <div className="h-full bg-ok transition-all" style={{ width: `${hiraPct}%` }} />
            </div>
          </div>
          <div className="bg-bg/50 border border-line rounded-xl p-3.5">
            <div className="flex justify-between items-center text-xs text-muted mb-1.5">
              <span>Penguasaan Katakana ({kataMastered}/{TOTAL_CARDS})</span>
              <span className="font-semibold text-ink">{kataPct}%</span>
            </div>
            <div className="w-full h-2 bg-pill rounded overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${kataPct}%` }} />
            </div>
          </div>
          <div className="bg-bg/50 border border-line rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <small className="text-muted block text-xs">Total Sesi Dikerjakan</small>
              <span className="text-2xl font-bold text-ink">{sessions.length} Sesi</span>
            </div>
            <span className="text-2xl">📊</span>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-[13px] text-center py-10">Memuat heatmap dan riwayat latihan...</p>
      ) : (
        <>
          {/* Heatmap Section */}
          <div className="bg-panel border border-line rounded-xl p-5 mb-6">
            <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
              <div>
                <h3 className="m-0 text-base font-semibold">Heatmap Hafalan Karakter</h3>
                <p className="text-muted text-xs mt-1 mb-0">
                  Status hafalan tiap huruf berdasarkan tingkat akurasi & Leitner Box.
                </p>
              </div>
              <div className="inline-flex bg-pill border border-line rounded-full p-1" role="group">
                <button
                  type="button"
                  className={`border-0 rounded-full cursor-pointer text-sm font-medium px-4 py-1.5 transition-colors ${
                    activeTab === 'hiragana' ? 'bg-pill-on text-ink' : 'bg-transparent text-muted hover:text-ink'
                  }`}
                  onClick={() => setActiveTab('hiragana')}
                >
                  Hiragana
                </button>
                <button
                  type="button"
                  className={`border-0 rounded-full cursor-pointer text-sm font-medium px-4 py-1.5 transition-colors ${
                    activeTab === 'katakana' ? 'bg-pill-on text-ink' : 'bg-transparent text-muted hover:text-ink'
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
                        ? `${cell.k} (${cell.r}) - Benar: ${stat.ok}, Salah: ${stat.no}, Kotak: ${stat.box}`
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
                        ? `${cell.k} (${cell.r}) - Benar: ${stat.ok}, Salah: ${stat.no}, Kotak: ${stat.box}`
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
          <div className="bg-panel border border-line rounded-xl p-5">
            <h3 className="m-0 mb-4 text-base font-semibold">Riwayat Pengerjaan Latihan ({sessions.length})</h3>
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
        </>
      )}
    </div>
  )
}
