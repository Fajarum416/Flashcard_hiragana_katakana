import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOverview, type Overview } from '../../lib/admin'

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOverview()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="dim" style={{ textAlign: 'center', padding: '40px 0' }}>Memuat ringkasan admin...</p>
  if (error) return <p className="bad" style={{ color: 'var(--bad)', textAlign: 'center', padding: '40px 0' }}>Error: {error}</p>
  if (!data) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Dashboard Admin</h2>
        <Link to="/admin/users" className="btn alt" style={{ fontSize: 13, padding: '8px 16px' }}>
          Lihat Daftar Pengguna →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 30 }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <small style={{ color: 'var(--muted)', display: 'block' }}>Total Pengguna</small>
          <span style={{ fontSize: 32, fontWeight: 600 }}>{data.total_users}</span>
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <small style={{ color: 'var(--muted)', display: 'block' }}>Pengguna Aktif Harian (DAU 24j)</small>
          <span style={{ fontSize: 32, fontWeight: 600, color: 'var(--accent)' }}>{data.dau}</span>
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <small style={{ color: 'var(--muted)', display: 'block' }}>Pengguna Aktif Mingguan (WAU 7h)</small>
          <span style={{ fontSize: 32, fontWeight: 600, color: 'var(--ok)' }}>{data.wau}</span>
        </div>
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Huruf Paling Sering Salah (Top 10 Kesalahan Global)</h3>
        {data.top_mistakes.length === 0 ? (
          <p className="dim">Belum ada data kesalahan yang tercatat.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Aksara / Huruf</th>
                  <th style={{ padding: '8px 12px' }}>ID Kartu</th>
                  <th style={{ padding: '8px 12px' }}>Jumlah Salah</th>
                  <th style={{ padding: '8px 12px' }}>Jumlah Benar</th>
                  <th style={{ padding: '8px 12px' }}>Rasio Salah</th>
                </tr>
              </thead>
              <tbody>
                {data.top_mistakes.map((m) => {
                  const [sc, char] = m.kana_id.split(':')
                  const total = m.wrong + m.correct
                  const pct = total > 0 ? Math.round((m.wrong / total) * 100) : 0
                  return (
                    <tr key={m.kana_id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <strong className="jp" style={{ fontSize: 20, marginRight: 8 }}>{char}</strong>
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>({sc})</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{m.kana_id}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--bad)', fontWeight: 600 }}>{m.wrong}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--ok)' }}>{m.correct}</td>
                      <td style={{ padding: '10px 12px' }}>{pct}%</td>
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
