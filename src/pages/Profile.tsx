import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/useAuth'

interface ProfileProps {
  onDeleteAccount: () => void
  onLogout: () => void
}

export default function Profile({ onDeleteAccount, onLogout }: ProfileProps) {
  const user = useAuth((s) => s.user)
  const role = useAuth((s) => s.role)

  if (!user) return <Navigate to="/" replace />

  const fullName = user.user_metadata?.full_name || 'Pelajar'
  const email = user.email || '-'
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email ?? 'User')}`
  const providerRaw = (user.app_metadata?.provider as string | undefined) || 'email'
  const providerLabel = providerRaw.charAt(0).toUpperCase() + providerRaw.slice(1)
  const joinedAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-'

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold m-0 mb-3 sm:mb-5">Profil Pengguna</h1>

      {/* Account Header Card */}
      <div className="bg-panel border border-line rounded-xl p-3.5 sm:p-6 mb-3.5 sm:mb-5">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-line shrink-0">
            <img alt={fullName} className="w-full h-full object-cover" src={avatarUrl} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="m-0 mb-0.5 sm:mb-1 text-base sm:text-xl font-bold truncate">{fullName}</h2>
            <div className="text-muted text-xs sm:text-sm mb-1.5 sm:mb-2 truncate">{email}</div>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              <span className="badge badge-soft badge-info badge-sm font-medium">
                Peran: {role === 'admin' ? 'Admin' : 'Pengguna'}
              </span>
              <span className="badge badge-soft badge-success badge-sm font-semibold">
                Status: Aktif
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-sm bg-pill hover:bg-pill-on border border-line text-ink rounded-full px-4 font-semibold inline-flex items-center gap-1.5 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0 text-error">
              <path fillRule="evenodd" d="M16.5 3.75a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5V15a.75.75 0 0 0-1.5 0v3.75a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V5.25a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3V9A.75.75 0 1 0 9 9V5.25a1.5 1.5 0 0 1 1.5-1.5h6ZM5.78 8.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 0 0 0 1.06l3 3a.75.75 0 0 0 1.06-1.06l-1.72-1.72H15a.75.75 0 0 0 0-1.5H4.06l1.72-1.72a.75.75 0 0 0 0-1.06Z" clipRule="evenodd" />
            </svg>
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Account Identity Details */}
      <div className="bg-panel border border-line rounded-xl p-3.5 sm:p-6 mb-3.5 sm:mb-5">
        <h3 className="m-0 mb-2.5 sm:mb-4 text-sm sm:text-base font-semibold">Data Identitas Akun</h3>
        <dl className="m-0 divide-y divide-line text-xs sm:text-sm">
          <div className="py-2 sm:py-3 flex justify-between gap-3 sm:gap-4 flex-wrap">
            <dt className="text-muted">Nama Lengkap</dt>
            <dd className="m-0 font-medium text-ink text-right">{fullName}</dd>
          </div>
          <div className="py-2 sm:py-3 flex justify-between gap-3 sm:gap-4 flex-wrap">
            <dt className="text-muted">Email</dt>
            <dd className="m-0 font-medium text-ink text-right break-all">{email}</dd>
          </div>
          <div className="py-2 sm:py-3 flex justify-between gap-3 sm:gap-4 flex-wrap">
            <dt className="text-muted">Peran Akun</dt>
            <dd className="m-0 font-medium text-ink text-right">
              {role === 'admin' ? 'Admin' : 'Pengguna'}
            </dd>
          </div>
          <div className="py-2 sm:py-3 flex justify-between gap-3 sm:gap-4 flex-wrap">
            <dt className="text-muted">Metode Masuk</dt>
            <dd className="m-0 font-medium text-ink text-right">{providerLabel}</dd>
          </div>
          <div className="py-2 sm:py-3 flex justify-between gap-3 sm:gap-4 flex-wrap">
            <dt className="text-muted">Bergabung Sejak</dt>
            <dd className="m-0 font-medium text-ink text-right">{joinedAt}</dd>
          </div>
          <div className="pt-2 sm:pt-3 flex justify-between gap-3 sm:gap-4 flex-wrap">
            <dt className="text-muted">ID Pengguna</dt>
            <dd className="m-0 font-mono text-[11px] sm:text-xs text-muted text-right break-all">{user.id}</dd>
          </div>
        </dl>
      </div>

      {/* Delete Account Section */}
      <div className="bg-panel border border-bad/30 rounded-xl p-3.5 sm:p-6">
        <h3 className="m-0 mb-1 sm:mb-1.5 text-sm sm:text-base font-semibold text-bad">Hapus Akun</h3>
        <p className="text-muted text-xs sm:text-sm mt-0 mb-3 sm:mb-4">
          Menghapus akun akan menghapus seluruh data identitas dan progres belajar Anda secara permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
        <button
          type="button"
          onClick={onDeleteAccount}
          className="btn btn-error btn-sm sm:btn-md text-white rounded-full px-5 sm:px-6 font-semibold"
        >
          Hapus Akun
        </button>
      </div>
    </div>
  )
}
