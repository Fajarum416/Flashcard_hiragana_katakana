import type { KanjiExample, KanjiItem } from '../data/kanji/types'
import type { VocabWord } from '../data/vocab/types'

export type ImportKind = 'vocab' | 'kanji'
export type ImportFormat = 'auto' | 'csv' | 'tsv' | 'json' | 'xlsx'
export type ImportRowStatus = 'new' | 'duplicate' | 'error'
export type DuplicateStrategy = 'skip' | 'update'

export interface ImportPreviewRow<T> {
  rowNumber: number
  status: ImportRowStatus
  errors: string[]
  existingId?: string
  existingImage?: string
  data?: T
  rawPreview: Record<string, string>
}

export interface ImportPreviewResult<T> {
  format: Exclude<ImportFormat, 'auto'>
  rows: ImportPreviewRow<T>[]
  newCount: number
  duplicateCount: number
  errorCount: number
}

// ================= DELIMITED TEXT (CSV / TSV) PARSER =================

function detectDelimiter(headerLine: string): string {
  const counts = {
    '\t': (headerLine.match(/\t/g) ?? []).length,
    ';': (headerLine.match(/;/g) ?? []).length,
    ',': (headerLine.match(/,/g) ?? []).length,
  }
  if (counts['\t'] > 0 && counts['\t'] >= counts[';'] && counts['\t'] >= counts[',']) return '\t'
  if (counts[';'] > counts[',']) return ';'
  return ','
}

/** Parse CSV/TSV text with RFC-4180 quote handling (supports newlines inside quotes). */
function parseDelimitedRows(raw: string, delimiter: string): string[][] {
  const clean = raw.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (ch === '"') {
      if (inQuotes && clean[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      row.push(current.trim())
      current = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(current.trim())
      if (row.some((cell) => cell !== '')) rows.push(row)
      row = []
      current = ''
    } else {
      current += ch
    }
  }
  row.push(current.trim())
  if (row.some((cell) => cell !== '')) rows.push(row)
  return rows
}

function normalizeHeaderKey(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

// ================= HEADER ALIAS MAPPING =================

const VOCAB_ALIASES: Record<string, keyof VocabRawRecord> = {
  kana: 'kana',
  hiragana: 'kana',
  katakana: 'kana',
  bacaan: 'kana',
  reading: 'kana',
  romaji: 'romaji',
  latin: 'romaji',
  meaning: 'meaning',
  arti: 'meaning',
  terjemahan: 'meaning',
  indonesia: 'meaning',
  kanji: 'kanji',
  type: 'type',
  jenis: 'type',
  jeniskata: 'type',
  kategori: 'type',
  examplejp: 'exampleJp',
  contohjp: 'exampleJp',
  contohkalimat: 'exampleJp',
  contoh: 'exampleJp',
  kalimat: 'exampleJp',
  exampleid: 'exampleId',
  articonoh: 'exampleId',
  articontoh: 'exampleId',
  terjemahancontoh: 'exampleId',
}

const KANJI_ALIASES: Record<string, keyof KanjiRawRecord> = {
  kanji: 'kanji',
  huruf: 'kanji',
  karakter: 'kanji',
  onyomi: 'onyomi',
  on: 'onyomi',
  kunyomi: 'kunyomi',
  kun: 'kunyomi',
  meaning: 'meaning',
  arti: 'meaning',
  terjemahan: 'meaning',
  indonesia: 'meaning',
  mnemonic: 'mnemonic',
  catatan: 'mnemonic',
  ingatan: 'mnemonic',
  tips: 'mnemonic',
  examples: 'examples',
  contoh: 'examples',
  contohkata: 'examples',
}

interface VocabRawRecord {
  kana: string
  romaji: string
  meaning: string
  kanji: string
  type: string
  exampleJp: string
  exampleId: string
}

interface KanjiRawRecord {
  kanji: string
  onyomi: string
  kunyomi: string
  meaning: string
  mnemonic: string
  examples: unknown
}

function strVal(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function parseKanjiExamples(raw: unknown): KanjiExample[] {
  if (Array.isArray(raw)) {
    return raw
      .map((ex: any) => ({
        word: strVal(ex?.word ?? ex?.kata),
        reading: strVal(ex?.reading ?? ex?.bacaan ?? ex?.kana),
        meaning: strVal(ex?.meaning ?? ex?.arti),
      }))
      .filter((ex) => ex.word && ex.meaning)
  }
  const text = strVal(raw)
  if (!text) return []
  return text
    .split(/\s*[;\n]\s*/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [word = '', reading = '', meaning = ''] = line.split('|').map((s) => s.trim())
      return { word, reading, meaning }
    })
    .filter((ex) => ex.word && ex.meaning)
}

function mapObjectToVocab(obj: Record<string, unknown>): VocabRawRecord {
  const out: VocabRawRecord = {
    kana: '',
    romaji: '',
    meaning: '',
    kanji: '',
    type: '',
    exampleJp: '',
    exampleId: '',
  }
  for (const [k, v] of Object.entries(obj)) {
    const mapped = VOCAB_ALIASES[normalizeHeaderKey(k)]
    if (mapped) out[mapped] = strVal(v)
  }
  return out
}

function mapObjectToKanji(obj: Record<string, unknown>): KanjiRawRecord {
  const out: KanjiRawRecord = {
    kanji: '',
    onyomi: '',
    kunyomi: '',
    meaning: '',
    mnemonic: '',
    examples: '',
  }
  for (const [k, v] of Object.entries(obj)) {
    const mapped = KANJI_ALIASES[normalizeHeaderKey(k)]
    if (mapped) {
      if (mapped === 'examples') out.examples = v
      else out[mapped] = strVal(v)
    }
  }
  return out
}

function rowsToRecords(rows: string[][], defaultOrder: string[]): { rowNumber: number; record: Record<string, string> }[] {
  if (rows.length === 0) return []
  const firstRowNormalized = rows[0].map(normalizeHeaderKey)
  const knownKeys = new Set([...Object.keys(VOCAB_ALIASES), ...Object.keys(KANJI_ALIASES)])
  const hasHeader = firstRowNormalized.some((cell) => knownKeys.has(cell))

  const headers = hasHeader ? rows[0] : defaultOrder
  const startIdx = hasHeader ? 1 : 0

  const result: { rowNumber: number; record: Record<string, string> }[] = []
  for (let i = startIdx; i < rows.length; i++) {
    const cols = rows[i]
    const record: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || defaultOrder[c] || `col${c}`
      record[key] = cols[c] ?? ''
    }
    result.push({ rowNumber: i + 1, record })
  }
  return result
}

function extractJsonArray(raw: string): Record<string, unknown>[] {
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, '').trim())
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object') {
    for (const key of ['words', 'items', 'data', 'rows']) {
      if (Array.isArray((parsed as Record<string, unknown>)[key])) {
        return (parsed as Record<string, unknown>)[key] as Record<string, unknown>[]
      }
    }
  }
  throw new Error('Format JSON harus berupa array [...] atau objek dengan properti words / items / data.')
}

