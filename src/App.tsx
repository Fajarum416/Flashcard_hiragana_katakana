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
  const [openMenu, setOpenMenu] = useState<'hira' | 'kata' | null>(null)
  const t = useRef<number | undefined>(undefined)
  const location = useLocation()

  const toast = (m: string) => {
    setMsg(m)
    setShow(true)
    window.clearTimeout(t.current)
    t.current = window.setTimeout(() => setShow(false), 2400)
  }

  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'on' : '')
  const { user, role, loading, init, signIn, signOut, deleteAccount } = useAuth()
  useEffect(() => init(), [init])
  useEffect(() => startSync(), [])

  useEffect(() => {
    const closeDropdown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.nav-item')) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('click', closeDropdown)
    return () => document.removeEventListener('click', closeDropdown)
  }, [])

  const onLogin = () => {
    if (!supabaseEnabled) return toast('Supabase belum dikonfigurasi (isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env)')
    void signIn()
  }

  const onDelete = async () => {
    if (!window.confirm('Hapus akun dan seluruh progres belajar? Tindakan ini tidak bisa dibatalkan.')) return
    const err = await deleteAccount()
    toast(err ? `Gagal menghapus akun: ${err}` : 'Akun dihapus')
  }

  const isHiragana = location.pathname.startsWith('/hiragana') || location.pathname.startsWith('/practice/hiragana')
  const isKatakana = location.pathname.startsWith('/katakana') || location.pathname.startsWith('/practice/katakana')

  return (
    <>
      <header>
        <div className="bar">
          <NavLink to="/hiragana/flashcard" className="brand">
            <span className="brand-badge">A あ</span>
            <span>JLPT Cards</span>
          </NavLink>

          <nav>
            {/* Hiragana dropdown */}
            <div className="nav-item">
              <button
                type="button"
                className={`nav-btn ${isHiragana ? 'on' : ''} ${openMenu === 'hira' ? 'open' : ''}`}
                onClick={() => setOpenMenu(openMenu === 'hira' ? null : 'hira')}
              >
                Hiragana <span className="caret">▾</span>
              </button>
              <div className={`dropdown ${openMenu === 'hira' ? 'show' : ''}`}>
                <NavLink
                  to="/hiragana/flashcard"
                  onClick={() => setOpenMenu(null)}
                  className={location.pathname === '/hiragana/flashcard' ? 'on' : ''}
                >
                  Hiragana Flashcards
                </NavLink>
                <NavLink
                  to="/hiragana/word"
                  onClick={() => setOpenMenu(null)}
                  className={location.pathname === '/hiragana/word' ? 'on' : ''}
                >
                  Hiragana Words
                </NavLink>
              </div>
            </div>

            {/* Katakana dropdown */}
            <div className="nav-item">
              <button
                type="button"
                className={`nav-btn ${isKatakana ? 'on' : ''} ${openMenu === 'kata' ? 'open' : ''}`}
                onClick={() => setOpenMenu(openMenu === 'kata' ? null : 'kata')}
              >
                Katakana <span className="caret">▾</span>
              </button>
              <div className={`dropdown ${openMenu === 'kata' ? 'show' : ''}`}>
                <NavLink
                  to="/katakana/flashcard"
                  onClick={() => setOpenMenu(null)}
                  className={location.pathname === '/katakana/flashcard' ? 'on' : ''}
                >
                  Katakana Flashcards
                </NavLink>
                <NavLink
                  to="/katakana/word"
                  onClick={() => setOpenMenu(null)}
                  className={location.pathname === '/katakana/word' ? 'on' : ''}
                >
                  Katakana Words
                </NavLink>
              </div>
            </div>

            {role === 'admin' && (
              <NavLink to="/admin" className={cls} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Admin
              </NavLink>
            )}
          </nav>

          {user ? (
            <span className="login" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span title={user.email}>{user.user_metadata?.full_name ?? user.email}</span>
              <button className="link" onClick={() => void signOut()}>Sign out</button>
              <button className="link" onClick={() => void onDelete()}>Delete account</button>
            </span>
          ) : (
            <button className="login" disabled={loading} onClick={onLogin}>
              Sign in with Google
            </button>
          )}
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
