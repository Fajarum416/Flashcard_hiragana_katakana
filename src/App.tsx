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

          {/* Navbar End: daisyUI Megamenu Dropdown System (matching user snippet) */}
          <div className="navbar-end w-auto">
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

              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="text-base font-medium"
                  >
                    Logout ({user.user_metadata?.full_name ?? user.email?.split('@')[0]})
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete()}
                    className="text-sm text-error/80 hover:text-error"
                    title="Hapus Akun"
                  >
                    Hapus Akun
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  disabled={loading}
                  className="text-base font-semibold text-primary"
                >
                  Login
                </button>
              )}
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
