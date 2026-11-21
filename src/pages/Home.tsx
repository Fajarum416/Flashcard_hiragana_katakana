import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { COL_IDS, TABLE, YOON_IDS, YOON_TABLE, type Script } from '../data/kana'
import { COMP_WORDS, WORDS } from '../data/words'
import { buildDeck, compositeWordOk, selectedChars, wordOk, type Mode } from '../lib/deck'
import { isDue } from '../lib/srs'
import { TypeStyleSwitches, scriptTitle } from '../components/TypeStyleSwitches'
import { useSelection } from '../store/useSelection'

interface Props {
  script: Script
  mode: Mode
  onHint: (msg: string) => void
}

export default function Home({ script, mode, onHint }: Props) {
  const navigate = useNavigate()
  const st = useSelection()
  const sc = script
  useEffect(() => {
    st.setScript(script)
    st.setMode(mode)
  }, [script, mode])

  const yoon = mode === 'char' && st.comp
  const chars = selectedChars(st, script)
  const dueCount = chars.filter((c) => isDue(st.stats[`${sc}:${c.k}`])).length
  const deck = buildDeck({ ...st, script, mode }, { stats: st.stats, srsMode: st.srsMode })

  let body
  if (yoon) {
    body = (
      <div className="overflow-x-auto pb-4 w-full">
        <div className="grid grid-cols-[repeat(11,minmax(96px,1fr))] gap-x-3.5 gap-y-0 w-full min-w-[1100px]">
          {YOON_IDS.map((id) => {
            const on = st.selY[sc].includes(id)
            return (
              <div key={id} className="flex flex-col items-center">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => st.toggleYoon(sc, id)}
                  className="toggle toggle-xl mb-[38px] cursor-pointer"
                  aria-label={`Select column ${id}`}
                />
                {YOON_TABLE[sc][id].map((c) => (
                  <div key={c.k} className="w-full max-w-[104px] text-center mb-[46px]">
                    <b
                      className={`block jp font-light text-[36px]/[1.2] border-b border-line pb-2 ${
                        on ? 'text-accent' : 'text-[#f0f3f8]'
                      }`}
                    >
                      {c.k}
                    </b>
                    <i className="block not-italic text-[#78859e] text-[15px] pt-2">{c.r}</i>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  } else if (st.mode === 'char') {
    body = (
      <div className="overflow-x-auto pb-4 w-full">
        <div className="grid grid-cols-[repeat(16,minmax(68px,1fr))] gap-x-2.5 gap-y-0 w-full min-w-[1100px]">
          {COL_IDS.map((id) => {
            const on = st.sel[sc].includes(id)
            return (
              <div key={id} className="flex flex-col items-center">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => st.toggleCol(sc, id)}
                  className="toggle toggle-xl mb-[38px] cursor-pointer"
                  aria-label={`Select column ${id}`}
                />
                {TABLE[sc][id].map((c, i) => (
                  <div key={i} className="w-full max-w-[80px] text-center mb-[46px]">
                    <b
                      className={`block jp font-light text-[42px]/[1.2] border-b border-line pb-2 ${
                        on ? 'text-accent' : 'text-[#f0f3f8]'
                      }`}
                    >
                      {c ? c.k : '-'}
                    </b>
                    <i className="block not-italic text-[#78859e] text-[15px] pt-2">{c ? c.r : '-'}</i>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  } else {
    const list = st.comp ? COMP_WORDS[sc] : WORDS[sc]
    body = (
      <>
        <p className="text-muted text-[13px] mb-4">
          {st.comp
            ? 'Kosakata gabungan (memuat Yōon & Sokuon). Aktif jika kolom karakter dan yōon terpilih.'
            : 'Kata aktif jika seluruh hurufnya ada di kolom yang dipilih. Beralih ke Characters untuk memilih kolom.'}
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 w-full">
          {list.map((w) => {
            const active = st.comp
              ? compositeWordOk(w[0], sc, st.sel[sc], st.selY[sc])
              : wordOk(w[0], sc, st.sel[sc])
            return (
              <div
                key={w[0]}
                className={`bg-panel border border-line rounded-[14px] px-[18px] py-3.5 ${
                  active ? '' : 'opacity-40'
                }`}
              >
                <b className="block jp font-light text-[34px]/[1.2]">{w[0]}</b>
                <span className="text-muted text-sm">
                  {w[1]} · {w[2]}
                </span>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-5 pt-4 pb-5 mb-10">
        <h1 className="m-0 mr-1 text-[26px] font-bold">{scriptTitle(sc)}</h1>
        <TypeStyleSwitches
          mode={mode}
          onModeChange={(m) => navigate(`/${script}/${m === 'char' ? 'flashcard' : 'word'}`)}
        />
        <span className="flex-1" />
        {mode === 'char' && st.srsMode && dueCount > 0 && (
          <span className="text-sm text-accent font-semibold">{dueCount} due</span>
        )}
      </div>
      {body}
      <div className="flex items-center justify-between gap-4 mt-7 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <button
            type="button"
            className="bg-transparent border-0 text-muted text-[13px] cursor-pointer px-1.5 py-1 underline hover:text-ink"
            onClick={() => st.selectAll(sc)}
          >
            Select all
          </button>
          <button
            type="button"
            className="bg-transparent border-0 text-muted text-[13px] cursor-pointer px-1.5 py-1 underline hover:text-ink"
            onClick={() => st.clearAll(sc)}
          >
            Clear
          </button>
        </span>
        {deck.length ? (
          <Link
            className="border-0 rounded-full bg-[#5eb839] hover:bg-[#4ea32e] text-white font-bold text-sm px-[26px] py-3 no-underline cursor-pointer inline-block transition-all shadow-md"
            to={`/practice/${sc}`}
          >
            Begin Test -{' '}
            {mode === 'char' ? `${st.comp ? st.selY[sc].length : st.sel[sc].length} Groups` : `${deck.length} Words`}
          </Link>
        ) : (
          <button
            type="button"
            className="border-0 rounded-full bg-pill text-ink font-semibold text-sm px-[26px] py-3 cursor-pointer inline-block transition-all"
            onClick={() => onHint('Switch on at least one column first')}
          >
            Begin Test - 0 Groups
          </button>
        )}
      </div>
    </>
  )
}
