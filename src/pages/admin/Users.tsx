import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUsers, type AdminUser } from '../../lib/admin'
import { downloadCsv, toCsv } from '../../lib/csv'

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchUsers()
      .then((res) => {
        setUsers(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      (u.display_name && u.display_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    )
  })

  const handleExport = () => {
    const headers = ['ID', 'Nama', 'Email', 'Role', 'Status', 'Hiragana (%)', 'Katakana (%)', 'Login Terakhir', 'Terdaftar']
    const rows = filtered.map((u) => [
      u.id,
      u.display_name || '',
      u.email || '',
      u.role,
      u.disabled ? 'Nonaktif' : 'Aktif',
      u.hiraganaPct,
      u.katakanaPct,
      u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '-',
      new Date(u.created_at).toLocaleString(),
    ])
    const csv = toCsv(headers, rows)
    downloadCsv(`kana_users_${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  if (loading) return <p className="dim" style={{ textAlign: 'center', padding: '40px 0' }}>Memuat daftar pengguna...</p>
  if (error) return <p className="bad" style={{ color: 'var(--bad)', textAlign: 'center', padding: '40px 0' }}>Error: {error}</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Daftar Pengguna ({users.length})</h2>
          <p className="dim" style={{ margin: '4px 0 0 0' }}>Pantau progres belajar dan hafalan pengguna per aksara.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn alt" style={{ fontSize: 13, padding: '8px 16px' }} onClick={handleExport}>
            📥 Ekspor CSV
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          className="inp"
          style={{ height: 40, fontSize: 14, textAlign: 'left', maxWidth: 360, width: '100%' }}
          placeholder="Cari nama, email, atau ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
              <th style={{ padding: '10px 14px' }}>Pengguna</th>
              <th style={{ padding: '10px 14px' }}>Role</th>
              <th style={{ padding: '10px 14px' }}>Hiragana (104)</th>
              <th style={{ padding: '10px 14px' }}>Katakana (104)</th>
              <th style={{ padding: '10px 14px' }}>Login Terakhir</th>
              <th style={{ padding: '10px 14px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  Tidak ada pengguna yang cocok.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--line)', opacity: u.disabled ? 0.6 : 1 }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 500 }}>{u.display_name || 'Tanpa Nama'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>{u.email || u.id}</div>
                    {u.disabled && (
                      <span style={{ fontSize: 11, background: 'var(--bad)', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: u.role === 'admin' ? 'var(--accent)' : 'var(--pill)',
                        color: u.role === 'admin' ? '#fff' : 'var(--muted)',
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 8, background: 'var(--pill)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${u.hiraganaPct}%`, height: '100%', background: 'var(--ok)' }} />
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.hiraganaPct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 8, background: 'var(--pill)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${u.katakanaPct}%`, height: '100%', background: 'var(--accent)' }} />
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.katakanaPct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 13 }}>
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <Link to={`/admin/users/${u.id}`} className="link" style={{ fontWeight: 500, color: 'var(--accent)' }}>
                      Detail & Heatmap →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