// ================= VALIDATION & DUPLICATE DETECTION =================

function vocabKey(kana: string, kanji?: string): string {
  return `${kana.trim()}::${(kanji ?? '').trim()}`
}

export function previewVocabImportFromRecords(
  records: { rowNumber: number; record: Record<string, unknown> }[],
  existingWords: VocabWord[],
  idPrefix: string,
  format: Exclude<ImportFormat, 'auto'>,
): ImportPreviewResult<VocabWord> {
  const existingMap = new Map<string, VocabWord>()
  for (const w of existingWords) {
    existingMap.set(vocabKey(w.kana, w.kanji), w)
  }

  const seenInBatch = new Set<string>()
  const rows: ImportPreviewRow<VocabWord>[] = []
  let newCount = 0
  let duplicateCount = 0
  let errorCount = 0
  const stamp = Date.now()

  for (let i = 0; i < records.length; i++) {
    const { rowNumber, record } = records[i]
    const v = mapObjectToVocab(record)
    const errors: string[] = []

    if (!v.kana) errors.push('Kolom kana wajib diisi')
    if (!v.meaning) errors.push('Kolom arti (meaning) wajib diisi')

    const key = vocabKey(v.kana, v.kanji)
    if (errors.length === 0 && seenInBatch.has(key)) {
      errors.push('Duplikat di dalam file import yang sama')
    }

    const rawPreview = {
      kana: v.kana,
      romaji: v.romaji,
      meaning: v.meaning,
      kanji: v.kanji,
      type: v.type,
    }

    if (errors.length > 0) {
      errorCount++
      rows.push({ rowNumber, status: 'error', errors, rawPreview })
      continue
    }

    seenInBatch.add(key)
    const existing = existingMap.get(key)
    const word: VocabWord = {
      id: existing ? existing.id : `${idPrefix}-${stamp}-${i}`,
      kana: v.kana,
      romaji: v.romaji,
      meaning: v.meaning,
      kanji: v.kanji || undefined,
      type: v.type || undefined,
      exampleJp: v.exampleJp || undefined,
      exampleId: v.exampleId || undefined,
    }

    if (existing) {
      duplicateCount++
      rows.push({
        rowNumber,
        status: 'duplicate',
        errors: [],
        existingId: existing.id,
        data: word,
        rawPreview,
      })
    } else {
      newCount++
      rows.push({
        rowNumber,
        status: 'new',
        errors: [],
        data: word,
        rawPreview,
      })
    }
  }

  return { format, rows, newCount, duplicateCount, errorCount }
}

