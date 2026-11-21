import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { COL_IDS, TABLE, YOON_IDS, YOON_TABLE, type Script } from '../../data/kana'
import { fetchUserDetail, resetProgress, setDisabled, type UserDetail } from '../../lib/admin'
import { masteryLevel, streak, type Level } from '../../lib/mastery'
import { useAuth } from '../../store/useAuth'

const LEVEL_COLORS: Record<Level, { bg: string; text: string; label: string }> = {
  none: { bg: 'var(--pill)', text: 'var(--muted)', label: 'Belum dipelajari' },
  weak: { bg: 'rgba(240, 131, 111, 0.25)', text: 'var(--bad)', label: 'Lemah (<60%)' },
  learning: { bg: 'rgba(235, 185, 80, 0.25)', text: '#e6a23c', label: 'Belajar (Box 1-2)' },
  almost: { bg: 'rgba(138, 167, 255, 0.25)', text: 'var(--accent)', label: 'Hampir (Box 3)' },
  mastered: { bg: 'rgba(94, 196, 154, 0.25)', text: 'var(--ok)', label: 'Hafal (Box 4-5, ≥80%)' },
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

  if (loading) return <p className="dim" style={{ textAlign: 'center', padding: '40px 0' }}>Memuat data pengguna...</p>
  if (error || !data) return <p className="bad" style={{ color: 'var(--bad)', textAlign: 'center', padding: '40px 0' }}>Error: {error || 'Pengguna tidak ditemukan'}</p>

  const { profile, progress, sessions } = data
  const userStreak = streak(sessions.map((s) => s.started_at))
  const isSelf = currentUser?.id === profile.id

  const handleReset = async () => {
    if (!window.confirm(`Yakin ingin mereset seluruh progres hafalan untuk ${profile.display_name || profile.email}?`)) return
    try {
      await resetProgress(profile.id)
      alert('Progres berhasil direset.')
      load()
    } catch (err: any) {
      alert(`Gagal mereset: ${err.message}`)
    }
  }

  const handleToggleDisabled = async () => {
    const action = profile.disabled ? 'mengaktifkan' : 'menonaktifkan'
    if (!window.confirm(`Yakin ingin ${action} akun ${profile.display_name || profile.email}?`)) return
    try {
      await setDisabled(profile.id, !profile.disabled)
      alert(`Akun berhasil di-${action}.`)
      load()
    } catch (err: any) {
      alert(`Gagal: ${err.message}`)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/admin/users" className="link">← Kembali ke Daftar Pengguna</Link>
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0' }}>{profile.display_name || 'Tanpa Nama'}</h2>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>{profile.email} • ID: {profile.id}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: profile.role === 'admin' ? 'var(--accent)' : 'var(--pill)', color: profile.role === 'admin' ? '#fff' : 'var(--muted)' }}>
                Role: {profile.role}
              </span>
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: profile.disabled ? 'var(--bad)' : 'var(--ok)', color: '#fff' }}>
                Status: {profile.disabled ? 'Nonaktif' : 'Aktif'}
              </span>
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: 'var(--pill)', color: 'var(--ink)' }}>
                🔥 Streak: {userStreak} hari
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn alt" style={{ fontSize: 12, padding: '8px 14px' }} onClick={handleReset}>
              🔄 Reset Progres
            </button>
            {!isSelf && (
              <button
                className="btn alt"
                style={{ fontSize: 12, padding: '8px 14px', color: profile.disabled ? 'var(--ok)' : 'var(--bad)' }}
                onClick={handleToggleDisabled}
              >
                {profile.disabled ? 'Aktifkan Akun' : 'Nonaktifkan Akun'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>Heatmap Hafalan Karakter</h3>
            <p className="dim" style={{ margin: '4px 0 0 0', fontSize: 12 }}>Status hafalan tiap huruf berdasarkan tingkat akurasi & Leitner Box.</p>
          </div>
          <div className="seg" role="group">
            <button className={activeTab === 'hiragana' ? 'on' : ''} onClick={() => setActiveTab('hiragana')}>Hiragana</button>
            <button className={activeTab === 'katakana' ? 'on' : ''} onClick={() => setActiveTab('katakana')}>Katakana</button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, fontSize: 12 }}>
          {Object.entries(LEVEL_COLORS).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: val.bg, border: `1px solid ${val.text}` }} />
              <span style={{ color: 'var(--muted)' }}>{val.label}</span>
            </div>
          ))}
        </div>

        {/* Gojuon Heatmap */}
        <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: 'var(--muted)' }}>Single (Gojūon & Dakuten - 71 Huruf)</h4>
        <div style={{ overflowX: 'auto', paddingBottom: 12, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, minmax(48px, 1fr))', gap: 6, minWidth: 800 }}>
            {COL_IDS.map((id) => (
              <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>{id}</div>
                {TABLE[activeTab][id].map((cell, idx) => {
                  if (!cell) return <div key={idx} style={{ height: 48, background: 'transparent' }} />
                  const key = `${activeTab}:${cell.k}`
                  const stat = progress.get(key)
                  const level = masteryLevel(stat)
                  const style = LEVEL_COLORS[level]
                  const title = stat ? `${cell.k} (${cell.r}) - Benar: ${stat.ok}, Salah: ${stat.no}, Box: ${stat.box}` : `${cell.k} (${cell.r}) - Belum dicoba`
                  return (
                    <div
                      key={cell.k}
                      title={title}
                      style={{
                        height: 48,
                        borderRadius: 6,
                        background: style.bg,
                        border: `1px solid ${style.text}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'default',
                      }}
                    >
                      <span className="jp" style={{ fontSize: 18, fontWeight: 500, color: style.text }}>{cell.k}</span>
                      <small style={{ fontSize: 9, color: 'var(--muted)' }}>{cell.r}</small>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Yoon Heatmap */}
        <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: 'var(--muted)' }}>Composite (Yōon - 33 Huruf)</h4>
        <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, minmax(64px, 1fr))', gap: 6, minWidth: 700 }}>
            {YOON_IDS.map((id) => (
              <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>{id}</div>
                {YOON_TABLE[activeTab][id].map((cell) => {
                  const key = `${activeTab}:${cell.k}`
                  const stat = progress.get(key)
                  const level = masteryLevel(stat)
                  const style = LEVEL_COLORS[level]
                  const title = stat ? `${cell.k} (${cell.r}) - Benar: ${stat.ok}, Salah: ${stat.no}, Box: ${stat.box}` : `${cell.k} (${cell.r}) - Belum dicoba`
                  return (
                    <div
                      key={cell.k}
                      title={title}
                      style={{
                        height: 48,
                        borderRadius: 6,
                        background: style.bg,
                        border: `1px solid ${style.text}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'default',
                      }}
                    >
                      <span className="jp" style={{ fontSize: 16, fontWeight: 500, color: style.text }}>{cell.k}</span>
                      <small style={{ fontSize: 9, color: 'var(--muted)' }}>{cell.r}</small>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session History */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Riwayat Sesi Latihan ({sessions.length})</h3>
        {sessions.length === 0 ? (
          <p className="dim">Belum ada riwayat sesi latihan.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Waktu Sesi</th>
                  <th style={{ padding: '8px 12px' }}>Aksara</th>
                  <th style={{ padding: '8px 12px' }}>Mode</th>
                  <th style={{ padding: '8px 12px' }}>Total Kartu</th>
                  <th style={{ padding: '8px 12px' }}>Benar</th>
                  <th style={{ padding: '8px 12px' }}>Akurasi</th>
                  <th style={{ padding: '8px 12px' }}>Durasi</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const acc = s.total_cards > 0 ? Math.round((s.correct_cards / s.total_cards) * 100) : 0
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 12px' }}>{new Date(s.started_at).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{s.script}</td>
                      <td style={{ padding: '10px 12px' }}>{s.mode === 'char' ? 'Characters' : 'Words'} {s.composite ? '(Comp)' : '(Single)'}</td>
                      <td style={{ padding: '10px 12px' }}>{s.total_cards}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--ok)' }}>{s.correct_cards}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{acc}%</td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{s.duration_sec ? `${s.duration_sec} dtk` : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
