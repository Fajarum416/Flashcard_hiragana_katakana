import { describe, it, expect } from 'vitest'
import { parseKanjiCSV, parseVocabCSV } from './content'
import { useContentStore } from '../store/useContentStore'

describe('CMS Content Parsers & Store', () => {
  it('parses vocab CSV lines with optional kanji and examples', () => {
    const csv = [
      'kana, romaji, meaning, kanji, type, exampleJp, exampleId',
      'せんせい, sensei, Guru, 先生, Kata Benda, 先生は親切です。, Guru itu ramah.',
      'はい, hai, Ya',
    ].join('\n')

    const parsed = parseVocabCSV(csv, 'n5-b01')
    expect(parsed.length).toBe(2)
    expect(parsed[0].kana).toBe('せんせい')
    expect(parsed[0].kanji).toBe('先生')
    expect(parsed[0].meaning).toBe('Guru')
    expect(parsed[0].exampleJp).toBe('先生は親切です。')

    const parsedSemicolon = parseVocabCSV('はい; hai; Ya', 'n5-b01')
    expect(parsedSemicolon[0].kana).toBe('はい')
    expect(parsedSemicolon[0].meaning).toBe('Ya')
  })

  it('parses kanji CSV lines with optional mnemonic', () => {
    const csv = [
      'kanji, onyomi, kunyomi, meaning, mnemonic',
      '山, サン (san), やま (yama), Gunung, Bentuk tiga puncak gunung',
      '川, セン (sen), かわ (kawa), Sungai',
    ].join('\n')

    const parsed = parseKanjiCSV(csv, 'n5-k03')
    expect(parsed.length).toBe(2)
    expect(parsed[0].kanji).toBe('山')
    expect(parsed[0].meaning).toBe('Gunung')
    expect(parsed[0].mnemonic).toBe('Bentuk tiga puncak gunung')
    expect(parsed[1].mnemonic).toBeUndefined()
  })

  it('initializes useContentStore with built-in fallback chapters', () => {
    const store = useContentStore.getState()
    expect(store.getVocabByLevel('n5').length).toBeGreaterThan(0)
    expect(store.getVocabByLevel('n4').length).toBeGreaterThan(0)
    expect(store.getKanjiByLevel('n5').length).toBeGreaterThan(0)
    expect(store.getKanjiByLevel('n4').length).toBeGreaterThan(0)
    expect(store.getKanjiByLevel('jft').length).toBeGreaterThan(0)
  })
})
