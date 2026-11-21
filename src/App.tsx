import { useEffect, useRef, useState } from 'react'
import { supabaseEnabled } from './lib/supabase'
import { useAuth } from './store/useAuth'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Practice from './pages/Practice'
import { InstallPrompt } from './components/InstallPrompt'

export default function App() {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const t = useRef<number | undefined>(undefined)
  const toast = (m: string) => {
    setMsg(m)
    setShow(true)
    window.clearTimeout(t.current)
    t.current = window.setTimeout(() => setShow(false), 2400)
  }
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'on' : '')
  const { user, loading, init, signIn, signOut, deleteAccount } = useAuth()
  useEffect(() => init(), [init])
  const onLogin = () => {
    if (!supabaseEnabled) return toast('Supabase belum dikonfigurasi (isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env)')
    void signIn()
  }
  const onDelete = async () => {
    if (!window.confirm('Hapus akun dan seluruh progres belajar? Tindakan ini tidak bisa dibatalkan.')) return
    const err = await deleteAccount()
    toast(err ? `Gagal menghapus akun: ${err}` : 'Akun dihapus')
  }
  return (
    <HashRouter>
      <header>
        <div className="bar">
          <nav>
            <NavLink to="/" end className={cls}>Home</NavLink>
            <NavLink to="/practice/hiragana" className={cls}>Flashcard Hiragana</NavLink>
            <NavLink to="/practice/katakana" className={cls}>Flashcard Katakana</NavLink>
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
          <Route path="/" element={<Home onHint={toast} />} />
          <Route path="/practice/:script" element={<Practice />} />
          <Route path="*" element={<Home onHint={toast} />} />
        </Routes>
      </main>
      <div id="toast" role="status" className={show ? 'show' : ''}>{msg}</div>
    </HashRouter>
  )
}
