import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUsers, setRole, type AdminUser } from '../../lib/admin'
import { useAuth } from '../../store/useAuth'
import { useContentStore } from '../../store/useContentStore'
import { showToast } from '../../store/useToast'

const PAGE_SIZE = 15

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || 'U').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

function UserAvatar({ name, email, avatarUrl }: { name?: string | null; email?: string | null; avatarUrl?: string | null }) {
  const [imgError, setImgError] = useState(false)
  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name || email || 'Profil'}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="w-8 h-8 rounded-full object-cover border border-line shrink-0"
      />
    )
  }
  return (
    <span className="w-8 h-8 rounded-full bg-pill border border-line text-[11px] font-bold text-ink flex items-center justify-center shrink-0">
      {getInitials(name, email)}
    </span>
  )
}

export default function AdminUsers() {
  const currentUser = useAuth((s) => s.user)
  const vocabChapters = useContentStore((s) => s.vocabChapters)
  const kanjiChapters = useContentStore((s) => s.kanjiChapters)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
  const [page, setPage] = useState(1)
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

  const totalVocabWords = vocabChapters.reduce((acc, ch) => acc + ch.words.length, 0)
  const totalKanjiItems = kanjiChapters.reduce((acc, ch) => acc + ch.items.length, 0)

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (statusFilter === 'active' && u.disabled) return false
    if (statusFilter === 'disabled' && !u.disabled) return false
    const q = search.toLowerCase()
    if (!q) return true
    return (
      (u.display_name && u.display_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const paginatedUsers = filtered.slice(pageStart, pageStart + PAGE_SIZE)

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

  if (loading) return <p className="text-muted text-[13px] text-center py-10">Memuat daftar pengguna...</p>
  if (error) return <p className="text-bad text-center py-10">Kesalahan: {error}</p>

  return (
    <div className="space-y-4 md:space-y-5">
      <div>
        <h2 className="m-0 text-base sm:text-xl md:text-2xl font-bold text-ink">Daftar Pengguna ({users.length})</h2>
        <p className="text-muted text-[11px] sm:text-xs md:text-sm leading-snug mt-0.5 mb-0">
          Pantau progres belajar dan atur peran pengguna per aksara.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto sm:flex-1">
          <input
            className="w-full sm:max-w-[300px] h-9 md:h-10 rounded-full border border-line bg-pill text-ink text-xs md:text-sm text-left px-4 placeholder:text-muted"
            placeholder="Cari nama, email, atau ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <select
              aria-label="Filter peran"
              className="select select-sm md:select-md w-full sm:w-auto rounded-full border-line bg-pill text-xs md:text-sm font-medium"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as 'all' | 'user' | 'admin')
                setPage(1)
              }}
            >
              <option value="all">Semua Peran</option>
              <option value="user">Pengguna</option>
              <option value="admin">Admin</option>
            </select>
            <select
              aria-label="Filter status"
              className="select select-sm md:select-md w-full sm:w-auto rounded-full border-line bg-pill text-xs md:text-sm font-medium"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'active' | 'disabled')
                setPage(1)
              }}
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="disabled">Nonaktif</option>
            </select>
          </div>
        </div>

        <span className="text-[11px] md:text-xs text-muted font-medium">
          Menampilkan {filtered.length} dari {users.length} pengguna
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-base-content/5 bg-base-100 shadow-sm">
        <table className="table table-xs sm:table-sm md:table-md">
          <thead>
            <tr>
              <th>#</th>
              <th>Pengguna</th>
              <th>Peran</th>
              <th>Progres Kana</th>
              <th>Kosakata & Kanji</th>
              <th>Login Terakhir</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted">
                  Tidak ada pengguna yang cocok.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u, idx) => {
                const isSelf = currentUser?.id === u.id
                const vocabPct = totalVocabWords > 0 ? Math.min(100, Math.round((u.vocabMastered / totalVocabWords) * 100)) : 0
                const kanjiPct = totalKanjiItems > 0 ? Math.min(100, Math.round((u.kanjiMastered / totalKanjiItems) * 100)) : 0
                return (
                  <tr key={u.id} className={`hover:bg-pill/30 ${u.disabled ? 'opacity-60' : ''}`}>
                    <th className="tabular-nums text-muted">{pageStart + idx + 1}</th>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={u.display_name} email={u.email} avatarUrl={u.avatar_url} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-ink truncate">{u.display_name || 'Tanpa Nama'}</span>
                            {u.disabled && (
                              <span className="badge badge-soft badge-error badge-xs font-semibold">
                                Nonaktif
                              </span>
                            )}
                          </div>
                          <div className="text-muted text-[11px] truncate">{u.email || u.id}</div>
                        </div>
                      </div>
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
                      <div className="space-y-1 min-w-[130px]">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-muted w-9">Hira</span>
                          <div className="w-16 h-1.5 bg-pill rounded-full overflow-hidden">
                            <div className="h-full bg-ok" style={{ width: `${u.hiraganaPct}%` }} />
                          </div>
                          <span className="font-semibold tabular-nums">{u.hiraganaPct}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-muted w-9">Kata</span>
                          <div className="w-16 h-1.5 bg-pill rounded-full overflow-hidden">
                            <div className="h-full bg-accent" style={{ width: `${u.katakanaPct}%` }} />
                          </div>
                          <span className="font-semibold tabular-nums">{u.katakanaPct}%</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1 min-w-[140px]">
                        <div
                          className="flex items-center gap-2 text-[11px]"
                          title={`${u.vocabMastered}/${totalVocabWords} kosakata hafal kuat`}
                        >
                          <span className="text-muted w-11">Kosakata</span>
                          <div className="w-16 h-1.5 bg-pill rounded-full overflow-hidden">
                            <div className="h-full bg-[#e6a23c]" style={{ width: `${vocabPct}%` }} />
                          </div>
                          <span className="font-semibold tabular-nums">{vocabPct}%</span>
                        </div>
                        <div
                          className="flex items-center gap-2 text-[11px]"
                          title={`${u.kanjiMastered}/${totalKanjiItems} kanji hafal kuat`}
                        >
                          <span className="text-muted w-11">Kanji</span>
                          <div className="w-16 h-1.5 bg-pill rounded-full overflow-hidden">
                            <div className="h-full bg-secondary" style={{ width: `${kanjiPct}%` }} />
                          </div>
                          <span className="font-semibold tabular-nums">{kanjiPct}%</span>
                        </div>
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
                        Lihat Detail →
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span>
            Halaman {safePage} dari {totalPages}
          </span>
          <div className="join">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="join-item btn btn-xs sm:btn-sm bg-panel border-line text-ink"
            >
              ‹ Sebelumnya
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="join-item btn btn-xs sm:btn-sm bg-panel border-line text-ink"
            >
              Berikutnya ›
            </button>
          </div>
        </div>
      )}

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
