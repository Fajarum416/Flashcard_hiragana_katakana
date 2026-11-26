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
      return { ...markBad(s), rev: !s.rev }
    case 'next':
      return { ...s, i: s.i + 1, wrong: false, rev: false, lock: false, cls: '', value: '' }
    case 'reset':
      return init(a.q)
  }
}

function makeDeck(script: Script) {
  const st = useSelection.getState()
  return buildDeck({ ...st, script }, { stats: st.stats, srsMode: st.srsMode })
}

function Session({ script }: { script: Script }) {
  const [s, dispatch] = useReducer(reducer, undefined, () => init(makeDeck(script)))
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

  const stat = (correct: boolean) => {
    if (!s.wrong && card?.id) void recordAnswer(card.id, correct)
  }
  const check = (value: string, enter: boolean) => {
    if (done || s.lock) return
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
    stat(false)
    dispatch({ t: 'reveal' })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || s.lock) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (document.querySelector('dialog[open]')) return

      const target = e.target as HTMLElement | null
      const inInput = target === inputRef.current
      const inOtherField =
        !inInput &&
        (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable)
      if (inOtherField) return

      if (e.key === ' ') {
        e.preventDefault()
        reveal()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        check(s.value, true)
      } else if (!inInput && e.key === 'Backspace') {
        e.preventDefault()
        dispatch({ t: 'type', v: s.value.slice(0, -1) })
      } else if (!inInput && /^[a-zA-Z'-]$/.test(e.key)) {
        e.preventDefault()
        const next = s.value + e.key
        dispatch({ t: 'type', v: next })
        check(next, false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const backUrl = `/${script}/${useSelection.getState().mode === 'char' ? 'flashcard' : 'word'}`

  if (!s.q.length) {
    const word = useSelection.getState().mode === 'word'
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-20 md:py-48 lg:py-64 text-center text-muted">
        <p className="mb-5 text-base">
          {word ? 'Tidak ada kata yang cocok dengan kolom yang dipilih.' : 'Belum ada kolom yang dipilih.'}
          <br />
          Pilih kolom di Beranda, atau mulai dengan kolom a.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link
            className="border-0 rounded-full bg-accent hover:opacity-90 text-white font-semibold text-sm px-[26px] py-3 no-underline cursor-pointer inline-block transition-all"
            to={backUrl}
            onClick={() => useSelection.getState().useDefault(script)}
          >
            Gunakan kolom a
          </Link>
          <Link
            className="border-0 rounded-full bg-pill hover:bg-pill-on text-ink font-semibold text-sm px-[26px] py-3 no-underline cursor-pointer inline-block transition-all"
            to={backUrl}
          >
            Kembali ke Daftar
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-20 md:py-48 lg:py-64 text-center">
        <h2 className="text-[64px] md:text-[80px] leading-none m-0 font-light">{accuracy(s.ok, s.q.length)}%</h2>
        <p className="text-muted text-sm md:text-base mt-3 mb-6">
          {s.ok} benar pada percobaan pertama, {s.bad} salah, {s.q.length} kartu
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            type="button"
            className="border-0 rounded-full bg-accent hover:opacity-90 text-white font-semibold text-sm md:text-[15px] px-7 py-3 cursor-pointer inline-block transition-all"
            onClick={() => dispatch({ t: 'reset', q: makeDeck(script) })}
          >
            Mulai Ulang
          </button>
          {s.mist.length > 0 && (
            <button
              type="button"
              className="border-0 rounded-full bg-pill hover:bg-pill-on text-ink font-semibold text-sm md:text-[15px] px-7 py-3 cursor-pointer inline-block transition-all"
              onClick={() => dispatch({ t: 'reset', q: shuffle(s.mist) })}
            >
              Ulangi yang salah ({s.mist.length})
            </button>
          )}
          <Link
            className="border-0 rounded-full bg-pill hover:bg-pill-on text-ink font-semibold text-sm md:text-[15px] px-7 py-3 no-underline cursor-pointer inline-block transition-all"
            to={backUrl}
          >
            Kembali ke Daftar
          </Link>
        </div>
      </div>
    )
  }

  const kanaSizeClass =
    card.kind === 'comp'
      ? 'font-light text-[clamp(110px,16vh,180px)] leading-none'
      : card.kind === 'word'
        ? 'font-medium text-[clamp(74px,11vh,125px)] leading-none'
        : 'font-light text-[clamp(130px,18vh,210px)] leading-none'

  const inpBorderClass =
    s.cls === 'ok'
      ? 'border-ok shadow-[0_0_0_2px_var(--ok)]'
      : s.cls === 'bad'
        ? 'border-bad shadow-[0_0_0_2px_var(--bad)] animate-[sh_0.3s]'
        : 'border-line'

  return (
    <div className="flex flex-col justify-between p-0 w-full">
      <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 py-10 sm:py-16 md:py-40 lg:py-52 text-center">
        <div className="[perspective:1000px] w-full flex justify-center">
          <div
            key={s.i}
            className={`grid [grid-template-areas:'stack'] place-items-center transition-transform duration-500 [transform-style:preserve-3d] ${
              s.rev ? '[transform:rotateY(180deg)]' : ''
            }`}
          >
            <div className="[grid-area:stack] [backface-visibility:hidden] flex flex-col items-center justify-center">
              <div className={`jp ${kanaSizeClass}`}>{card.front}</div>
            </div>
            <div className="[grid-area:stack] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center">
              <div
                className={
                  card.kind === 'word'
                    ? 'font-medium text-[clamp(56px,9vh,105px)] text-accent leading-tight'
                    : 'font-light text-[clamp(110px,16vh,190px)] text-accent leading-none'
                }
              >
                {card.ans}
              </div>
              {card.note && <div className="text-muted text-base md:text-lg mt-2">{card.note}</div>}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 min-[481px]:grid-cols-[1fr_auto] gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-6 border-t border-line pt-5 md:pt-6 shrink-0 w-full">
        <div className="flex items-center border border-line rounded-full bg-pill/40 h-[62px] md:h-[68px] px-2 w-full justify-between min-[481px]:col-span-2 md:col-span-1 md:w-auto md:justify-self-start">
          <div className="flex-1 min-w-0 px-2 py-0.5 text-center md:flex-none md:w-[120px] lg:w-[140px] shrink-0">
            <small className="block text-muted text-[11px] font-normal mb-0.5">
              Akurasi
            </small>
            <span className="text-[20px] md:text-[22px] lg:text-[24px] font-normal leading-tight text-ink whitespace-nowrap tabular-nums">{accuracy(s.ok, s.i)}%</span>
          </div>
          <div className="flex-1 min-w-0 px-2 py-0.5 text-center border-l border-line md:flex-none md:w-[120px] lg:w-[140px] shrink-0">
            <small className="block text-muted text-[11px] font-normal mb-0.5">
              Tersisa
            </small>
            <span className="text-[20px] md:text-[22px] lg:text-[24px] font-normal leading-tight text-ink whitespace-nowrap tabular-nums">{s.q.length - s.i}</span>
          </div>
          <div className="flex-1 min-w-0 px-2 py-0.5 text-center border-l border-line md:flex-none md:w-[120px] lg:w-[140px] shrink-0">
            <small className="block text-muted text-[11px] font-normal mb-0.5">
              Salah
            </small>
            <span className="text-[20px] md:text-[22px] lg:text-[24px] font-normal leading-tight text-ink whitespace-nowrap tabular-nums">
              {s.bad} / {s.q.length}
            </span>
          </div>
        </div>
        <input
          ref={inputRef}
          className={`w-full min-w-0 h-[62px] text-[19px] px-4 md:w-[300px] lg:w-[400px] xl:w-[460px] md:h-[68px] md:text-[21px] md:px-6 md:justify-self-center rounded-full border bg-pill/40 text-ink font-light text-center placeholder:text-muted focus:outline-none focus-visible:outline-none focus:border-white/30 ${inpBorderClass}`}
          value={s.value}
          placeholder="ketik romaji"
          inputMode="text"
          enterKeyHint="go"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Ketik romaji"
          onChange={(e) => {
            if (s.lock) return
            dispatch({ t: 'type', v: e.target.value })
            check(e.target.value, false)
          }}
        />
        <div className="flex flex-col items-center justify-center text-center md:justify-self-end">
          <button
            type="button"
            className="w-full min-[481px]:w-auto h-[46px] px-7 md:px-8 text-[15px] whitespace-nowrap border-0 rounded-full bg-pill hover:bg-pill-on text-ink font-medium cursor-pointer inline-flex items-center justify-center transition-all"
            onClick={reveal}
          >
            Lihat Jawaban
          </button>
          <small className="hidden md:block text-muted text-[11px] mt-1.5">
            Tekan “Spasi” untuk melihat jawaban
          </small>
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
      <div className="flex flex-wrap items-center gap-5 pt-4 pb-5 mb-2 shrink-0">
        <h1 className="m-0 mr-1 text-[26px] font-bold">{scriptTitle(script)}</h1>
        <TypeStyleSwitches mode={mode} />
      </div>
      <Session key={`${script}-${mode}-${comp}`} script={script} />
    </>
  )
}
