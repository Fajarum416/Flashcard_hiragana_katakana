import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { supabaseEnabled } from './lib/supabase'
import { startSync } from './lib/sync'
import { useAuth } from './store/useAuth'
import { useSelection } from './store/useSelection'
import { useVocabStore } from './store/useVocabStore'
import { useKanjiStore } from './store/useKanjiStore'
import { useContentStore } from './store/useContentStore'
import { useTheme } from './store/useTheme'
import { Logo } from './components/Logo'
import { BackgroundPattern } from './components/BackgroundPattern'
import Home from './pages/Home'
import Practice from './pages/Practice'
import Profile from './pages/Profile'
import UserDashboard from './pages/UserDashboard'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/Overview'
import AdminUsers from './pages/admin/Users'
import AdminUserDetail from './pages/admin/UserDetail'
import AdminVocab from './pages/admin/AdminVocab'
import AdminKanji from './pages/admin/AdminKanji'
import VocabHome from './pages/vocab/VocabHome'
import VocabPractice from './pages/vocab/VocabPractice'
import KanjiHome from './pages/kanji/KanjiHome'
import KanjiPractice from './pages/kanji/KanjiPractice'
import { InstallPrompt } from './components/InstallPrompt'
import { GoogleSignInModal, googleClientId } from './components/GoogleSignInModal'
import { ToastContainer } from './components/ToastContainer'
import { showToast } from './store/useToast'

