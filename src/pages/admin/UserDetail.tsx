import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SlidingTabs } from '../../components/Segmented'
import { COL_IDS, TABLE, YOON_IDS, YOON_TABLE, type Script } from '../../data/kana'
import { fetchUserDetail, resetProgress, setDisabled, setRole, type UserDetail } from '../../lib/admin'
import { masteryLevel, streak, type Level } from '../../lib/mastery'
import { useAuth } from '../../store/useAuth'
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

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const currentUser = useAuth((s) => s.user)
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Script>('hiragana')

  const load = () => {
    if (!id) return
    setLoading(true)
    fetchUserDetail(id)
      .then((res) => {
        setData(res)
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

  const { profile, progress, sessions } = data
  const userStreak = streak(sessions.map((s) => s.started_at))
  const isSelf = currentUser?.id === profile.id

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

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1.5 border border-line rounded-full bg-pill hover:bg-pill-on text-ink font-semibold text-xs px-4 py-2 no-underline cursor-pointer transition-all"
        >
          ← Kembali
        </Link>
      </div>

      <div className="bg-panel border border-line rounded-xl p-5 mb-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h2 className="m-0 mb-1.5 text-xl font-bold">{profile.display_name || 'Tanpa Nama'}</h2>
            <div className="text-muted text-[13px] mb-2">
              {profile.email} • ID: {profile.id}
            </div>
            <div className="flex gap-2 flex-wrap">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  profile.role === 'admin' ? 'bg-accent text-white' : 'bg-pill text-muted'
                }`}
              >
                Peran: {profile.role === 'admin' ? 'Admin' : 'Pengguna'}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full text-white ${
                  profile.disabled ? 'bg-bad' : 'bg-ok'
                }`}
              >
                Status: {profile.disabled ? 'Nonaktif' : 'Aktif'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-pill text-ink">
                🔥 Beruntun: {userStreak} hari
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="border-0 rounded-full bg-pill hover:bg-pill-on text-ink font-semibold text-xs px-3.5 py-2 cursor-pointer transition-all"
              onClick={() => (document.getElementById('reset_confirm_modal') as HTMLDialogElement | null)?.showModal()}
            >
              🔄 Reset Progres
            </button>
            {!isSelf && (
              <>
                <button
                  type="button"
                  className="border-0 rounded-full bg-pill hover:bg-pill-on text-accent font-semibold text-xs px-3.5 py-2 cursor-pointer transition-all"
                  onClick={() => (document.getElementById('detail_role_confirm_modal') as HTMLDialogElement | null)?.showModal()}
                >
                  {profile.role === 'admin' ? 'Jadikan Pengguna' : 'Jadikan Admin'}
                </button>
                <button
                  type="button"
                  className={`border-0 rounded-full bg-pill hover:bg-pill-on font-semibold text-xs px-3.5 py-2 cursor-pointer transition-all ${
                    profile.disabled ? 'text-ok' : 'text-bad'
                  }`}
                  onClick={() => (document.getElementById('status_confirm_modal') as HTMLDialogElement | null)?.showModal()}
                >
                  {profile.disabled ? 'Aktifkan Akun' : 'Nonaktifkan Akun'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="bg-panel border border-line rounded-xl p-5 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
          <div>
            <h3 className="m-0 text-base font-semibold">Heatmap Hafalan Karakter</h3>
            <p className="text-muted text-xs mt-1 mb-0">
              Status hafalan tiap huruf berdasarkan tingkat akurasi & Leitner Box.
            </p>
          </div>
          <SlidingTabs
            ariaLabel="Jenis Aksara"
            value={activeTab}
            onChange={setActiveTab}
            className="inline-flex bg-pill border border-line rounded-full p-1"
            indicatorClassName="bg-pill-on rounded-full"
            buttonClassName="rounded-full text-sm font-medium px-4 py-1.5"
            activeButtonClassName="text-ink"
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

      {/* Session History */}
      <div className="bg-panel border border-line rounded-xl p-5">
        <h3 className="m-0 mb-4 text-base font-semibold">Riwayat Sesi Latihan ({sessions.length})</h3>
        {sessions.length === 0 ? (
          <p className="text-muted text-[13px]">Belum ada riwayat sesi latihan.</p>
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
