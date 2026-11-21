import { CHAR_TO_COL, TABLE, YOON_TABLE, type Kana, type Script } from '../data/kana'
import { COMP_WORDS, WORDS } from '../data/words'
import { sortDeckBySRS, type CardStat } from './srs'

const SMALL_KANA = 'ゃゅょャュョ'

const BASE_TO_YOON_COL: Record<string, string> = {
  き: 'ki', し: 'shi', ち: 'chi', に: 'ni', ひ: 'hi', み: 'mi', り: 'ri', ぎ: 'gi', じ: 'ji', び: 'bi', ぴ: 'pi',
  キ: 'ki', シ: 'shi', チ: 'chi', ニ: 'ni', ヒ: 'hi', ミ: 'mi', リ: 'ri', ギ: 'gi', ジ: 'ji', ビ: 'bi', ピ: 'pi',
}

/** Kata composite aktif jika huruf gojuon ada di sel dan yoon ada di selY. Sokuon (っ/ッ) otomatis valid. */
export function compositeWordOk(
  word: string,
  script: Script,
  sel: string[],
  selY: string[]
): boolean {
  const chars = [...word]
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    if (c === 'っ' || c === 'ッ' || c === 'ー' || c === ' ') continue

    if (i + 1 < chars.length && SMALL_KANA.includes(chars[i + 1])) {
      const yoonCol = BASE_TO_YOON_COL[c]
      if (!yoonCol || !selY.includes(yoonCol)) return false
      i++ // Lewati huruf kecil
      continue
    }

    const col = CHAR_TO_COL[script][c]
    if (!col || !sel.includes(col)) return false
  }
  return true
}

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
  const wordList = s.comp ? COMP_WORDS[script] : WORDS[script]
  const validWords = s.comp
    ? wordList.filter((w) => compositeWordOk(w[0], script, s.sel[script], s.selY[script]))
    : wordList.filter((w) => wordOk(w[0], script, s.sel[script]))

  if (!validWords.length) return []
  items = validWords.map((w) => ({ front: w[0], ans: w[1], note: w[2], kind: 'word' }))
  return shuffle(items, rng)
}
