import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../store/useAuth'

export default function AdminLayout() {
  const { user, role, loading } = useAuth()

  if (loading) {
    return <p className="text-muted text-[13px] text-center py-[60px]">Memeriksa hak akses admin...</p>
  }

  if (!user || role !== 'admin') {
    return (
      <div className="text-center py-[60px]">
        <h2 className="text-2xl font-bold mb-2">Akses Terbatas</h2>
        <p className="text-muted text-[13px]">Halaman ini hanya dapat diakses oleh akun dengan peran administrator.</p>
        <Navigate to="/" replace />
      </div>
    )
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `no-underline px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
      isActive ? 'bg-pill-on text-ink' : 'text-muted hover:text-ink'
    }`

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-line pb-3 mb-6">
        <NavLink to="/admin" end className={navClass}>
          Ringkasan
        </NavLink>
        <NavLink to="/admin/users" className={navClass}>
          Daftar Pengguna
        </NavLink>
        <NavLink to="/admin/vocab" className={navClass}>
          Kelola Kosakata
        </NavLink>
        <NavLink to="/admin/kanji" className={navClass}>
          Kelola Kanji
        </NavLink>
      </div>
      <Outlet />
    </div>
  )
}
