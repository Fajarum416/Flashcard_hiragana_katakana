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
    document.querySelectorAll('details[open]').forEach((el) => {
      el.removeAttribute('open')
    })
  }

  const isHiragana = location.pathname.startsWith('/hiragana') || location.pathname.startsWith('/practice/hiragana')
  const isKatakana = location.pathname.startsWith('/katakana') || location.pathname.startsWith('/practice/katakana')

  return (
    <>
      <header className="sticky top-0 z-50">
        <div className="navbar bg-base-100 shadow-sm px-4">
          {/* Navbar Start */}
          <div className="navbar-start">
            <div className="dropdown">
              <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
                <svg
                  aria-label="Menu"
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
                className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow"
              >
                <li>
                  <a className={isHiragana ? 'font-bold text-primary' : ''}>Hiragana</a>
                  <ul className="p-2">
                    <li><NavLink to="/hiragana/flashcard" onClick={closeDropdowns}>Hiragana Flashcards</NavLink></li>
                    <li><NavLink to="/hiragana/word" onClick={closeDropdowns}>Hiragana Words</NavLink></li>
                  </ul>
                </li>
                <li>
                  <a className={isKatakana ? 'font-bold text-primary' : ''}>Katakana</a>
                  <ul className="p-2">
                    <li><NavLink to="/katakana/flashcard" onClick={closeDropdowns}>Katakana Flashcards</NavLink></li>
                    <li><NavLink to="/katakana/word" onClick={closeDropdowns}>Katakana Words</NavLink></li>
                  </ul>
                </li>
                {role === 'admin' && (
                  <li>
                    <NavLink to="/admin" onClick={closeDropdowns} className="text-accent font-semibold">
                      Admin Dashboard
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
            <NavLink to="/hiragana/flashcard" className="btn btn-ghost text-xl font-bold gap-2 normal-case">
              <span className="badge badge-primary font-mono text-xs px-2 py-3 font-bold">A あ</span>
              <span>JLPT Cards</span>
            </NavLink>
          </div>

          {/* Navbar Center */}
          <div className="navbar-center hidden lg:flex">
            <ul className="menu menu-horizontal px-1">
              <li>
                <details>
                  <summary className={isHiragana ? 'text-primary font-bold' : ''}>Hiragana</summary>
                  <ul className="p-2 bg-base-100 w-48 z-50 shadow rounded-box">
                    <li><NavLink to="/hiragana/flashcard" onClick={closeDropdowns}>Hiragana Flashcards</NavLink></li>
                    <li><NavLink to="/hiragana/word" onClick={closeDropdowns}>Hiragana Words</NavLink></li>
                  </ul>
                </details>
              </li>
              <li>
                <details>
                  <summary className={isKatakana ? 'text-primary font-bold' : ''}>Katakana</summary>
                  <ul className="p-2 bg-base-100 w-48 z-50 shadow rounded-box">
                    <li><NavLink to="/katakana/flashcard" onClick={closeDropdowns}>Katakana Flashcards</NavLink></li>
                    <li><NavLink to="/katakana/word" onClick={closeDropdowns}>Katakana Words</NavLink></li>
                  </ul>
                </details>
              </li>
              {role === 'admin' && (
                <li>
                  <NavLink to="/admin" className="font-semibold text-accent">
                    Admin
                  </NavLink>
                </li>
              )}
            </ul>
          </div>

          {/* Navbar End: Profile / Auth */}
          <div className="navbar-end gap-2">
            {user ? (
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                  <div className="w-10 rounded-full">
                    <img
                      alt={user.user_metadata?.full_name ?? user.email ?? 'Profile'}
                      src={
                        user.user_metadata?.avatar_url ||
                        user.user_metadata?.picture ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email ?? 'User')}`
                      }
                    />
                  </div>
                </div>
                <ul
                  tabIndex={-1}
                  className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-56 p-2 shadow"
                >
                  <li className="menu-title px-4 py-2 border-b border-base-200">
                    <span className="font-semibold text-base-content truncate block">
                      {user.user_metadata?.full_name || 'Learner'}
                    </span>
                    <span className="text-xs text-base-content/60 truncate font-normal block">
                      {user.email}
                    </span>
                  </li>
                  <li>
                    <a className="justify-between" onClick={closeDropdowns}>
                      Profile
                      <span className="badge badge-sm badge-primary">Active</span>
                    </a>
                  </li>
                  {role === 'admin' && (
                    <li>
                      <NavLink to="/admin" onClick={closeDropdowns} className="justify-between text-accent font-semibold">
                        Admin Dashboard
                        <span className="badge badge-sm badge-accent">Admin</span>
                      </NavLink>
                    </li>
                  )}
                  <li>
                    <button onClick={() => void signOut()}>Logout</button>
                  </li>
                  <li>
                    <button onClick={() => void onDelete()} className="text-error">
                      Hapus Akun
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                  <div className="w-10 rounded-full bg-base-200 flex items-center justify-center text-base-content/70">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <ul
                  tabIndex={-1}
                  className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow"
                >
                  <li>
                    <button onClick={onLogin} disabled={loading} className="text-primary font-semibold">
                      Sign In with Google
                    </button>
                  </li>
                </ul>
              </div>
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
