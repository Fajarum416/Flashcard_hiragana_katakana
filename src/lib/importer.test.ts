import { describe, it, expect } from 'vitest'
import {
  parseKanjiImportText,
  parseVocabImportText,
} from './importer'
import type { KanjiItem } from '../data/kanji/types'
import type { VocabWord } from '../data/vocab/types'

describe('Bulk Importer Engine', () => {
  const existingVocab: VocabWord[] = [
    { id: 'v-existing-1', kana: 'はい', romaji: 'hai', meaning: 'Ya' },
  ]

  const existingKanji: KanjiItem[] = [
    {
      id: 'k-existing-1',
      kanji: '山',
      onyomi: 'サン',
      kunyomi: 'やま',
      meaning: 'Gunung',
      image: 'https://example.com/yama.webp',
      examples: [{ word: '富士山', reading: 'ふじさん', meaning: 'Gunung Fuji' }],
    },
  ]

  it('parses TSV copy-paste from Excel/Google Sheets with Indonesian header aliases', () => {
    const tsv = [
      'Arti\tKana\tKanji\tRomaji\tJenis',
      'Guru\tせんせい\t先生\tsensei\tKata Benda',
      'Ya\tはい\t\thai\tUngkapan',
    ].join('\n')

    const res = parseVocabImportText(tsv, existingVocab, 'n5-b01')
    expect(res.format).toBe('tsv')
    expect(res.newCount).toBe(1)
    expect(res.duplicateCount).toBe(1)
    expect(res.errorCount).toBe(0)
    expect(res.rows[0].data?.kanji).toBe('先生')
    expect(res.rows[0].data?.type).toBe('Kata Benda')
    expect(res.rows[1].status).toBe('duplicate')
    expect(res.rows[1].existingId).toBe('v-existing-1')
  })

  it('reports row errors and internal duplicates accurately for vocab', () => {
    const csv = [
      'kana, romaji, meaning',
      'みず, mizu, Air',
      'みず, mizu, Air lagi',
      'ほん, hon, ',
    ].join('\n')

    const res = parseVocabImportText(csv, [], 'n5-b02')
    expect(res.format).toBe('csv')
    expect(res.newCount).toBe(1)
    expect(res.errorCount).toBe(2)
    expect(res.rows[1].status).toBe('error')
    expect(res.rows[1].rowNumber).toBe(3)
    expect(res.rows[2].status).toBe('error')
    expect(res.rows[2].rowNumber).toBe(4)
  })

  it('parses JSON kanji import and preserves existing manual illustration on duplicates', () => {
    const json = JSON.stringify([
      {
        kanji: '山',
        onyomi: 'サン (san)',
        kunyomi: 'やま (yama)',
        meaning: 'Gunung Tinggi',
        mnemonic: 'Tiga puncak gunung',
      },
      {
        kanji: '川',
        onyomi: 'セン',
        kunyomi: 'かわ',
        meaning: 'Sungai',
        examples: [{ word: '川口', reading: 'かわぐち', meaning: 'Muara' }],
      },
      {
        kanji: '火',
        meaning: '',
      },
    ])

    const res = parseKanjiImportText(json, existingKanji, 'n5-k01')
    expect(res.format).toBe('json')
    expect(res.duplicateCount).toBe(1)
    expect(res.newCount).toBe(1)
    expect(res.errorCount).toBe(1)

    const dupRow = res.rows[0]
    expect(dupRow.existingId).toBe('k-existing-1')
    expect(dupRow.existingImage).toBe('https://example.com/yama.webp')
    expect(dupRow.data?.image).toBe('https://example.com/yama.webp')
    expect(dupRow.data?.examples).toHaveLength(1)

    const newRow = res.rows[1]
    expect(newRow.data?.examples).toEqual([{ word: '川口', reading: 'かわぐち', meaning: 'Muara' }])
  })

  it('parses pipe-delimited kanji examples from CSV/TSV', () => {
    const csv = [
      'kanji,onyomi,kunyomi,meaning,mnemonic,examples',
      '日,ニチ,ひ,Matahari,Kotak dengan garis tengah,"日本|にほん|Jepang; 一日|いちにち|Satu hari"',
    ].join('\n')

    const res = parseKanjiImportText(csv, [], 'n5-k01')
    expect(res.newCount).toBe(1)
    expect(res.rows[0].data?.examples).toEqual([
      { word: '日本', reading: 'にほん', meaning: 'Jepang' },
      { word: '一日', reading: 'いちにち', meaning: 'Satu hari' },
    ])
  })

  it('allows vocab import with empty or omitted romaji', () => {
    const csv = [
      'kana,meaning,kanji',
      'ねこ,Kucing,猫',
      'いぬ,Anjing,',
    ].join('\n')

    const res = parseVocabImportText(csv, [], 'n5-b03')
    expect(res.errorCount).toBe(0)
    expect(res.newCount).toBe(2)
    expect(res.rows[0].data?.romaji).toBe('')
    expect(res.rows[0].data?.kanji).toBe('猫')
    expect(res.rows[1].data?.romaji).toBe('')
  })
})
