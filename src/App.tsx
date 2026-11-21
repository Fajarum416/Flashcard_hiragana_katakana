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
        <div className="navbar w-full px-6 md:px-12 lg:px-20 xl:px-[120px] py-3.5 md:py-4 justify-between">
          {/* Navbar Start: Brand & Mobile Menu Button */}
          <div className="navbar-start w-auto gap-3">
            <button
              type="button"
              className="btn btn-ghost sm:hidden text-base font-semibold px-3"
              popoverTarget="my-megamenu-5"
              aria-label="Toggle Menu"
            >
              Menu
            </button>

            <NavLink to="/hiragana/flashcard" className="flex items-center gap-3 font-bold text-xl text-base-content hover:opacity-90 normal-case px-1">
              <span className="bg-base-200 text-base-content border border-base-300 rounded-lg px-2.5 py-1 font-mono text-sm font-bold shadow-xs">
                A あ
              </span>
              <span className="tracking-tight text-xl font-bold">JLPT Cards</span>
            </NavLink>
          </div>

          {/* Navbar End: daisyUI Megamenu + Dedicated Profile Component */}
          <div className="navbar-end w-auto gap-3">
            <div
              className="megamenu megamenu-lg max-sm:megamenu-vertical p-1.5 border border-base-300 rounded-box text-base font-medium"
              id="my-megamenu-5"
              popover="auto"
            >
              <span className="megamenu-active"></span>

              <button
                type="button"
                popoverTarget="k1"
                className={`text-base font-semibold ${isHiragana ? 'text-primary font-bold' : ''}`}
              >
                Hiragana
              </button>
              <div id="k1" popover="auto">
                <ul className="menu menu-md bg-base-100 rounded-box shadow-xl p-2.5 border border-base-200 min-w-60 text-base">
                  <li>
                    <NavLink to="/hiragana/flashcard" onClick={closeDropdowns} className="py-2.5 text-base font-medium">
                      Hiragana Flashcards
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/hiragana/word" onClick={closeDropdowns} className="py-2.5 text-base font-medium">
                      Hiragana Words
                    </NavLink>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                popoverTarget="k2"
                className={`text-base font-semibold ${isKatakana ? 'text-primary font-bold' : ''}`}
              >
                Katakana
              </button>
              <div id="k2" popover="auto">
                <ul className="menu menu-md bg-base-100 rounded-box shadow-xl p-2.5 border border-base-200 min-w-60 text-base">
                  <li>
                    <NavLink to="/katakana/flashcard" onClick={closeDropdowns} className="py-2.5 text-base font-medium">
                      Katakana Flashcards
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/katakana/word" onClick={closeDropdowns} className="py-2.5 text-base font-medium">
                      Katakana Words
                    </NavLink>
                  </li>
                </ul>
              </div>

              {role === 'admin' && (
                <NavLink
                  to="/admin"
                  onClick={closeDropdowns}
                  className="text-base font-semibold text-accent"
                >
                  Admin
                </NavLink>
              )}
            </div>

            {/* Profile / Sign In Component */}
            {user ? (
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost rounded-full gap-2.5 border border-base-300 normal-case px-3.5 h-11 min-h-11">
                  <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-base-300">
                    <img
                      alt={user.user_metadata?.full_name ?? user.email ?? 'Profile'}
                      src={
                        user.user_metadata?.avatar_url ||
                        user.user_metadata?.picture ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email ?? 'User')}`
                      }
                    />
                  </div>
                  <span className="text-sm font-semibold truncate max-w-[140px] hidden md:inline">
                    {user.user_metadata?.full_name ?? user.email}
                  </span>
                </div>
                <ul tabIndex={-1} className="menu menu-md dropdown-content bg-base-100 rounded-box z-50 mt-2 w-60 p-2.5 shadow-xl border border-base-200">
                  <li className="menu-title px-4 py-2 text-xs border-b border-base-200 mb-1">
                    <span className="font-semibold text-base-content text-sm truncate block">
                      {user.user_metadata?.full_name || 'Learner'}
                    </span>
                    <span className="text-xs text-base-content/60 truncate font-normal block">
                      {user.email}
                    </span>
                  </li>
                  <li>
                    <a className="justify-between py-2 text-sm font-medium" onClick={closeDropdowns}>
                      Profile
                      <span className="badge badge-sm badge-primary">Active</span>
                    </a>
                  </li>
                  {role === 'admin' && (
                    <li>
                      <NavLink to="/admin" onClick={closeDropdowns} className="justify-between text-accent font-semibold py-2 text-sm">
                        Admin Dashboard
                        <span className="badge badge-accent badge-xs">Admin</span>
                      </NavLink>
                    </li>
                  )}
                  <li><button onClick={() => void signOut()} className="py-2 text-sm font-medium">Logout</button></li>
                  <li><button onClick={() => void onDelete()} className="text-error py-2 text-sm font-medium">Hapus Akun</button></li>
                </ul>
              </div>
            ) : (
              <button
                className="btn btn-ghost rounded-full normal-case gap-2.5 px-5 text-sm font-semibold border border-base-300 hover:border-base-content/60 bg-base-200/50 h-11 min-h-11"
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
