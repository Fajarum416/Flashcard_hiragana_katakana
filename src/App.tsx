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
      <header className="sticky top-0 z-50">
        <div className="navbar bg-base-100 shadow-sm px-4 justify-between">
          {/* Navbar Start: Brand & Mobile Menu Button */}
          <div className="navbar-start gap-2">
            <button
              className="btn btn-ghost sm:hidden p-2"
              popoverTarget="my-megamenu-5"
              aria-label="Toggle Menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </button>
            <NavLink to="/hiragana/flashcard" className="btn btn-ghost text-xl font-bold gap-2 normal-case">
              <span className="badge badge-primary font-mono text-xs px-2 py-3 font-bold">A あ</span>
              <span>JLPT Cards</span>
            </NavLink>
          </div>

          {/* Navbar Center: daisyUI Megamenu with Popover Dropdowns */}
          <div className="navbar-center">
            <div
              className="megamenu max-sm:megamenu-vertical p-1 border border-base-300 rounded-box"
              id="my-megamenu-5"
              popover="auto"
            >
              <span className="megamenu-active"></span>

              <button
                type="button"
                popoverTarget="k1"
                className={isHiragana ? 'text-primary font-bold' : ''}
              >
                Hiragana
              </button>
              <div id="k1" popover="auto">
                <ul className="menu bg-base-100 rounded-box shadow-lg p-2 border border-base-200 min-w-48 z-50">
                  <li>
                    <NavLink to="/hiragana/flashcard" onClick={closeDropdowns}>
                      Hiragana Flashcards
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/hiragana/word" onClick={closeDropdowns}>
                      Hiragana Words
                    </NavLink>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                popoverTarget="k2"
                className={isKatakana ? 'text-primary font-bold' : ''}
              >
                Katakana
              </button>
              <div id="k2" popover="auto">
                <ul className="menu bg-base-100 rounded-box shadow-lg p-2 border border-base-200 min-w-48 z-50">
                  <li>
                    <NavLink to="/katakana/flashcard" onClick={closeDropdowns}>
                      Katakana Flashcards
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/katakana/word" onClick={closeDropdowns}>
                      Katakana Words
                    </NavLink>
                  </li>
                </ul>
              </div>

              {role === 'admin' && (
                <NavLink to="/admin" onClick={closeDropdowns} className="font-semibold text-accent">
                  Admin
                </NavLink>
              )}
            </div>
          </div>

          {/* Navbar End: Profile */}
          <div className="navbar-end">
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full">
                  <img
                    alt="Tailwind CSS Navbar component"
                    src={
                      user?.user_metadata?.avatar_url ||
                      user?.user_metadata?.picture ||
                      "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
                    }
                  />
                </div>
              </div>
              <ul
                tabIndex={-1}
                className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow"
              >
                {user && (
                  <li className="menu-title px-4 py-1 text-xs border-b border-base-200 mb-1">
                    <span className="font-semibold text-base-content truncate block">
                      {user.user_metadata?.full_name || 'Learner'}
                    </span>
                    <span className="text-[11px] text-base-content/60 truncate font-normal block">
                      {user.email}
                    </span>
                  </li>
                )}
                <li>
                  <a className="justify-between" onClick={closeDropdowns}>
                    Profile
                    <span className="badge">{user ? 'Active' : 'New'}</span>
                  </a>
                </li>
                {role === 'admin' && (
                  <li>
                    <NavLink to="/admin" onClick={closeDropdowns} className="justify-between text-accent font-semibold">
                      Admin
                      <span className="badge badge-accent badge-xs">Admin</span>
                    </NavLink>
                  </li>
                )}
                <li><a onClick={closeDropdowns}>Settings</a></li>
                {user ? (
                  <>
                    <li><button onClick={() => void signOut()}>Logout</button></li>
                    <li><button onClick={() => void onDelete()} className="text-error">Hapus Akun</button></li>
                  </>
                ) : (
                  <li><button onClick={onLogin} disabled={loading} className="text-primary font-semibold">Sign In</button></li>
                )}
              </ul>
            </div>
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
