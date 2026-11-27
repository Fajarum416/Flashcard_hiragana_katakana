import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { useAuth } from '../../store/useAuth'
import { useTheme } from '../../store/useTheme'

const SIDEBAR_STORAGE_KEY = 'enna_admin_sidebar_collapsed'

interface AdminNavItem {
  to: string
  label: string
  end?: boolean
  icon: ReactNode
}

interface AdminNavGroup {
  title: string
  items: AdminNavItem[]
}

const NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'Analitik',
    items: [
      {
        to: '/admin',
        label: 'Ringkasan',
        end: true,
        icon: (
          <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        ),
      },
      {
        to: '/admin/users',
        label: 'Daftar Pengguna',
        icon: (
          <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Konten',
    items: [
      {
        to: '/admin/vocab',
        label: 'Kelola Kosakata',
        icon: (
          <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        ),
      },
      {
        to: '/admin/kanji',
        label: 'Kelola Kanji',
        icon: (
          <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
            <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
          </svg>
        ),
      },
    ],
  },
]

interface BreadcrumbSegment {
  label: string
  to?: string
}

function getBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  if (pathname === '/admin') {
    return [{ label: 'Admin', to: '/admin' }, { label: 'Ringkasan' }]
  }
  if (pathname.startsWith('/admin/users/')) {
    return [
      { label: 'Admin', to: '/admin' },
      { label: 'Daftar Pengguna', to: '/admin/users' },
      { label: 'Detail Pengguna' },
    ]
  }
  if (pathname.startsWith('/admin/users')) {
    return [{ label: 'Admin', to: '/admin' }, { label: 'Daftar Pengguna' }]
  }
  if (pathname.startsWith('/admin/vocab')) {
    return [{ label: 'Admin', to: '/admin' }, { label: 'Kelola Kosakata' }]
  }
  if (pathname.startsWith('/admin/kanji')) {
    return [{ label: 'Admin', to: '/admin' }, { label: 'Kelola Kanji' }]
  }
  return [{ label: 'Admin' }]
}

interface AdminLayoutProps {
  onLogout?: () => void
}

