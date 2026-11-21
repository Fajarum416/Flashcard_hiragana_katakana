import { Link } from 'react-router-dom'
import { COL_IDS, TABLE, YOON_IDS, YOON_TABLE } from '../data/kana'
import { WORDS } from '../data/words'
import { buildDeck, selectedChars, wordOk } from '../lib/deck'
import { isDue } from '../lib/srs'
import { Segmented } from '../components/Segmented'
import { TypeStyleSwitches, scriptTitle } from '../components/TypeStyleSwitches'
import { useSelection } from '../store/useSelection'

const LOCK = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9h-2zM9 7a3 3 0 0 1 6 0v2H9V7z" />
  </svg>
)

export default function Home({ onHint }: { onHint: (msg: string) => void }) {
  const st = useSelection()
  const sc = st.script
  const yoon = st.mode === 'char' && st.comp
  const chars = selectedChars(st)
  const count = chars.length
  const dueCount = chars.filter((c) => isDue(st.stats[`${sc}:${c.k}`])).length
  const deck = buildDeck(st, { stats: st.stats, srsMode: st.srsMode })

  let body
  if (yoon) {
    body = (
      <div className="grid">
        <div className="cols y">
          {YOON_IDS.map((id) => {
            const on = st.selY[sc].includes(id)
            return (
              <div key={id} className={`col ${on ? 'on' : ''}`}>
                <button
                  className="lk"
                  aria-pressed={on}
                  aria-label={`Select column ${id}`}
                  onClick={() => st.toggleYoon(sc, id)}
                >
                  {LOCK}
                </button>
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
                <button
                  className="sw"
                  role="switch"
                  aria-checked={on}
                  aria-label={`Select column ${id}`}
                  onClick={() => st.toggleCol(sc, id)}
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
    body = (
      <>
        <p className="dim">
          A word is active when all of its characters are in the selected columns. Switch to Characters to select
          columns.
        </p>
        <div className="words">
          {WORDS[sc].map((w) => (
            <div key={w[0]} className={`w ${wordOk(w[0], sc, st.sel[sc]) ? '' : 'off'}`}>
              <b>{w[0]}</b>
              <span>
                {w[1]} · {w[2]}
              </span>
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="top">
        <h1>{scriptTitle(sc)}</h1>
        <TypeStyleSwitches />
        <span className="sp" />
        <Segmented
          label="Script"
          value={sc}
          onChange={st.setScript}
          options={[
            { value: 'hiragana', text: 'Hiragana' },
            { value: 'katakana', text: 'Katakana' },
          ]}
        />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button
            className="link"
            style={{
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: 999,
              background: st.srsMode ? 'var(--pill-on)' : 'var(--pill)',
              color: st.srsMode ? 'var(--ink)' : 'var(--muted)',
              fontSize: 12,
              fontWeight: 500,
            }}
            title="Sistem Pengulangan Berjarak: Memprioritaskan huruf yang lemah atau jatuh tempo peninjauan"
            onClick={() => st.setSrsMode(!st.srsMode)}
          >
            🧠 SRS: {st.srsMode ? 'Aktif' : 'Nonaktif'}
          </button>
          {st.mode === 'char' && dueCount > 0 && (
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
              {dueCount} due
            </span>
          )}
        </div>
      </div>
      {body}
      <div className="cta">
        {deck.length ? (
          <Link className="btn" to={`/practice/${sc}`}>
            Start practice ({st.mode === 'char' ? `${count} characters` : `${deck.length} words`})
          </Link>
        ) : (
          <button className="btn alt" onClick={() => onHint('Switch on at least one column first')}>
            Start practice
          </button>
        )}
        <span>
          <button className="link" onClick={() => st.selectAll(sc)}>
            Select all
          </button>
          <button className="link" onClick={() => st.clearAll(sc)}>
            Clear
          </button>
        </span>
      </div>
    </>
  )
}
