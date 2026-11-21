import { COL_IDS, SCRIPTS, YOON_IDS, type Script } from '../data/kana'
import type { Mode, Selection } from './deck'

export type SelectionState = Pick<Selection, 'script' | 'mode' | 'comp' | 'sel' | 'selY'>

export const pickSelection = (s: SelectionState): SelectionState => ({
  script: s.script,
  mode: s.mode,
  comp: s.comp,
  sel: s.sel,
  selY: s.selY,
})

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function ids(raw: unknown, valid: string[]): Record<Script, string[]> | null {
  if (!isObj(raw)) return null
  const out = { hiragana: [] as string[], katakana: [] as string[] }
  for (const sc of SCRIPTS) {
    const v = raw[sc]
    if (!Array.isArray(v)) return null
    out[sc] = v.filter((x): x is string => typeof x === 'string' && valid.includes(x))
  }
  return out
}

/** Memvalidasi pilihan dari server. Mengembalikan null jika bentuknya tidak valid. */
export function parseSelection(raw: unknown): SelectionState | null {
  if (!isObj(raw)) return null
  const { script, mode, comp } = raw
  if (script !== 'hiragana' && script !== 'katakana') return null
  if (mode !== 'char' && mode !== 'word') return null
  if (typeof comp !== 'boolean') return null
  const sel = ids(raw.sel, COL_IDS)
  const selY = ids(raw.selY, YOON_IDS)
  if (!sel || !selY) return null
  return { script, mode: mode as Mode, comp, sel, selY }
}