export function previewKanjiImportFromRecords(
  records: { rowNumber: number; record: Record<string, unknown> }[],
  existingItems: KanjiItem[],
  idPrefix: string,
  format: Exclude<ImportFormat, 'auto'>,
): ImportPreviewResult<KanjiItem> {
  const existingMap = new Map<string, KanjiItem>()
  for (const item of existingItems) {
    existingMap.set(item.kanji.trim(), item)
  }

  const seenInBatch = new Set<string>()
  const rows: ImportPreviewRow<KanjiItem>[] = []
  let newCount = 0
  let duplicateCount = 0
  let errorCount = 0
  const stamp = Date.now()

  for (let i = 0; i < records.length; i++) {
    const { rowNumber, record } = records[i]
    const k = mapObjectToKanji(record)
    const errors: string[] = []

    if (!k.kanji) errors.push('Kolom kanji wajib diisi')
    if (!k.meaning) errors.push('Kolom arti (meaning) wajib diisi')

    const key = k.kanji.trim()
    if (errors.length === 0 && seenInBatch.has(key)) {
      errors.push('Huruf kanji ganda di dalam file import yang sama')
    }

    const rawPreview = {
      kanji: k.kanji,
      onyomi: k.onyomi || '-',
      kunyomi: k.kunyomi || '-',
      meaning: k.meaning,
      mnemonic: k.mnemonic,
    }

    if (errors.length > 0) {
      errorCount++
      rows.push({ rowNumber, status: 'error', errors, rawPreview })
      continue
    }

    seenInBatch.add(key)
    const existing = existingMap.get(key)
    const examples = parseKanjiExamples(k.examples)
    const item: KanjiItem = {
      id: existing ? existing.id : `${idPrefix}-${stamp}-${i}`,
      kanji: k.kanji,
      onyomi: k.onyomi || '-',
      kunyomi: k.kunyomi || '-',
      meaning: k.meaning,
      mnemonic: k.mnemonic || undefined,
      image: existing?.image,
      examples: examples.length > 0 ? examples : (existing?.examples ?? []),
    }

    if (existing) {
      duplicateCount++
      rows.push({
        rowNumber,
        status: 'duplicate',
        errors: [],
        existingId: existing.id,
        existingImage: existing.image,
        data: item,
        rawPreview,
      })
    } else {
      newCount++
      rows.push({
        rowNumber,
        status: 'new',
        errors: [],
        data: item,
        rawPreview,
      })
    }
  }

  return { format, rows, newCount, duplicateCount, errorCount }
}

// ================= PUBLIC TEXT & FILE IMPORTERS =================

const VOCAB_DEFAULT_ORDER = ['kana', 'romaji', 'meaning', 'kanji', 'type', 'exampleJp', 'exampleId']
const KANJI_DEFAULT_ORDER = ['kanji', 'onyomi', 'kunyomi', 'meaning', 'mnemonic', 'examples']

export function parseVocabImportText(
  raw: string,
  existingWords: VocabWord[],
  idPrefix: string,
): ImportPreviewResult<VocabWord> {
  const trimmed = raw.replace(/^\uFEFF/, '').trim()
  if (!trimmed) {
    return { format: 'csv', rows: [], newCount: 0, duplicateCount: 0, errorCount: 0 }
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const arr = extractJsonArray(trimmed)
    const records = arr.map((rec, idx) => ({ rowNumber: idx + 1, record: rec }))
    return previewVocabImportFromRecords(records, existingWords, idPrefix, 'json')
  }

  const firstLine = trimmed.split(/\r?\n/)[0] ?? ''
  const delimiter = detectDelimiter(firstLine)
  const format: Exclude<ImportFormat, 'auto'> = delimiter === '\t' ? 'tsv' : 'csv'
  const parsed = parseDelimitedRows(trimmed, delimiter)
  const records = rowsToRecords(parsed, VOCAB_DEFAULT_ORDER)
  return previewVocabImportFromRecords(records, existingWords, idPrefix, format)
}

export function parseKanjiImportText(
  raw: string,
  existingItems: KanjiItem[],
  idPrefix: string,
): ImportPreviewResult<KanjiItem> {
  const trimmed = raw.replace(/^\uFEFF/, '').trim()
  if (!trimmed) {
    return { format: 'csv', rows: [], newCount: 0, duplicateCount: 0, errorCount: 0 }
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const arr = extractJsonArray(trimmed)
    const records = arr.map((rec, idx) => ({ rowNumber: idx + 1, record: rec }))
    return previewKanjiImportFromRecords(records, existingItems, idPrefix, 'json')
  }

  const firstLine = trimmed.split(/\r?\n/)[0] ?? ''
  const delimiter = detectDelimiter(firstLine)
  const format: Exclude<ImportFormat, 'auto'> = delimiter === '\t' ? 'tsv' : 'csv'
  const parsed = parseDelimitedRows(trimmed, delimiter)
  const records = rowsToRecords(parsed, KANJI_DEFAULT_ORDER)
  return previewKanjiImportFromRecords(records, existingItems, idPrefix, format)
}

