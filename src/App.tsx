import { useEffect, useRef, useState } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { supabaseEnabled } from './lib/supabase'
import { startSync } from './lib/sync'
import { useAuth } from './store/useAuth'
import Home from './pages/Home'
import Practice from './pages/Practice'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/Overview'
import AdminUsers from './pages/admin/Users'
import AdminUserDetail from './pages/admin/UserDetail'
import { InstallPrompt } from './components/InstallPrompt'

function AppContent() {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const t = useRef<number | undefined>(undefined)
  const location = useLocation()

  const toast = (m: string) => {
    setMsg(m)
    setShow(true)
    window.clearTimeout(t.current)
    t.current = window.setTimeout(() => setShow(false), 2400)
  }

  const { user, role, loading, init, signIn, signOut, deleteAccount } = useAuth()
  useEffect(() => init(), [init])
  useEffect(() => startSync(), [])

  const onLogin = () => {
    if (!supabaseEnabled) return toast('Supabase belum dikonfigurasi (isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env)')
    void signIn()
  }

  const onDelete = async () => {
    if (!window.confirm('Hapus akun dan seluruh progres belajar? Tindakan ini tidak bisa dibatalkan.')) return
    const err = await deleteAccount()
    toast(err ? `Gagal menghapus akun: ${err}` : 'Akun dihapus')
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

  return (
    <>
      <header className="sticky top-0 z-50 bg-base-100/95 backdrop-blur border-b border-base-300 w-full">
        <div className="navbar w-full px-6 md:px-12 lg:px-20 py-3.5 md:py-4 justify-between">
          {/* Navbar Start: Brand & Mobile Menu Button */}
          <div className="navbar-start w-auto gap-2">
            <div className="dropdown lg:hidden">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-sm p-1.5" aria-label="Toggle Menu">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
                </svg>
              </div>
              <ul
                tabIndex={-1}
                className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow-lg border border-base-200"
              >
                <li>
                  <details>
                    <summary className={isHiragana ? 'text-primary font-bold' : ''}>Hiragana</summary>
                    <ul className="p-2">
                      <li><NavLink to="/hiragana/flashcard" onClick={closeDropdowns}>Hiragana Flashcards</NavLink></li>
                      <li><NavLink to="/hiragana/word" onClick={closeDropdowns}>Hiragana Words</NavLink></li>
                    </ul>
                  </details>
                </li>
                <li>
                  <details>
                    <summary className={isKatakana ? 'text-primary font-bold' : ''}>Katakana</summary>
                    <ul className="p-2">
                      <li><NavLink to="/katakana/flashcard" onClick={closeDropdowns}>Katakana Flashcards</NavLink></li>
                      <li><NavLink to="/katakana/word" onClick={closeDropdowns}>Katakana Words</NavLink></li>
                    </ul>
                  </details>
                </li>
                {role === 'admin' && (
                  <li>
                    <NavLink to="/admin" onClick={closeDropdowns} className="text-accent font-semibold">
                      Admin
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>

            <NavLink to="/hiragana/flashcard" className="flex items-center gap-3 font-bold text-xl text-base-content hover:opacity-90 normal-case px-1">
              <span className="bg-base-200 text-base-content border border-base-300 rounded-lg px-2.5 py-1 font-mono text-sm font-bold shadow-xs">
                A あ
              </span>
              <span className="tracking-tight text-lg font-bold">JLPT Cards</span>
            </NavLink>
          </div>

          {/* Navbar End: Nav Links & Profile (Right-aligned matching JLPT Cards) */}
          <div className="navbar-end w-auto gap-3">
            {/* Desktop Nav Items */}
            <div className="hidden lg:flex items-center gap-2">
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className={`btn btn-ghost normal-case text-base font-medium gap-2 px-3.5 h-10 min-h-10 ${isHiragana ? 'text-primary font-bold' : 'text-base-content/85'}`}>
                  Hiragana
                  <svg className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <ul tabIndex={-1} className="menu menu-md dropdown-content bg-base-100 rounded-box z-50 mt-2 w-52 p-2 shadow-lg border border-base-200 text-sm">
                  <li><NavLink to="/hiragana/flashcard" onClick={closeDropdowns}>Hiragana Flashcards</NavLink></li>
                  <li><NavLink to="/hiragana/word" onClick={closeDropdowns}>Hiragana Words</NavLink></li>
                </ul>
              </div>

              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className={`btn btn-ghost normal-case text-base font-medium gap-2 px-3.5 h-10 min-h-10 ${isKatakana ? 'text-primary font-bold' : 'text-base-content/85'}`}>
                  Katakana
                  <svg className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <ul tabIndex={-1} className="menu menu-md dropdown-content bg-base-100 rounded-box z-50 mt-2 w-52 p-2 shadow-lg border border-base-200 text-sm">
                  <li><NavLink to="/katakana/flashcard" onClick={closeDropdowns}>Katakana Flashcards</NavLink></li>
                  <li><NavLink to="/katakana/word" onClick={closeDropdowns}>Katakana Words</NavLink></li>
                </ul>
              </div>

              {role === 'admin' && (
                <NavLink to="/admin" onClick={closeDropdowns} className="btn btn-ghost normal-case text-base font-semibold text-accent px-3.5 h-10 min-h-10">
                  Admin
                </NavLink>
              )}
            </div>

            {/* Profile / Sign In */}
            {user ? (
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost rounded-full gap-2.5 border border-base-300 normal-case px-3.5 h-10 min-h-10">
                  <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-base-300">
                    <img
                      alt={user.user_metadata?.full_name ?? user.email ?? 'Profile'}
                      src={
                        user.user_metadata?.avatar_url ||
                        user.user_metadata?.picture ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email ?? 'User')}`
                      }
                    />
                  </div>
                  <span className="text-sm font-medium truncate max-w-[140px] hidden md:inline">
                    {user.user_metadata?.full_name ?? user.email}
                  </span>
                </div>
                <ul tabIndex={-1} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-2 w-56 p-2 shadow-lg border border-base-200">
                  <li className="menu-title px-4 py-2 text-xs border-b border-base-200 mb-1">
                    <span className="font-semibold text-base-content text-sm truncate block">
                      {user.user_metadata?.full_name || 'Learner'}
                    </span>
                    <span className="text-xs text-base-content/60 truncate font-normal block">
                      {user.email}
                    </span>
                  </li>
                  {role === 'admin' && (
                    <li>
                      <NavLink to="/admin" onClick={closeDropdowns} className="justify-between text-accent font-semibold py-2">
                        Admin Dashboard
                        <span className="badge badge-accent badge-xs">Admin</span>
                      </NavLink>
                    </li>
                  )}
                  <li><button onClick={() => void signOut()} className="py-2">Logout</button></li>
                  <li><button onClick={() => void onDelete()} className="text-error py-2">Hapus Akun</button></li>
                </ul>
              </div>
            ) : (
              <button
                className="btn btn-ghost rounded-full normal-case gap-2.5 px-5 text-sm font-semibold border border-base-300 hover:border-base-content/60 bg-base-200/50 h-10 min-h-10"
                disabled={loading}
                onClick={onLogin}
              >
                <svg className="w-4 h-4 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
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
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/hiragana/flashcard" replace />} />
        </Routes>
      </main>
      <div id="toast" role="status" className={show ? 'show' : ''}>{msg}</div>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}
