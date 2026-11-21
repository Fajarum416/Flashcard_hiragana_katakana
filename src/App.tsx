import { useRef, useState } from 'react'
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
  return (
    <HashRouter>
      <header>
        <div className="bar">
          <nav>
            <NavLink to="/" end className={cls}>Home</NavLink>
            <NavLink to="/practice/hiragana" className={cls}>Flashcard Hiragana</NavLink>
            <NavLink to="/practice/katakana" className={cls}>Flashcard Katakana</NavLink>
          </nav>
          <button className="login" onClick={() => toast('Google sign-in will be connected in the next step (Supabase)')}>
            Sign in with Google
          </button>
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
