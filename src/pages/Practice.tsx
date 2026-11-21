import { useEffect, useReducer, useRef } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { Script } from '../data/kana'
import { buildDeck, shuffle, type Card } from '../lib/deck'
import { accuracy, norm } from '../lib/romaji'
import { queueSession, recordAnswer } from '../lib/sync'
import { TypeStyleSwitches, scriptTitle } from '../components/TypeStyleSwitches'
import { useSelection } from '../store/useSelection'

interface PState {
  q: Card[]
  i: number
  ok: number
  bad: number
  mist: Card[]
  wrong: boolean
  rev: boolean
  lock: boolean
  cls: '' | 'ok' | 'bad'
  value: string
}

type Act =
  | { t: 'type'; v: string }
  | { t: 'wrong' }
  | { t: 'good' }
  | { t: 'reveal' }
  | { t: 'next' }
  | { t: 'reset'; q: Card[] }

const init = (q: Card[]): PState => ({
  q, i: 0, ok: 0, bad: 0, mist: [], wrong: false, rev: false, lock: false, cls: '', value: '',
})

const markBad = (s: PState): PState =>
  s.wrong ? s : { ...s, wrong: true, bad: s.bad + 1, mist: [...s.mist, s.q[s.i]] }

function reducer(s: PState, a: Act): PState {
  switch (a.t) {
    case 'type':
      return { ...s, value: a.v, cls: '' }
    case 'wrong':
      return { ...markBad(s), cls: 'bad', value: '' }
    case 'good':
      return { ...s, lock: true, cls: 'ok', ok: s.wrong ? s.ok : s.ok + 1 }
    case 'reveal':
      return { ...markBad(s), rev: true }
    case 'next':
      return { ...s, i: s.i + 1, wrong: false, rev: false, lock: false, cls: '', value: '' }
    case 'reset':
      return init(a.q)
  }
}

function Session({ script }: { script: Script }) {
  const [s, dispatch] = useReducer(reducer, undefined, () => init(buildDeck({ ...useSelection.getState(), script })))
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const startedAt = useRef(Date.now())
  const saved = useRef(false)
  const done = s.i >= s.q.length
  const card = s.q[s.i]

  // catat sesi satu kali setiap putaran selesai (termasuk Restart / Retry)
  useEffect(() => {
    if (!done) {
      saved.current = false
      if (s.i === 0) startedAt.current = Date.now()
      return
    }
    if (saved.current || !s.q.length) return
    saved.current = true
    const { mode, comp } = useSelection.getState()
    void queueSession({
      script,
      mode,
      composite: comp,
      totalCards: s.q.length,
      correctCards: s.ok,
      durationSec: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)),
      startedAt: new Date(startedAt.current).toISOString(),
    })
  }, [done, s.i, s.q.length, s.ok, script])

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    if (!s.rev) inputRef.current?.focus()
  }, [s.i, s.rev])

  const stat = (correct: boolean) => {
    if (!s.wrong && card?.id) void recordAnswer(card.id, correct)
  }
  const check = (value: string, enter: boolean) => {
    if (done || s.rev || s.lock) return
    const v = norm(value)
    const a = norm(card.ans)
    if (!v) return
    if (v === a) {
      stat(true)
      dispatch({ t: 'good' })
      timer.current = window.setTimeout(() => dispatch({ t: 'next' }), 320)
    } else if (enter || (card.kind === 'single' && v.length >= a.length)) {
      stat(false)
      dispatch({ t: 'wrong' })
    }
  }
  const reveal = () => {
    if (done || s.lock) return
    if (s.rev) return dispatch({ t: 'next' })
    stat(false)
    dispatch({ t: 'reveal' })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        reveal()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (s.rev) dispatch({ t: 'next' })
        else check(s.value, true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  if (!s.q.length) {
    const word = useSelection.getState().mode === 'word'
    return (
      <div className="empty">
        <p>
          {word ? 'No words match the selected columns.' : 'No columns selected.'}
          <br />
          Pick columns on Home, or start with the a-column.
        </p>
        <Link className="btn" to="/" onClick={() => useSelection.getState().useDefault(script)}>
          Use the a-column
        </Link>{' '}
        <Link className="btn alt" to="/">
          Go to Home
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="sum">
        <h2>{accuracy(s.ok, s.q.length)}%</h2>
        <p className="dim">
          {s.ok} correct on first try, {s.bad} incorrect, {s.q.length} cards
        </p>
        <div className="row">
          <button className="btn" onClick={() => dispatch({ t: 'reset', q: shuffle(buildDeck({ ...useSelection.getState(), script })) })}>
            Restart
          </button>
          {s.mist.length > 0 && (
            <button className="btn alt" onClick={() => dispatch({ t: 'reset', q: shuffle(s.mist) })}>
              Retry mistakes ({s.mist.length})
            </button>
          )}
          <Link className="btn alt" to="/">
            Change selection
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="practice">
      <div className="stage">
        <div className={`big jp ${card.kind === 'single' ? '' : card.kind}`}>{card.front}</div>
        <div className="ans">{s.rev ? card.ans : ''}</div>
        <div className="note">{s.rev ? card.note : ''}</div>
      </div>
      <div className="foot">
        <div className="stats">
          <div>
            <small>Accuracy</small>
            <span>{accuracy(s.ok, s.i)}%</span>
          </div>
          <div>
            <small>Remaining</small>
            <span>{s.q.length - s.i}</span>
          </div>
          <div>
            <small>Incorrect</small>
            <span>
              {s.bad} / {s.q.length}
            </span>
          </div>
        </div>
        <input
          ref={inputRef}
          className={`inp ${s.cls}`}
          value={s.value}
          placeholder="type romaji"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={s.rev}
          aria-label="Type romaji"
          onChange={(e) => {
            dispatch({ t: 'type', v: e.target.value })
            check(e.target.value, false)
          }}
        />
        <div className="rev">
          <button className="btn alt" onClick={reveal}>
            {s.rev ? 'Next' : 'Reveal Answer'}
          </button>
          <small>“Space Bar” for {s.rev ? 'next' : 'answer'}</small>
        </div>
      </div>
    </div>
  )
}

export default function Practice() {
  const { script } = useParams()
  const mode = useSelection((s) => s.mode)
  const comp = useSelection((s) => s.comp)
  if (script !== 'hiragana' && script !== 'katakana') return <Navigate to="/" replace />
  return (
    <>
      <div className="top">
        <h1>{scriptTitle(script)}</h1>
        <TypeStyleSwitches />
      </div>
      <Session key={`${script}-${mode}-${comp}`} script={script} />
    </>
  )
}