function AppContent() {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openHira, setOpenHira] = useState(false)
  const [openKata, setOpenKata] = useState(false)
  const [openVocab, setOpenVocab] = useState(false)
  const [openKanji, setOpenKanji] = useState(false)
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
    showToast(m, 'info')
  }

  const { user, role, loading, init, signIn, signOut, deleteAccount } = useAuth()
  const { srsMode, setSrsMode, resetOnLogout } = useSelection()
  const { theme, toggleTheme } = useTheme()
  useEffect(() => init(), [init])
  useEffect(() => startSync(), [])
  useEffect(() => {
    void useContentStore.getState().init()
  }, [])

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
    useVocabStore.getState().resetOnLogout()
    useKanjiStore.getState().resetOnLogout()
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
      useVocabStore.getState().resetOnLogout()
      useKanjiStore.getState().resetOnLogout()
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
  const isVocab = location.pathname.startsWith('/vocab')
  const isKanji = location.pathname.startsWith('/kanji')

  return (
    <>
      <BackgroundPattern />
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 ${
          scrolled ? 'bg-panel/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="navbar bg-transparent w-full px-4 sm:px-6 md:px-12 lg:px-20 xl:px-[120px] py-3 sm:py-3.5 md:py-4 justify-between">
          {/* Navbar Start: Brand Logo */}
          <div className="navbar-start w-auto">
            <NavLink to="/hiragana/flashcard" className="flex items-center hover:opacity-90 px-1 no-underline">
              <Logo className="h-9 sm:h-11 w-auto block" />
            </NavLink>
          </div>

          {/* Navbar End: Desktop Megamenu + Profile (sm:flex) & Mobile Hamburger Button (sm:hidden) */}
          <div className="navbar-end w-auto gap-2 sm:gap-3">
            {/* Mobile Theme Toggle Button using swap swap-rotate */}
            <label className="sm:hidden swap swap-rotate cursor-pointer p-1 text-ink">
              {/* this hidden checkbox controls the state */}
              <input
                type="checkbox"
                checked={theme === 'dark'}
                onChange={toggleTheme}
              />

              {/* sun icon */}
              <svg
                className="swap-off h-5 w-5 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
              </svg>

              {/* moon icon */}
              <svg
                className="swap-on h-5 w-5 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
              </svg>
            </label>

            {/* Mobile Hamburger Button on Right using swap swap-rotate */}
            <label
              className="sm:hidden btn btn-ghost btn-circle swap swap-rotate border border-line bg-pill hover:bg-pill-on text-ink w-11 h-11 min-h-11 cursor-pointer"
              aria-label="Toggle Menu"
            >
              <input
                type="checkbox"
                checked={mobileOpen}
                onChange={() => setMobileOpen(!mobileOpen)}
              />
              {/* hamburger icon */}
              <svg
                className="swap-off fill-current w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
              >
                <path d="M64,384H448V341.33H64Zm0-106.67H448V234.67H64ZM64,128v42.67H448V128Z" />
              </svg>
              {/* close icon */}
              <svg
                className="swap-on fill-current w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
              >
                <polygon points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49" />
              </svg>
            </label>

            <div
              className="hidden sm:flex megamenu megamenu-lg p-1.5 bg-transparent border border-line rounded-box text-base font-medium"
              id="my-megamenu-5"
            >
              <span className="megamenu-active"></span>

              <button
                type="button"
                popoverTarget="k1"
                className={`text-base font-semibold ${isHiragana ? 'text-accent font-bold' : ''}`}
              >
                Hiragana
              </button>
              <div id="k1" popover="auto">
                <ul className="menu menu-md bg-base-100 rounded-box shadow-xl p-2.5 border border-base-200 min-w-60 text-base">
                  <li>
                    <NavLink
                      to="/hiragana/flashcard"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive ? '!text-accent font-bold' : ''}`}
                    >
                      Flashcard Hiragana
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/hiragana/word"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive ? '!text-accent font-bold' : ''}`}
                    >
                      Kata Hiragana
                    </NavLink>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                popoverTarget="k2"
                className={`text-base font-semibold ${isKatakana ? 'text-accent font-bold' : ''}`}
              >
                Katakana
              </button>
              <div id="k2" popover="auto">
                <ul className="menu menu-md bg-base-100 rounded-box shadow-xl p-2.5 border border-base-200 min-w-60 text-base">
                  <li>
                    <NavLink
                      to="/katakana/flashcard"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive ? '!text-accent font-bold' : ''}`}
                    >
                      Flashcard Katakana
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/katakana/word"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive ? '!text-accent font-bold' : ''}`}
                    >
                      Kata Katakana
                    </NavLink>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                popoverTarget="k3"
                className={`text-base font-semibold ${isVocab ? 'text-accent font-bold' : ''}`}
              >
                Kosakata
              </button>
              <div id="k3" popover="auto">
                <ul className="menu menu-md bg-base-100 rounded-box shadow-xl p-2.5 border border-base-200 min-w-44 text-base">
                  <li>
                    <NavLink
                      to="/vocab?level=n5"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive && location.search !== '?level=n4' ? '!text-accent font-bold' : ''}`}
                    >
                      N5
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/vocab?level=n4"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive && location.search === '?level=n4' ? '!text-accent font-bold' : ''}`}
                    >
                      N4
                    </NavLink>
                  </li>
                </ul>
              </div>

              {/* Kanji Megamenu */}
              <button
                type="button"
                popoverTarget="k4"
                className={`text-base font-semibold ${isKanji ? 'text-accent font-bold' : ''}`}
              >
                Kanji
              </button>
              <div id="k4" popover="auto">
                <ul className="menu menu-md bg-base-100 rounded-box shadow-xl p-2.5 border border-base-200 min-w-44 text-base">
                  <li>
                    <NavLink
                      to="/kanji?level=n5"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive && location.search !== '?level=n4' && location.search !== '?level=jft' ? '!text-accent font-bold' : ''}`}
                    >
                      JLPT N5
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/kanji?level=n4"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive && location.search === '?level=n4' ? '!text-accent font-bold' : ''}`}
                    >
                      JLPT N4
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/kanji?level=jft"
                      onClick={closeDropdowns}
                      className={({ isActive }) => `py-2.5 text-base font-medium ${isActive && location.search === '?level=jft' ? '!text-accent font-bold' : ''}`}
                    >
                      JFT
                    </NavLink>
                  </li>
                </ul>
              </div>
            </div>

            {/* Standalone Admin / Progress Button beside profile */}
            {role === 'admin' && (
              <NavLink
                to="/admin"
                onClick={closeDropdowns}
                title="Admin"
                aria-label="Admin"
                className={({ isActive }) =>
                  `hidden sm:inline-flex items-center justify-center p-1.5 transition-colors no-underline cursor-pointer ${
                    isActive
                      ? 'text-accent'
                      : 'text-amber-500 hover:text-amber-600 dark:text-amber-400'
                  }`
                }
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </NavLink>
            )}

            {user && role !== 'admin' && (
              <NavLink
                to="/dashboard"
                onClick={closeDropdowns}
                title="Progres"
                aria-label="Progres"
                className={({ isActive }) =>
                  `hidden sm:inline-flex items-center justify-center p-1.5 transition-colors no-underline cursor-pointer ${
                    isActive
                      ? 'text-accent'
                      : 'text-ink/80 hover:text-ink'
                  }`
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                  />
                </svg>
              </NavLink>
            )}

            {/* Desktop Theme Toggle using swap swap-rotate */}
            <label className="hidden sm:inline-grid swap swap-rotate cursor-pointer p-1 text-ink hover:text-accent transition-colors">
              {/* this hidden checkbox controls the state */}
              <input
                type="checkbox"
                checked={theme === 'dark'}
                onChange={toggleTheme}
              />

              {/* sun icon */}
              <svg
                className="swap-off h-6 w-6 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
              </svg>

              {/* moon icon */}
              <svg
                className="swap-on h-6 w-6 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
              </svg>
            </label>

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
                      {user.user_metadata?.full_name || 'Pelajar'}
                    </span>
                    <span className="text-xs text-base-content/60 truncate font-normal block">
                      {user.email}
                    </span>
                  </li>
                  <li>
                    <NavLink
                      to="/profile"
                      onClick={closeDropdowns}
                      className="justify-between py-2.5 text-base font-medium"
                    >
                      Profil
                      <span className="badge badge-md bg-accent border-accent text-white font-semibold">Aktif</span>
                    </NavLink>
                  </li>
                  <li>
                    <div
                      onClick={() => setSrsMode(!srsMode)}
                      className="flex items-center justify-between py-2.5 text-base font-medium cursor-pointer hover:bg-base-200/60 rounded-lg"
                    >
                      <span>Mode SRS</span>
                      <input
                        type="checkbox"
                        checked={srsMode}
                        onChange={() => setSrsMode(!srsMode)}
                        className="toggle toggle-success toggle-sm pointer-events-none"
                      />
                    </div>
                  </li>
                  {role === 'admin' && (
                    <li>
                      <NavLink to="/admin" onClick={closeDropdowns} className="justify-between text-amber-400 font-semibold py-2.5 text-base">
                        Dasbor
                        <span className="badge badge-warning badge-xs">Admin</span>
                      </NavLink>
                    </li>
                  )}
                  <li>
                    <button onClick={() => void onLogout()} className="py-2.5 text-base font-medium text-error flex items-center gap-2.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 shrink-0">
                        <path fillRule="evenodd" d="M16.5 3.75a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5V15a.75.75 0 0 0-1.5 0v3.75a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V5.25a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3V9A.75.75 0 1 0 9 9V5.25a1.5 1.5 0 0 1 1.5-1.5h6ZM5.78 8.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 0 0 0 1.06l3 3a.75.75 0 0 0 1.06-1.06l-1.72-1.72H15a.75.75 0 0 0 0-1.5H4.06l1.72-1.72a.75.75 0 0 0 0-1.06Z" clipRule="evenodd" />
                      </svg>
                      <span>Keluar</span>
                    </button>
                  </li>
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
                  <span>Masuk</span>
                </div>
                <ul tabIndex={-1} className="menu menu-md dropdown-content bg-base-100 rounded-box z-50 mt-2 w-72 p-3 shadow-xl border border-base-200 text-base">
                  <li className="menu-title px-4 py-2 border-b border-base-200 mb-1">
                    <span className="font-semibold text-base-content text-base block">
                      Tamu
                    </span>
                    <span className="text-xs text-base-content/60 font-normal block">
                      Masuk untuk sinkronisasi cloud
                    </span>
                  </li>
                  <li className="pt-2 mt-1">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        closeDropdowns()
                        onLogin()
                      }}
                      className="btn btn-md w-full rounded-full bg-pill hover:bg-pill-on border border-white/15 hover:border-white/30 text-ink text-base font-semibold normal-case mt-1 shadow-none"
                    >
                      Masuk
                    </button>
                  </li>
                </ul>
              </div>
            )}
            </div>
          </div>
        </div>
        <div
          className={`w-full transition-all duration-300 ${
            scrolled ? 'px-0' : 'px-4 sm:px-6 md:px-12 lg:px-20 xl:px-[120px]'
          }`}
        >
          <div className="h-0.5 w-full bg-ink/20" />
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
                  <Logo className="h-9 w-auto block" />
                </NavLink>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Tutup Menu"
                  className="w-11 h-11 rounded-xl bg-pill hover:bg-pill-on border border-line text-ink flex items-center justify-center cursor-pointer transition-colors"
                >
                  <svg
                    className="fill-current w-5 h-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                  >
                    <polygon points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49" />
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
                      isHiragana ? 'text-accent' : 'text-ink'
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
                            isActive ? 'text-accent font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        Flashcard Hiragana
                      </NavLink>
                      <NavLink
                        to="/hiragana/word"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-3.5 text-[15px] no-underline ${
                            isActive ? 'text-accent font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        Kata Hiragana
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
                      isKatakana ? 'text-accent' : 'text-ink'
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
                            isActive ? 'text-accent font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        Flashcard Katakana
                      </NavLink>
                      <NavLink
                        to="/katakana/word"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-3.5 text-[15px] no-underline ${
                            isActive ? 'text-accent font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        Kata Katakana
                      </NavLink>
                    </div>
                  )}
                </div>

                {/* Kosakata Section */}
                <div className="border-b border-line py-3">
                  <button
                    type="button"
                    onClick={() => setOpenVocab(!openVocab)}
                    className={`w-full flex items-center justify-between py-2 bg-transparent border-0 text-left text-[17px] font-semibold cursor-pointer ${
                      isVocab ? 'text-accent' : 'text-ink'
                    }`}
                  >
                    <span>Kosakata</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${openVocab ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openVocab && (
                    <div className="mt-1">
                      <NavLink
                        to="/vocab?level=n5"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-3.5 text-[15px] no-underline border-b border-line/70 ${
                            isActive && location.search !== '?level=n4' ? 'text-accent font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        N5
                      </NavLink>
                      <NavLink
                        to="/vocab?level=n4"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-3.5 text-[15px] no-underline ${
                            isActive && location.search === '?level=n4' ? 'text-accent font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        N4
                      </NavLink>
                    </div>
                  )}
                </div>

                {/* Kanji Section */}
                <div className="border-b border-line py-3">
                  <button
                    type="button"
                    onClick={() => setOpenKanji(!openKanji)}
                    className={`w-full flex items-center justify-between py-2 bg-transparent border-0 text-left text-[17px] font-semibold cursor-pointer ${
                      isKanji ? 'text-accent' : 'text-ink'
                    }`}
                  >
                    <span>Kanji</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${openKanji ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openKanji && (
                    <div className="mt-1">
                      <NavLink
                        to="/kanji?level=n5"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-3.5 text-[15px] no-underline border-b border-line/70 ${
                            isActive && location.search !== '?level=n4' && location.search !== '?level=jft' ? 'text-accent font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        JLPT N5
                      </NavLink>
                      <NavLink
                        to="/kanji?level=n4"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-3.5 text-[15px] no-underline border-b border-line/70 ${
                            isActive && location.search === '?level=n4' ? 'text-accent font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        JLPT N4
                      </NavLink>
                      <NavLink
                        to="/kanji?level=jft"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block py-3.5 text-[15px] no-underline ${
                            isActive && location.search === '?level=jft' ? 'text-accent font-semibold' : 'text-muted hover:text-ink'
                          }`
                        }
                      >
                        JFT
                      </NavLink>
                    </div>
                  )}
                </div>

                {/* SRS Mode Row (only when logged in) */}
                {user && (
                  <div
                    onClick={() => setSrsMode(!srsMode)}
                    className="border-b border-line py-4 flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-[17px] font-semibold text-ink">Mode SRS</span>
                    <input
                      type="checkbox"
                      checked={srsMode}
                      onChange={() => setSrsMode(!srsMode)}
                      className="toggle toggle-md pointer-events-none"
                    />
                  </div>
                )}

                {role === 'admin' && (
                  <div className="border-b border-line py-4">
                    <NavLink
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 text-[17px] font-semibold no-underline ${isActive ? 'text-accent' : 'text-amber-400'}`
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-5 h-5 shrink-0"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                        />
                      </svg>
                      <span>Dasbor</span>
                    </NavLink>
                  </div>
                )}

                {user && role !== 'admin' && (
                  <div className="border-b border-line py-4">
                    <NavLink
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 text-[17px] font-semibold no-underline ${isActive ? 'text-accent' : 'text-sky-400'}`
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-5 h-5 shrink-0"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                        />
                      </svg>
                      <span>Progres</span>
                    </NavLink>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer: Profile / Sign In */}
            <div className="px-6 py-5">
              {user ? (
                <div className="flex flex-col gap-3">
                  <NavLink
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-pill hover:bg-pill-on border border-line no-underline transition-colors"
                  >
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
                  </NavLink>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void onLogout()}
                      className="flex-1 h-11 rounded-full bg-pill hover:bg-pill-on border border-line text-error font-semibold text-sm cursor-pointer transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 shrink-0">
                        <path fillRule="evenodd" d="M16.5 3.75a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5V15a.75.75 0 0 0-1.5 0v3.75a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V5.25a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3V9A.75.75 0 1 0 9 9V5.25a1.5 1.5 0 0 1 1.5-1.5h6ZM5.78 8.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 0 0 0 1.06l3 3a.75.75 0 0 0 1.06-1.06l-1.72-1.72H15a.75.75 0 0 0 0-1.5H4.06l1.72-1.72a.75.75 0 0 0 0-1.06Z" clipRule="evenodd" />
                      </svg>
                      <span>Keluar</span>
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
                  <span>Masuk</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <main
        className={
          isPractice
            ? 'relative z-10 w-full max-w-full m-0 flex flex-col px-4 pt-4 pb-6 md:px-16 md:pt-5 md:pb-8 xl:px-[120px] xl:pt-6 xl:pb-10'
            : 'relative z-10 w-full max-w-full m-0 px-5 pt-4 pb-10 md:px-16 md:pt-5 md:pb-12 xl:px-[120px] xl:pt-6 xl:pb-14'
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
          <Route path="/vocab" element={<VocabHome />} />
          <Route path="/vocab/:level/:chapter" element={<VocabPractice />} />
          <Route path="/kanji" element={<KanjiHome />} />
          <Route path="/kanji/:level/:chapter" element={<KanjiPractice />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/profile" element={<Profile onDeleteAccount={onDelete} />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="vocab" element={<AdminVocab />} />
            <Route path="kanji" element={<AdminKanji />} />
          </Route>
          <Route path="*" element={<Navigate to="/hiragana/flashcard" replace />} />
        </Routes>
      </main>

      <ToastContainer />

      <GoogleSignInModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onFallbackOAuth={() => void signIn()}
      />

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
              <button className="btn w-36 h-11 min-h-11">Tutup</button>
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
