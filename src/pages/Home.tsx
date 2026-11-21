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
      <div className="grid">
        <div className="cols y">
          {YOON_IDS.map((id) => {
            const on = st.selY[sc].includes(id)
            return (
              <div key={id} className={`col ${on ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => st.toggleYoon(sc, id)}
                  className="toggle toggle-xl mb-9 cursor-pointer"
                  aria-label={`Select column ${id}`}
                />
                {YOON_TABLE[sc][id].map((c) => (
                  <div key={c.k} className="cell">
                    <b>{c.k}</b>
                    <i>{c.r}</i>
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
      <div className="grid">
        <div className="cols">
          {COL_IDS.map((id) => {
            const on = st.sel[sc].includes(id)
            return (
              <div key={id} className={`col ${on ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => st.toggleCol(sc, id)}
                  className="toggle toggle-xl mb-9 cursor-pointer"
                  aria-label={`Select column ${id}`}
                />
                {TABLE[sc][id].map((c, i) => (
                  <div key={i} className="cell">
                    <b>{c ? c.k : '-'}</b>
                    <i>{c ? c.r : '-'}</i>
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
        <p className="dim">
          {st.comp
            ? 'Kosakata gabungan (memuat Yōon & Sokuon). Aktif jika kolom karakter dan yōon terpilih.'
            : 'Kata aktif jika seluruh hurufnya ada di kolom yang dipilih. Beralih ke Characters untuk memilih kolom.'}
        </p>
        <div className="words">
          {list.map((w) => {
            const active = st.comp
              ? compositeWordOk(w[0], sc, st.sel[sc], st.selY[sc])
              : wordOk(w[0], sc, st.sel[sc])
            return (
              <div
                key={w[0]}
                className={`w ${active ? '' : 'off'}`}
              >
                <b>{w[0]}</b>
                <span>
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
      <div className="top">
        <h1>{scriptTitle(sc)}</h1>
        <TypeStyleSwitches
          mode={mode}
          onModeChange={(m) => navigate(`/${script}/${m === 'char' ? 'flashcard' : 'word'}`)}
        />
        <span className="sp" />
        {mode === 'char' && st.srsMode && dueCount > 0 && (
          <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600 }}>
            {dueCount} due
          </span>
        )}
      </div>
      {body}
      <div className="cta">
        <span>
          <button className="link" onClick={() => st.selectAll(sc)}>
            Select all
          </button>
          <button className="link" onClick={() => st.clearAll(sc)}>
            Clear
          </button>
        </span>
        {deck.length ? (
          <Link className="btn font-bold shadow-md" to={`/practice/${sc}`}>
            Begin Test - {mode === 'char' ? `${st.comp ? st.selY[sc].length : st.sel[sc].length} Groups` : `${deck.length} Words`}
          </Link>
        ) : (
          <button className="btn alt" onClick={() => onHint('Switch on at least one column first')}>
            Begin Test - 0 Groups
          </button>
        )}
      </div>
    </>
  )
}
