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

  if (loading) return <p className="text-muted text-[13px] text-center py-10">Memuat daftar pengguna...</p>
  if (error) return <p className="text-bad text-center py-10">Error: {error}</p>

  return (
    <div>
      <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
        <div>
          <h2 className="m-0 text-xl font-bold">Daftar Pengguna ({users.length})</h2>
          <p className="text-muted text-[13px] mt-1 mb-0">Pantau progres belajar dan hafalan pengguna per aksara.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            className="border-0 rounded-full bg-pill hover:bg-pill-on text-ink font-semibold text-[13px] px-4 py-2 cursor-pointer inline-block transition-all"
            onClick={handleExport}
          >
            📥 Ekspor CSV
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          className="w-full max-w-[360px] h-10 rounded-full border border-line bg-pill text-ink text-sm text-left px-5 placeholder:text-muted"
          placeholder="Cari nama, email, atau ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-panel border border-line rounded-xl overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2.5 px-3.5">Pengguna</th>
              <th className="py-2.5 px-3.5">Role</th>
              <th className="py-2.5 px-3.5">Hiragana (104)</th>
              <th className="py-2.5 px-3.5">Katakana (104)</th>
              <th className="py-2.5 px-3.5">Login Terakhir</th>
              <th className="py-2.5 px-3.5">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  Tidak ada pengguna yang cocok.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className={`border-b border-line ${u.disabled ? 'opacity-60' : ''}`}>
                  <td className="py-3 px-3.5">
                    <div className="font-medium">{u.display_name || 'Tanpa Nama'}</div>
                    <div className="text-muted text-xs">{u.email || u.id}</div>
                    {u.disabled && (
                      <span className="text-[11px] bg-bad text-white px-1.5 py-0.5 rounded">
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        u.role === 'admin' ? 'bg-accent text-white' : 'bg-pill text-muted'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-pill rounded overflow-hidden">
                        <div className="h-full bg-ok" style={{ width: `${u.hiraganaPct}%` }} />
                      </div>
                      <span className="font-medium">{u.hiraganaPct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-pill rounded overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${u.katakanaPct}%` }} />
                      </div>
                      <span className="font-medium">{u.katakanaPct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-muted text-[13px]">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-3.5">
                    <Link
                      to={`/admin/users/${u.id}`}
                      className="text-accent font-medium text-[13px] underline hover:opacity-80"
                    >
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