export default function AdminLayout({ onLogout }: AdminLayoutProps) {
  const { user, role, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0')
      } catch {}
      return next
    })
  }

  const closeDropdowns = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

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

  const breadcrumbs = getBreadcrumbs(location.pathname)
  const displayName = user.user_metadata?.full_name || 'Admin'
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email ?? 'Admin')}`

  const renderSidebarContent = (isCollapsed: boolean, onNavigate?: () => void) => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div
        className={`flex items-center h-14 md:h-16 border-b border-line shrink-0 ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <NavLink
          to="/admin"
          onClick={onNavigate}
          title="Panel Admin Enna Card"
          className="flex items-center gap-2 no-underline overflow-hidden"
        >
          {isCollapsed ? (
            <span className="w-9 h-9 rounded-xl bg-accent text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
              E
            </span>
          ) : (
            <>
              <Logo className="h-7 md:h-8 w-auto block shrink-0" />
              <span className="badge badge-soft badge-warning badge-xs font-bold shrink-0">Admin</span>
            </>
          )}
        </NavLink>

        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Tutup Menu Admin"
            className="lg:hidden w-8 h-8 rounded-lg bg-pill hover:bg-pill-on border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 512 512">
              <polygon points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Navigasi Panel Admin">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {isCollapsed ? (
              <div className="flex justify-center mb-2 text-muted" title={group.title}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                </svg>
              </div>
            ) : (
              <div className="px-3 mb-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-muted">
                {group.title}
              </div>
            )}

            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-xs md:text-sm font-semibold no-underline transition-colors ${
                      isCollapsed ? 'justify-center p-2.5 md:p-3' : 'gap-2.5 px-3 py-2 md:py-2.5'
                    } ${
                      isActive
                        ? 'bg-accent text-white shadow-xs'
                        : 'text-muted hover:text-ink hover:bg-pill'
                    }`
                  }
                >
                  {item.icon}
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: Back to Student App */}
      <div className="p-3 border-t border-line shrink-0">
        <NavLink
          to="/hiragana/flashcard"
          onClick={onNavigate}
          title={isCollapsed ? 'Kembali ke Aplikasi' : undefined}
          className={`w-full flex items-center rounded-xl bg-pill/80 hover:bg-pill border border-line text-ink text-xs md:text-sm font-semibold no-underline transition-colors ${
            isCollapsed ? 'justify-center p-2.5 md:p-3' : 'justify-center gap-1.5 px-3 py-2 md:py-2.5'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          {!isCollapsed && <span>Kembali ke Aplikasi</span>}
        </NavLink>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex">
      {/* Desktop Collapsible Left Sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col shrink-0 sticky top-0 h-screen bg-panel/95 border-r border-line transition-[width] duration-250 ease-out overflow-hidden ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {renderSidebarContent(collapsed)}
      </aside>

      {/* Mobile Slide-Over Left Drawer */}
      <div
        aria-hidden={!drawerOpen}
        className={`lg:hidden fixed inset-0 z-50 transition-[visibility] duration-300 ${
          drawerOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
        }`}
      >
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 ease-out ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`fixed top-0 left-0 bottom-0 w-[78%] max-w-[280px] bg-panel border-r border-line shadow-2xl transform transition-transform duration-300 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderSidebarContent(false, () => setDrawerOpen(false))}
        </aside>
      </div>

      {/* Main Column: Sticky Topbar + Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Admin Topbar */}
        <header className="sticky top-0 z-40 h-14 md:h-16 px-4 md:px-6 flex items-center justify-between gap-3 bg-panel/90 backdrop-blur-md border-b border-line shrink-0">
          {/* Left: Sidebar Toggle (+ Mobile Brand) */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Lebarkan Sidebar' : 'Ciutkan Sidebar'}
              title={collapsed ? 'Lebarkan Sidebar' : 'Ciutkan Sidebar'}
              className="hidden lg:flex w-10 h-10 rounded-xl bg-pill/70 hover:bg-pill border border-line text-ink items-center justify-center cursor-pointer transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h10.5m-10.5 5.25h16.5" />
              </svg>
            </button>

            {/* Mobile drawer toggle */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka Menu Admin"
              className="lg:hidden w-9 h-9 rounded-xl bg-pill/70 hover:bg-pill border border-line text-ink flex items-center justify-center cursor-pointer transition-colors shrink-0"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 512 512">
                <path d="M64,384H448V341.33H64Zm0-106.67H448V234.67H64ZM64,128v42.67H448V128Z" />
              </svg>
            </button>

            <NavLink to="/admin" className="lg:hidden flex items-center gap-2 no-underline">
              <Logo className="h-6 w-auto block" />
              <span className="badge badge-soft badge-warning badge-xs font-bold">Admin</span>
            </NavLink>
          </div>

          {/* Right: Theme Toggle + Admin User Dropdown */}
          <div className="flex items-center gap-2 md:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Ganti Tema"
              title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-pill/70 hover:bg-pill border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4 fill-current text-amber-400" viewBox="0 0 24 24">
                  <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 fill-current text-amber-500" viewBox="0 0 24 24">
                  <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
                </svg>
              )}
            </button>

            {/* Admin User Dropdown */}
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="flex items-center gap-2 h-9 md:h-10 pl-1.5 pr-2.5 md:pr-3 rounded-xl bg-pill/70 hover:bg-pill border border-line text-ink cursor-pointer transition-colors"
              >
                <img
                  alt={displayName}
                  src={avatarUrl}
                  className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border border-line shrink-0"
                />
                <span className="hidden sm:inline text-xs md:text-sm font-semibold max-w-[140px] truncate">
                  {displayName}
                </span>
                <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              <ul
                tabIndex={-1}
                className="menu menu-sm dropdown-content bg-panel rounded-2xl z-50 mt-2 w-60 p-2 shadow-xl border border-line text-xs"
              >
                <li className="menu-title px-3 py-2 border-b border-line mb-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink text-xs truncate">{displayName}</span>
                    <span className="badge badge-soft badge-warning badge-xs font-bold shrink-0">Admin</span>
                  </div>
                  {user.email && (
                    <span className="text-[11px] text-muted font-normal truncate block mt-0.5">{user.email}</span>
                  )}
                </li>
                <li>
                  <NavLink to="/profile" onClick={closeDropdowns} className="py-2 rounded-xl font-medium">
                    Profil Saya
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/hiragana/flashcard" onClick={closeDropdowns} className="py-2 rounded-xl font-medium">
                    Kembali ke Aplikasi
                  </NavLink>
                </li>
                {onLogout && (
                  <li className="border-t border-line mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdowns()
                        onLogout()
                      }}
                      className="py-2 rounded-xl font-semibold text-error flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                        <path fillRule="evenodd" d="M16.5 3.75a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5V15a.75.75 0 0 0-1.5 0v3.75a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V5.25a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3V9A.75.75 0 1 0 9 9V5.25a1.5 1.5 0 0 1 1.5-1.5h6ZM5.78 8.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 0 0 0 1.06l3 3a.75.75 0 0 0 1.06-1.06l-1.72-1.72H15a.75.75 0 0 0 0-1.5H4.06l1.72-1.72a.75.75 0 0 0 0-1.06Z" clipRule="evenodd" />
                      </svg>
                      <span>Keluar</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </header>

        {/* Main Content Area (TailAdmin padding: p-4 md:p-6 max-w-(--breakpoint-2xl)) */}
        <div className="flex-1 min-w-0 p-4 md:p-6 mx-auto w-full max-w-(--breakpoint-2xl)">
          {/* Page Breadcrumb inside content area (TailAdmin pattern) */}
          <nav aria-label="Breadcrumb" className="mb-3 md:mb-4 flex items-center gap-1.5 text-xs md:text-sm">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <div key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5 min-w-0">
                  {idx > 0 && (
                    <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                  {crumb.to && !isLast ? (
                    <Link
                      to={crumb.to}
                      className="text-muted hover:text-ink no-underline font-medium truncate"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'font-semibold text-ink truncate' : 'text-muted truncate'}>
                      {crumb.label}
                    </span>
                  )}
                </div>
              )
            })}
          </nav>

          <Outlet />
        </div>
      </div>
    </div>
  )
}
