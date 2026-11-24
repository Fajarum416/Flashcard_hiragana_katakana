import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/useAuth'

interface ProfileProps {
  onDeleteAccount: () => void
}

export default function Profile({ onDeleteAccount }: ProfileProps) {
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
      <h1 className="text-2xl font-bold m-0 mb-5">Profil Pengguna</h1>

      {/* Account Header Card */}
      <div className="bg-panel border border-line rounded-xl p-6 mb-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-line shrink-0">
            <img alt={fullName} className="w-full h-full object-cover" src={avatarUrl} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="m-0 mb-1 text-xl font-bold truncate">{fullName}</h2>
            <div className="text-muted text-sm mb-2 truncate">{email}</div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pill text-muted font-medium">
                Peran: {role === 'admin' ? 'Admin' : 'Pengguna'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent text-white font-semibold">
                Status: Aktif
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Identity Details */}
      <div className="bg-panel border border-line rounded-xl p-6 mb-5">
        <h3 className="m-0 mb-4 text-base font-semibold">Data Identitas Akun</h3>
        <dl className="m-0 divide-y divide-line text-sm">
          <div className="py-3 flex justify-between gap-4 flex-wrap">
            <dt className="text-muted">Nama Lengkap</dt>
            <dd className="m-0 font-medium text-ink text-right">{fullName}</dd>
          </div>
          <div className="py-3 flex justify-between gap-4 flex-wrap">
            <dt className="text-muted">Email</dt>
            <dd className="m-0 font-medium text-ink text-right break-all">{email}</dd>
          </div>
          <div className="py-3 flex justify-between gap-4 flex-wrap">
            <dt className="text-muted">Peran Akun</dt>
            <dd className="m-0 font-medium text-ink text-right">
              {role === 'admin' ? 'Admin' : 'Pengguna'}
            </dd>
          </div>
          <div className="py-3 flex justify-between gap-4 flex-wrap">
            <dt className="text-muted">Metode Masuk</dt>
            <dd className="m-0 font-medium text-ink text-right">{providerLabel}</dd>
          </div>
          <div className="py-3 flex justify-between gap-4 flex-wrap">
            <dt className="text-muted">Bergabung Sejak</dt>
            <dd className="m-0 font-medium text-ink text-right">{joinedAt}</dd>
          </div>
          <div className="pt-3 flex justify-between gap-4 flex-wrap">
            <dt className="text-muted">ID Pengguna</dt>
            <dd className="m-0 font-mono text-xs text-muted text-right break-all">{user.id}</dd>
          </div>
        </dl>
      </div>

      {/* Delete Account Section */}
      <div className="bg-panel border border-bad/30 rounded-xl p-6">
        <h3 className="m-0 mb-1.5 text-base font-semibold text-bad">Hapus Akun</h3>
        <p className="text-muted text-sm mt-0 mb-4">
          Menghapus akun akan menghapus seluruh data identitas dan progres belajar Anda secara permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
        <button
          type="button"
          onClick={onDeleteAccount}
          className="btn btn-error text-white rounded-full px-6 h-11 min-h-11 font-semibold"
        >
          Hapus Akun
        </button>
      </div>
    </div>
  )
}
