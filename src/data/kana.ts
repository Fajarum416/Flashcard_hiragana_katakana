export type Script = 'hiragana' | 'katakana'

export interface Kana {
  /** huruf kana */
  k: string
  /** romaji */
  r: string
}

export const SCRIPTS: Script[] = ['hiragana', 'katakana']

/** Hiragana -> Katakana: tambah 0x60 pada kode karakter. '。' = sel kosong. */
export const toKatakana = (s: string): string =>
  [...s].map((c) => (c === '。' ? c : String.fromCharCode(c.charCodeAt(0) + 0x60))).join('')

// [id kolom, romaji per baris (a i u e o), hiragana per baris ('。' = kosong)]
const GOJUON: [string, string[], string][] = [
  ['a', ['a', 'i', 'u', 'e', 'o'], 'あいうえお'],
  ['ka', ['ka', 'ki', 'ku', 'ke', 'ko'], 'かきくけこ'],
  ['sa', ['sa', 'shi', 'su', 'se', 'so'], 'さしすせそ'],
  ['ta', ['ta', 'chi', 'tsu', 'te', 'to'], 'たちつてと'],
  ['na', ['na', 'ni', 'nu', 'ne', 'no'], 'なにぬねの'],
  ['ha', ['ha', 'hi', 'fu', 'he', 'ho'], 'はひふへほ'],
  ['ma', ['ma', 'mi', 'mu', 'me', 'mo'], 'まみむめも'],
  ['ya', ['ya', '', 'yu', '', 'yo'], 'や。ゆ。よ'],
  ['ra', ['ra', 'ri', 'ru', 're', 'ro'], 'らりるれろ'],
  ['wa', ['wa', '', '', '', 'wo'], 'わ。。。を'],
  ['n', ['', '', '', '', 'n'], '。。。。ん'],
  ['ga', ['ga', 'gi', 'gu', 'ge', 'go'], 'がぎぐげご'],
  ['za', ['za', 'ji', 'zu', 'ze', 'zo'], 'ざじずぜぞ'],
  ['da', ['da', 'ji', 'zu', 'de', 'do'], 'だぢづでど'],
  ['ba', ['ba', 'bi', 'bu', 'be', 'bo'], 'ばびぶべぼ'],
  ['pa', ['pa', 'pi', 'pu', 'pe', 'po'], 'ぱぴぷぺぽ'],
]

export const COL_IDS: string[] = GOJUON.map((c) => c[0])

/** TABLE[script][kolom] = 5 sel (null = kosong) */
export const TABLE: Record<Script, Record<string, (Kana | null)[]>> = { hiragana: {}, katakana: {} }
/** CHAR_TO_COL[script][huruf] = id kolom */
export const CHAR_TO_COL: Record<Script, Record<string, string>> = { hiragana: {}, katakana: {} }

for (const [id, romaji, hira] of GOJUON) {
  for (const sc of SCRIPTS) {
    const chars = [...(sc === 'hiragana' ? hira : toKatakana(hira))]
    TABLE[sc][id] = chars.map((c, i) => (c === '。' ? null : { k: c, r: romaji[i] }))
    for (const c of chars) if (c !== '。') CHAR_TO_COL[sc][c] = id
  }
}

// [id kolom yoon, huruf dasar hiragana, romaji (ya yu yo)]
const YOON: [string, string, string][] = [
  ['ki', 'き', 'kya kyu kyo'],
  ['shi', 'し', 'sha shu sho'],
  ['chi', 'ち', 'cha chu cho'],
  ['ni', 'に', 'nya nyu nyo'],
  ['hi', 'ひ', 'hya hyu hyo'],
  ['mi', 'み', 'mya myu myo'],
  ['ri', 'り', 'rya ryu ryo'],
  ['gi', 'ぎ', 'gya gyu gyo'],
  ['ji', 'じ', 'ja ju jo'],
  ['bi', 'び', 'bya byu byo'],
  ['pi', 'ぴ', 'pya pyu pyo'],
]
const SMALL = 'ゃゅょ'

export const YOON_IDS: string[] = YOON.map((c) => c[0])

/** YOON_TABLE[script][kolom] = 3 kartu (ya, yu, yo) */
export const YOON_TABLE: Record<Script, Record<string, Kana[]>> = { hiragana: {}, katakana: {} }
for (const [id, base, romaji] of YOON) {
  for (const sc of SCRIPTS) {
    const f = sc === 'hiragana' ? (x: string) => x : toKatakana
    YOON_TABLE[sc][id] = romaji.split(' ').map((r, i) => ({ k: f(base) + f(SMALL[i]), r }))
  }
}
