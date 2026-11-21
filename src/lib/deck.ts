import { CHAR_TO_COL, TABLE, YOON_TABLE, type Kana, type Script } from '../data/kana'
import { WORDS } from '../data/words'
import { sortDeckBySRS, type CardStat } from './srs'

export type Mode = 'char' | 'word'
export type CardKind = 'single' | 'comp' | 'word'

export interface Card {
  /** id progres, mis. 'hiragana:あ' (hanya kartu single) */
  id?: string
  front: string
  ans: string
  note: string
  kind: CardKind
}

export interface Selection {
  script: Script
  mode: Mode
  comp: boolean
  sel: Record<Script, string[]>
  selY: Record<Script, string[]>
}

export type Rng = () => number

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Huruf dari kolom terpilih (tabel Single atau tabel yoon). */
export function selectedChars(s: Selection, script: Script = s.script): Kana[] {
  return s.comp
    ? s.selY[script].flatMap((id) => YOON_TABLE[script][id])
    : s.sel[script].flatMap((id) => TABLE[script][id].filter((c): c is Kana => c !== null))
}

/** Kata aktif jika semua hurufnya ada di kolom terpilih. 'ー' dan spasi selalu valid. */
export function wordOk(word: string, script: Script, selected: string[]): boolean {
  return [...word].every((c) => c === 'ー' || c === ' ' || selected.includes(CHAR_TO_COL[script][c]))
}

export interface DeckOptions {
  stats?: Record<string, CardStat>
  srsMode?: boolean
  rng?: Rng
}

export function buildDeck(s: Selection, opts?: DeckOptions | Rng): Card[] {
  const options: DeckOptions = typeof opts === 'function' ? { rng: opts } : (opts ?? {})
  const rng = options.rng ?? Math.random
  const { script } = s
  let items: Card[] = []
  if (s.mode === 'char') {
    const chars = selectedChars(s)
    items = chars.map((c) => ({
      id: `${script}:${c.k}`,
      front: c.k,
      ans: c.r,
      note: '',
      kind: s.comp ? 'comp' : 'single',
    }))
    if (options.srsMode && options.stats) {
      return sortDeckBySRS(items, options.stats, Date.now(), rng)
    }
    return shuffle(items, rng)
  }
  const words = WORDS[script].filter((w) => wordOk(w[0], script, s.sel[script]))
  if (!words.length) return []
  if (!s.comp) {
    items = words.map((w) => ({ front: w[0], ans: w[1], note: w[2], kind: 'word' }))
    return shuffle(items, rng)
  }
  // Words + Composite (sementara): gabungan dua kata
  const n = Math.min(8, Math.max(3, words.length))
  const pick = () => words[Math.floor(rng() * words.length)]
  return Array.from({ length: n }, () => {
    const a = pick()
    const b = pick()
    return { front: `${a[0]} ${b[0]}`, ans: a[1] + b[1], note: `${a[2]} + ${b[2]}`, kind: 'word' as const }
  })
}
