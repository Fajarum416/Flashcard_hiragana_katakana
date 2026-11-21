import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../store/useAuth'

export default function AdminLayout() {
  const { user, role, loading } = useAuth()

  if (loading) {
    return <p className="dim" style={{ textAlign: 'center', padding: '60px 0' }}>Memeriksa hak akses admin...</p>
  }

  if (!user || role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <h2>Akses Terbatas</h2>
        <p className="dim">Halaman ini hanya dapat diakses oleh akun dengan role administrator.</p>
        <Navigate to="/" replace />
      </div>
    )
  }

  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'on' : '')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 24 }}>
        <NavLink to="/admin" end className={`link ${cls}`} style={{ textDecoration: 'none', padding: '6px 14px', borderRadius: 999 }}>
          Ringkasan (Overview)
        </NavLink>
        <NavLink to="/admin/users" className={`link ${cls}`} style={{ textDecoration: 'none', padding: '6px 14px', borderRadius: 999 }}>
          Daftar Pengguna
        </NavLink>
      </div>
      <Outlet />
    </div>
  )
}
