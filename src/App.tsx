import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { supabaseEnabled } from './lib/supabase'
import { startSync } from './lib/sync'
import { useAuth } from './store/useAuth'
import { useSelection } from './store/useSelection'
import Home from './pages/Home'
import Practice from './pages/Practice'
import UserDashboard from './pages/UserDashboard'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/Overview'
import AdminUsers from './pages/admin/Users'
import AdminUserDetail from './pages/admin/UserDetail'
import { InstallPrompt } from './components/InstallPrompt'
import { GoogleSignInModal, googleClientId } from './components/GoogleSignInModal'

function AppContent() {
  const [msg, setMsg] = useState('')
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openHira, setOpenHira] = useState(true)
  const [openKata, setOpenKata] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toast = (m: string) => {
    setMsg(m)
    ;(document.getElementById('my_modal_1') as HTMLDialogElement | null)?.showModal()
  }

  const { user, role, loading, init, signIn, signOut, deleteAccount } = useAuth()
  const { srsMode, setSrsMode, resetOnLogout } = useSelection()
  useEffect(() => init(), [init])
  useEffect(() => startSync(), [])

  const onLogin = () => {
    if (!supabaseEnabled) return toast('Supabase belum dikonfigurasi (isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env)')
    if (googleClientId) {
      setLoginModalOpen(true)
    } else {
      void signIn()
    }
  }

  const onLogout = async () => {
    closeDropdowns()
    setMobileOpen(false)
    await signOut()
    resetOnLogout()
    navigate('/hiragana/flashcard', { replace: true })
  }

  const onDelete = () => {
    closeDropdowns()
    setMobileOpen(false)
    ;(document.getElementById('delete_account_modal') as HTMLDialogElement | null)?.showModal()
  }

  const confirmDelete = async () => {
    ;(document.getElementById('delete_account_modal') as HTMLDialogElement | null)?.close()
    const err = await deleteAccount()
    if (!err) {
      resetOnLogout()
      navigate('/hiragana/flashcard', { replace: true })
    }
    toast(err ? `Gagal menghapus akun: ${err}` : 'Akun berhasil dihapus')
  }

  const closeDropdowns = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    document.querySelectorAll('[popover]').forEach((el) => {
      try {
        (el as HTMLElement & { hidePopover?: () => void }).hidePopover?.()
      } catch {}
    })
  }

  const isHiragana = location.pathname.startsWith('/hiragana') || location.pathname.startsWith('/practice/hiragana')
  const isKatakana = location.pathname.startsWith('/katakana') || location.pathname.startsWith('/practice/katakana')
  const isPractice = location.pathname.startsWith('/practice/')

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b transition-all duration-200 ${
          scrolled ? 'bg-black/65 backdrop-blur-md border-white/15 shadow-md' : 'bg-transparent border-white/10'
        }`}
      >
        <div className="navbar bg-transparent w-full px-4 sm:px-6 md:px-12 lg:px-20 xl:px-[120px] py-3 sm:py-3.5 md:py-4 justify-between">
          {/* Navbar Start: Brand Logo */}
          <div className="navbar-start w-auto">
            <NavLink to="/hiragana/flashcard" className="flex items-center hover:opacity-90 px-1 no-underline">
              <img src="/logo_flashcard.svg" alt="Flashcard Logo" className="h-9 sm:h-11 w-auto block" />
            </NavLink>
          </div>

          {/* Navbar End: Desktop Megamenu + Profile (sm:flex) & Mobile Hamburger Button (sm:hidden) */}
          <div className="navbar-end w-auto gap-2 sm:gap-3">
            {/* Mobile Hamburger Button on Right */}
            <button
              type="button"
              className="sm:hidden w-11 h-11 rounded-xl bg-pill hover:bg-pill-on border-0 text-ink flex items-center justify-center cursor-pointer transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div
              className="hidden sm:flex megamenu megamenu-lg p-1.5 bg-transparent border border-white/15 rounded-box text-base font-medium"
              id="my-megamenu-5"
            >
              <span className="megamenu-active"></span>

              <button
                type="button"
                popoverTarget="k1"
                className={`text-base font-semibold ${isHiragana ? 'text-[#5eb839] font-bold' : ''}`}
              >
                Hiragana
              </button>
              <div id="k1" popover="auto">
                <ul className="menu menu-md bg-base-100 rounded-box shadow-xl p-2.5 border border-base-200 min-w-60 text-base">
                  <li>
                    <NavLink
                      to="/hiragana/flashcard"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive ? '!text-[#5eb839] font-bold' : ''}`}
                    >
                      Hiragana Flashcards
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/hiragana/word"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive ? '!text-[#5eb839] font-bold' : ''}`}
                    >
                      Hiragana Words
                    </NavLink>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                popoverTarget="k2"
                className={`text-base font-semibold ${isKatakana ? 'text-[#5eb839] font-bold' : ''}`}
              >
                Katakana
              </button>
              <div id="k2" popover="auto">
                <ul className="menu menu-md bg-base-100 rounded-box shadow-xl p-2.5 border border-base-200 min-w-60 text-base">
                  <li>
                    <NavLink
                      to="/katakana/flashcard"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive ? '!text-[#5eb839] font-bold' : ''}`}
                    >
                      Katakana Flashcards
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/katakana/word"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive ? '!text-[#5eb839] font-bold' : ''}`}
                    >
                      Katakana Words
                    </NavLink>
                  </li>
                </ul>
              </div>

              {role === 'admin' && (
                <NavLink
                  to="/admin"
                  onClick={closeDropdowns}
                  className={({ isActive }) =>
                    `text-base font-semibold ${isActive ? 'text-[#5eb839] font-bold' : 'text-accent'}`
                  }
                >
                  Dashboard
                </NavLink>
              )}

              {user && role !== 'admin' && (
                <NavLink
                  to="/dashboard"
                  onClick={closeDropdowns}
                  className={({ isActive }) =>
                    `text-base font-semibold ${isActive ? 'text-[#5eb839] font-bold' : 'text-accent'}`
                  }
                >
                  Progress
                </NavLink>
              )}
            </div>

            {/* Desktop Profile / Sign In Component */}
            <div className="hidden sm:block">
            {user ? (
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost rounded-full gap-3 border border-base-300 normal-case px-4 h-12 min-h-12 text-base">
                  <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-base-300">
                    <img
                      alt={user.user_metadata?.full_name ?? user.email ?? 'Profile'}
                      src={
                        user.user_metadata?.avatar_url ||
                        user.user_metadata?.picture ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email ?? 'User')}`
                      }
                    />
                  </div>
                  <span className="text-base font-semibold truncate max-w-[160px] hidden md:inline">
                    {user.user_metadata?.full_name ?? user.email}
                  </span>
                </div>
                <ul tabIndex={-1} className="menu menu-md dropdown-content bg-base-100 rounded-box z-50 mt-2 w-72 p-3 shadow-xl border border-base-200 text-base">
                  <li className="menu-title px-4 py-2 border-b border-base-200 mb-1">
                    <span className="font-semibold text-base-content text-base truncate block">
                      {user.user_metadata?.full_name || 'Learner'}
                    </span>
                    <span className="text-xs text-base-content/60 truncate font-normal block">
                      {user.email}
                    </span>
                  </li>
                  <li>
                    <a className="justify-between py-2.5 text-base font-medium" onClick={closeDropdowns}>
                      Profile
                      <span className="badge badge-md bg-[#5eb839] border-[#5eb839] text-white font-semibold">Active</span>
                    </a>
                  </li>
                  <li>
                    <div
                      onClick={() => setSrsMode(!srsMode)}
                      className="flex items-center justify-between py-2.5 text-base font-medium cursor-pointer hover:bg-base-200/60 rounded-lg"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">🧠</span>
                        <span>SRS Mode</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={srsMode}
                        onChange={() => setSrsMode(!srsMode)}
                        className="toggle toggle-success toggle-sm pointer-events-none"
                      />
                    </div>
                  </li>
                  {role === 'admin' ? (
                    <li>
                      <NavLink to="/admin" onClick={closeDropdowns} className="justify-between text-accent font-semibold py-2.5 text-base">
                        Dashboard
                        <span className="badge badge-accent badge-xs">Admin</span>
                      </NavLink>
                    </li>
                  ) : (
                    <li>
                      <NavLink to="/dashboard" onClick={closeDropdowns} className="justify-between text-accent font-semibold py-2.5 text-base">
                        Progres
                        <span className="badge badge-accent badge-xs">User</span>
                      </NavLink>
                    </li>
                  )}
                  <li><button onClick={() => void onLogout()} className="py-2.5 text-base font-medium">Logout</button></li>
                  <li><button onClick={() => void onDelete()} className="text-error py-2.5 text-base font-medium">Hapus Akun</button></li>
                </ul>
              </div>
            ) : (
              <div className="dropdown dropdown-end">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-ghost rounded-full normal-case gap-3 px-5 text-base font-semibold border border-base-300 hover:border-base-content/60 bg-base-200/50 h-12 min-h-12"
                >
                  <svg className="w-5 h-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Sign in</span>
                </div>
                <ul tabIndex={-1} className="menu menu-md dropdown-content bg-base-100 rounded-box z-50 mt-2 w-72 p-3 shadow-xl border border-base-200 text-base">
                  <li className="menu-title px-4 py-2 border-b border-base-200 mb-1">
                    <span className="font-semibold text-base-content text-base block">
                      Tamu (Guest)
                    </span>
                    <span className="text-xs text-base-content/60 font-normal block">
                      Masuk untuk sinkronisasi cloud
                    </span>
                  </li>
                  <li>
                    <div
                      onClick={() => setSrsMode(!srsMode)}
                      className="flex items-center justify-between py-2.5 text-base font-medium cursor-pointer hover:bg-base-200/60 rounded-lg"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">🧠</span>
                        <span>SRS Mode</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={srsMode}
                        onChange={() => setSrsMode(!srsMode)}
                        className="toggle toggle-success toggle-sm pointer-events-none"
                      />
                    </div>
                  </li>
                  <li className="pt-2 mt-1 border-t border-base-200">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        closeDropdowns()
                        onLogin()
                      }}
                      className="btn btn-primary btn-md w-full text-base font-semibold normal-case mt-1"
                    >
                      Masuk dengan Google
                    </button>
                  </li>
                </ul>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Right Slide-Over Drawer (matches reference design) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] sm:hidden">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[440px] bg-bg border-l border-line flex flex-col justify-between overflow-y-auto shadow-2xl z-[101]">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-line">
                <NavLink
                  to="/hiragana/flashcard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center no-underline"
                >
                  <img src="/logo_flashcard.svg" alt="Flashcard Logo" className="h-9 w-auto block" />
                </NavLink>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close Menu"
                  className="w-11 h-11 rounded-xl bg-pill hover:bg-pill-on border-0 text-ink flex items-center justify-center cursor-pointer transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Accordion Links */}
              <div className="px-6">
                {/* Hiragana Section */}
                <div className="border-b border-line py-3">
                  <button
                    type="button"
                    onClick={() => setOpenHira(!openHira)}
                    className={`w-full flex items-center justify-between py-2 bg-transparent border-0 text-left text-[17px] font-semibold cursor-pointer ${
                      isHiragana ? 'text-[#5eb839]' : 'text-ink'
                    }`}
                  >
                    <span>Hiragana</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${openHira ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openHira && (
                    <div className="mt-1">
                      <NavLink
                        to="/hiragana/flashcard"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-3.5 text-[15px] no-underline border-b border-line/70 ${
                            isActive ? 'text-[#5eb839] font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        Hiragana Flashcards
                      </NavLink>
                      <NavLink
                        to="/hiragana/word"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-3.5 text-[15px] no-underline ${
                            isActive ? 'text-[#5eb839] font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        Hiragana Words
                      </NavLink>
                    </div>
                  )}
                </div>

                {/* Katakana Section */}
                <div className="border-b border-line py-3">
                  <button
                    type="button"
                    onClick={() => setOpenKata(!openKata)}
                    className={`w-full flex items-center justify-between py-2 bg-transparent border-0 text-left text-[17px] font-semibold cursor-pointer ${
                      isKatakana ? 'text-[#5eb839]' : 'text-ink'
                    }`}
                  >
                    <span>Katakana</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${openKata ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openKata && (
                    <div className="mt-1">
                      <NavLink
                        to="/katakana/flashcard"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-3.5 text-[15px] no-underline border-b border-line/70 ${
                            isActive ? 'text-[#5eb839] font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        Katakana Flashcards
                      </NavLink>
                      <NavLink
                        to="/katakana/word"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-3.5 text-[15px] no-underline ${
                            isActive ? 'text-[#5eb839] font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        Katakana Words
                      </NavLink>
                    </div>
                  )}
                </div>

                {/* SRS Mode Row */}
                <div
                  onClick={() => setSrsMode(!srsMode)}
                  className="border-b border-line py-4 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[17px] font-semibold text-ink flex items-center gap-2">
                    <span>🧠</span>
                    <span>SRS Mode</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={srsMode}
                    onChange={() => setSrsMode(!srsMode)}
                    className="toggle toggle-md pointer-events-none"
                  />
                </div>

                {role === 'admin' && (
                  <div className="border-b border-line py-4">
                    <NavLink
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `block text-[17px] font-semibold no-underline ${isActive ? 'text-[#5eb839]' : 'text-accent'}`
                      }
                    >
                      Dashboard
                    </NavLink>
                  </div>
                )}

                {user && role !== 'admin' && (
                  <div className="border-b border-line py-4">
                    <NavLink
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `block text-[17px] font-semibold no-underline ${isActive ? 'text-[#5eb839]' : 'text-accent'}`
                      }
                    >
                      Progres
                    </NavLink>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer: Profile / Sign In */}
            <div className="px-6 py-5">
              {user ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-pill border border-line">
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                      <img
                        alt={user.user_metadata?.full_name ?? user.email ?? 'Profile'}
                        src={
                          user.user_metadata?.avatar_url ||
                          user.user_metadata?.picture ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email ?? 'User')}`
                        }
                      />
                    </div>
                    <span className="text-sm font-semibold text-ink truncate flex-1">
                      {user.user_metadata?.full_name ?? user.email}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void onLogout()}
                      className="flex-1 h-11 rounded-full bg-pill hover:bg-pill-on border border-line text-ink font-semibold text-sm cursor-pointer transition-colors"
                    >
                      Logout
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete()}
                      className="flex-1 h-11 rounded-full bg-pill hover:bg-pill-on border border-line text-bad font-semibold text-sm cursor-pointer transition-colors"
                    >
                      Hapus Akun
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setMobileOpen(false)
                    onLogin()
                  }}
                  className="w-full h-12 rounded-full bg-pill hover:bg-pill-on border border-line text-ink font-semibold text-[15px] flex items-center justify-center gap-2.5 cursor-pointer transition-colors"
                >
                  <svg className="w-5 h-5 text-ink" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a3 3 0 110 6 3 3 0 010-6zm0 12.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 01-6 3.22z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Sign in</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <main
        className={
          isPractice
            ? 'w-full max-w-full m-0 flex flex-col px-4 pt-4 pb-6 md:px-16 md:pt-5 md:pb-8 xl:px-[120px] xl:pt-6 xl:pb-10'
            : 'w-full max-w-full m-0 px-5 pt-4 pb-10 md:px-16 md:pt-5 md:pb-12 xl:px-[120px] xl:pt-6 xl:pb-14'
        }
      >
        <InstallPrompt />
        <Routes>
          <Route path="/" element={<Navigate to="/hiragana/flashcard" replace />} />
          <Route path="/hiragana" element={<Navigate to="/hiragana/flashcard" replace />} />
          <Route path="/hiragana/flashcard" element={<Home script="hiragana" mode="char" onHint={toast} />} />
          <Route path="/hiragana/word" element={<Home script="hiragana" mode="word" onHint={toast} />} />
          <Route path="/katakana" element={<Navigate to="/katakana/flashcard" replace />} />
          <Route path="/katakana/flashcard" element={<Home script="katakana" mode="char" onHint={toast} />} />
          <Route path="/katakana/word" element={<Home script="katakana" mode="word" onHint={toast} />} />
          <Route path="/practice/:script" element={<Practice />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/hiragana/flashcard" replace />} />
        </Routes>
      </main>

      <GoogleSignInModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onFallbackOAuth={() => void signIn()}
      />

      <dialog id="my_modal_1" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Informasi</h3>
          <p className="py-4">{msg}</p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>

      <dialog id="delete_account_modal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Hapus Akun?</h3>
          <p className="py-4">Hapus akun dan seluruh progres belajar? Tindakan ini tidak bisa dibatalkan.</p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-3">
              <button
                type="button"
                className="btn btn-error text-white w-36 h-11 min-h-11"
                onClick={() => void confirmDelete()}
              >
                Hapus Akun
              </button>
              <button className="btn w-36 h-11 min-h-11">Close</button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
