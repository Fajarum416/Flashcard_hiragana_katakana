import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUsers, setRole, type AdminUser } from '../../lib/admin'
import { downloadCsv, toCsv } from '../../lib/csv'
import { useAuth } from '../../store/useAuth'
import { showToast } from '../../store/useToast'

export default function AdminUsers() {
  const currentUser = useAuth((s) => s.user)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [pendingRole, setPendingRole] = useState<{ user: AdminUser; nextRole: 'user' | 'admin' } | null>(null)
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null)

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

  const askRoleChange = (user: AdminUser, nextRole: 'user' | 'admin') => {
    if (user.role === nextRole) return
    setPendingRole({ user, nextRole })
    ;(document.getElementById('role_confirm_modal') as HTMLDialogElement | null)?.showModal()
  }

  const confirmRoleChange = async () => {
    if (!pendingRole) return
    const { user, nextRole } = pendingRole
    ;(document.getElementById('role_confirm_modal') as HTMLDialogElement | null)?.close()
    setSavingRoleId(user.id)
    try {
      await setRole(user.id, nextRole)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)))
      showToast(
        `Peran ${user.display_name || user.email} berhasil diubah menjadi ${nextRole === 'admin' ? 'Admin' : 'Pengguna'}.`,
        'success',
      )
    } catch (err: any) {
      showToast(`Gagal mengubah peran: ${err?.message ?? 'Terjadi kesalahan'}`, 'error')
    } finally {
      setSavingRoleId(null)
      setPendingRole(null)
    }
  }

  const handleExport = () => {
    const headers = ['ID', 'Nama', 'Email', 'Peran', 'Status', 'Hiragana (%)', 'Katakana (%)', 'Login Terakhir', 'Terdaftar']
    const rows = filtered.map((u) => [
      u.id,
      u.display_name || '',
      u.email || '',
      u.role === 'admin' ? 'Admin' : 'Pengguna',
      u.disabled ? 'Nonaktif' : 'Aktif',
      u.hiraganaPct,
      u.katakanaPct,
      u.last_login_at ? new Date(u.last_login_at).toLocaleString('id-ID') : '-',
      new Date(u.created_at).toLocaleString('id-ID'),
    ])
    const csv = toCsv(headers, rows)
    downloadCsv(`kana_users_${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  if (loading) return <p className="text-muted text-[13px] text-center py-10">Memuat daftar pengguna...</p>
  if (error) return <p className="text-bad text-center py-10">Kesalahan: {error}</p>

  return (
    <div>
      <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
        <div>
          <h2 className="m-0 text-xl font-bold">Daftar Pengguna ({users.length})</h2>
          <p className="text-muted text-[13px] mt-1 mb-0">Pantau progres belajar dan atur peran pengguna per aksara.</p>
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

      <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Pengguna</th>
              <th>Peran</th>
              <th>Hiragana (104)</th>
              <th>Katakana (104)</th>
              <th>Login Terakhir</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted">
                  Tidak ada pengguna yang cocok.
                </td>
              </tr>
            ) : (
              filtered.map((u, idx) => {
                const isSelf = currentUser?.id === u.id
                return (
                  <tr key={u.id} className={u.disabled ? 'opacity-60' : ''}>
                    <th>{idx + 1}</th>
                    <td>
                      <div className="font-medium">{u.display_name || 'Tanpa Nama'}</div>
                      <div className="text-muted text-xs">{u.email || u.id}</div>
                      {u.disabled && (
                        <span className="text-[11px] bg-bad text-white px-1.5 py-0.5 rounded">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td>
                      {isSelf ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent text-white inline-block">
                          Admin (Anda)
                        </span>
                      ) : (
                        <select
                          aria-label={`Ubah peran ${u.display_name || u.email || u.id}`}
                          className="select select-sm w-36"
                          value={u.role}
                          disabled={savingRoleId === u.id}
                          onChange={(e) => askRoleChange(u, e.target.value as 'user' | 'admin')}
                        >
                          <option disabled value="">
                            Pilih peran
                          </option>
                          <option value="user">Pengguna</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-pill rounded overflow-hidden">
                          <div className="h-full bg-ok" style={{ width: `${u.hiraganaPct}%` }} />
                        </div>
                        <span className="font-medium">{u.hiraganaPct}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-pill rounded overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${u.katakanaPct}%` }} />
                        </div>
                        <span className="font-medium">{u.katakanaPct}%</span>
                      </div>
                    </td>
                    <td className="text-muted text-[13px]">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td>
                      <Link
                        to={`/admin/users/${u.id}`}
                        className="text-accent font-medium text-[13px] underline hover:opacity-80 whitespace-nowrap"
                      >
                        Detail & Heatmap →
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <dialog id="role_confirm_modal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Ubah Peran Pengguna?</h3>
          <p className="py-4">
            Yakin ingin mengubah peran{' '}
            <strong>{pendingRole?.user.display_name || pendingRole?.user.email}</strong> menjadi{' '}
            <strong>{pendingRole?.nextRole === 'admin' ? 'Admin' : 'Pengguna'}</strong>?
          </p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button className="btn" onClick={() => setPendingRole(null)}>
                Tutup
              </button>
              <button
                type="button"
                className="btn bg-[#5eb839] hover:bg-[#4ea32e] border-0 text-white"
                onClick={() => void confirmRoleChange()}
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