export async function parseImportFile<T extends VocabWord | KanjiItem>(
  file: File,
  kind: ImportKind,
  existing: T[],
  idPrefix: string,
): Promise<ImportPreviewResult<T>> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) {
      throw new Error('File Excel tidak memiliki sheet yang bisa dibaca.')
    }
    const sheet = wb.Sheets[sheetName]
    const rawObjects = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    const records = rawObjects.map((rec, idx) => ({ rowNumber: idx + 2, record: rec }))
    if (kind === 'vocab') {
      return previewVocabImportFromRecords(
        records,
        existing as VocabWord[],
        idPrefix,
        'xlsx',
      ) as ImportPreviewResult<T>
    }
    return previewKanjiImportFromRecords(
      records,
      existing as KanjiItem[],
      idPrefix,
      'xlsx',
    ) as ImportPreviewResult<T>
  }

  const text = await file.text()
  if (kind === 'vocab') {
    return parseVocabImportText(text, existing as VocabWord[], idPrefix) as ImportPreviewResult<T>
  }
  return parseKanjiImportText(text, existing as KanjiItem[], idPrefix) as ImportPreviewResult<T>
}

// ================= TEMPLATE & ERROR REPORT DOWNLOADS =================

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function escapeCsvCell(val: string): string {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`
  return val
}

export async function downloadImportTemplate(
  kind: ImportKind,
  format: 'xlsx' | 'csv' | 'json',
): Promise<void> {
  const vocabSample = [
    {
      kana: 'せんせい',
      romaji: 'sensei',
      meaning: 'Guru',
      kanji: '先生',
      type: 'Kata Benda',
      exampleJp: '先生は親切です。',
      exampleId: 'Guru itu ramah.',
    },
    {
      kana: 'たべます',
      romaji: 'tabemasu',
      meaning: 'Makan',
      kanji: '食べます',
      type: 'Kata Kerja',
      exampleJp: '朝ごはんを食べます。',
      exampleId: 'Makan sarapan.',
    },
  ]

  const kanjiSample = [
    {
      kanji: '山',
      onyomi: 'サン (san)',
      kunyomi: 'やま (yama)',
      meaning: 'Gunung',
      mnemonic: 'Bentuknya seperti tiga puncak gunung.',
      examples: '富士山|ふじさん|Gunung Fuji; 山道|やまみち|Jalan gunung',
    },
    {
      kanji: '川',
      onyomi: 'セン (sen)',
      kunyomi: 'かわ (kawa)',
      meaning: 'Sungai',
      mnemonic: 'Tiga aliran air sungai yang mengalir.',
      examples: '川口|かわぐち|Muara sungai',
    },
  ]

  const rows = kind === 'vocab' ? vocabSample : kanjiSample
  const baseName = kind === 'vocab' ? 'template_import_kosakata' : 'template_import_kanji'

  if (format === 'json') {
    const jsonRows =
      kind === 'kanji'
        ? kanjiSample.map((r) => ({
            ...r,
            examples: parseKanjiExamples(r.examples),
          }))
        : vocabSample
    const blob = new Blob([JSON.stringify(jsonRows, null, 2)], { type: 'application/json;charset=utf-8' })
    triggerDownload(blob, `${baseName}.json`)
    return
  }

  if (format === 'csv') {
    const headers = Object.keys(rows[0])
    const lines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escapeCsvCell(String((r as Record<string, string>)[h] ?? ''))).join(',')),
    ]
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    triggerDownload(blob, `${baseName}.csv`)
    return
  }

  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, kind === 'vocab' ? 'Kosakata' : 'Kanji')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  triggerDownload(blob, `${baseName}.xlsx`)
}

export function downloadErrorReport<T>(rows: ImportPreviewRow<T>[], kind: ImportKind): void {
  const errRows = rows.filter((r) => r.status === 'error')
  if (errRows.length === 0) return
  const keys = Object.keys(errRows[0].rawPreview)
  const headers = ['baris', ...keys, 'alasan_error']
  const lines = [
    headers.join(','),
    ...errRows.map((r) =>
      [
        String(r.rowNumber),
        ...keys.map((k) => escapeCsvCell(r.rawPreview[k] ?? '')),
        escapeCsvCell(r.errors.join('; ')),
      ].join(','),
    ),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  triggerDownload(blob, `error_import_${kind}.csv`)
}
