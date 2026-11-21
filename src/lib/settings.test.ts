import { describe, expect, it } from 'vitest'
import { parseSelection, pickSelection } from './settings'

const valid = {
  script: 'katakana',
  mode: 'word',
  comp: true,
  sel: { hiragana: ['a', 'ka'], katakana: ['a'] },
  selY: { hiragana: ['ki'], katakana: [] },
}

describe('parseSelection', () => {
  it('menerima pilihan yang valid', () => {
    expect(parseSelection(valid)).toEqual(valid)
  })
  it('membuang id kolom yang tidak dikenal', () => {
    const r = parseSelection({ ...valid, sel: { hiragana: ['a', 'zzz', 5], katakana: ['ka'] } })
    expect(r?.sel.hiragana).toEqual(['a'])
    expect(r?.sel.katakana).toEqual(['ka'])
  })
  it('menolak bentuk yang rusak', () => {
    expect(parseSelection(null)).toBeNull()
    expect(parseSelection({})).toBeNull()
    expect(parseSelection({ ...valid, script: 'kanji' })).toBeNull()
    expect(parseSelection({ ...valid, mode: 'x' })).toBeNull()
    expect(parseSelection({ ...valid, comp: 'yes' })).toBeNull()
    expect(parseSelection({ ...valid, sel: { hiragana: [] } })).toBeNull()
  })
})

describe('pickSelection', () => {
  it('hanya mengambil field pilihan', () => {
    const r = pickSelection({ ...(valid as any), stats: { x: 1 } })
    expect(Object.keys(r).sort()).toEqual(['comp', 'mode', 'script', 'sel', 'selY'])
  })
})
