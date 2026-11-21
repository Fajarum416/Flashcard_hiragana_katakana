import { describe, expect, it } from 'vitest'
import { COL_IDS, TABLE, YOON_IDS, YOON_TABLE, toKatakana } from '../data/kana'
import { buildDeck, wordOk, type Selection } from './deck'

const base: Selection = {
  script: 'hiragana',
  mode: 'char',
  comp: false,
  sel: { hiragana: ['a'], katakana: ['a'] },
  selY: { hiragana: ['ki'], katakana: ['ki'] },
}
const seq = () => 0.5

describe('data kana', () => {
  const count = (sc: 'hiragana' | 'katakana') =>
    COL_IDS.flatMap((id) => TABLE[sc][id]).filter(Boolean).length
  it('71 huruf single per aksara', () => {
    expect(count('hiragana')).toBe(71)
    expect(count('katakana')).toBe(71)
  })
  it('33 kartu yoon per aksara', () => {
    expect(YOON_IDS.flatMap((id) => YOON_TABLE.hiragana[id])).toHaveLength(33)
    expect(YOON_IDS.flatMap((id) => YOON_TABLE.katakana[id])).toHaveLength(33)
  })
  it('katakana dibentuk dari hiragana', () => {
    expect(toKatakana('あ')).toBe('ア')
    expect(toKatakana('ゃ')).toBe('ャ')
    expect(YOON_TABLE.katakana.ki[0].k).toBe('キャ')
  })
})

describe('wordOk', () => {
  it('semua huruf harus ada di kolom terpilih', () => {
    expect(wordOk('いえ', 'hiragana', ['a'])).toBe(true)
    expect(wordOk('あめ', 'hiragana', ['a'])).toBe(false)
    expect(wordOk('あめ', 'hiragana', ['a', 'ma'])).toBe(true)
  })
  it('tanda panjang selalu valid', () => {
    expect(wordOk('コーヒー', 'katakana', ['ka', 'ha', 'a'])).toBe(true)
  })
})

describe('buildDeck', () => {
  it('Characters + Single: satu kartu per huruf', () => {
    const d = buildDeck(base, seq)
    expect(d).toHaveLength(5)
    expect(d.every((c) => c.kind === 'single' && c.id?.startsWith('hiragana:'))).toBe(true)
  })
  it('Characters + Composite memakai kolom yoon', () => {
    const d = buildDeck({ ...base, comp: true }, seq)
    expect(d.map((c) => c.ans).sort()).toEqual(['kya', 'kyo', 'kyu'])
  })
  it('kolom kosong menghasilkan deck kosong', () => {
    expect(buildDeck({ ...base, sel: { hiragana: [], katakana: [] } }, seq)).toEqual([])
  })
  it('Words hanya memuat kata yang lengkap hurufnya', () => {
    const d = buildDeck({ ...base, mode: 'word' }, seq)
    expect(d.map((c) => c.front)).toEqual(['いえ'])
  })
})
