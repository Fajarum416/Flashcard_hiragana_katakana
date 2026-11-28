import { db, type CachedKanjiChapter, type CachedKanjiItem, type CachedVocabChapter, type CachedVocabWord } from './db'
import { supabase } from './supabase'
import { N5_CHAPTERS, N4_CHAPTERS, type VocabChapter, type VocabWord } from '../data/vocab'
import { N5_KANJI_CHAPTERS, N4_KANJI_CHAPTERS, JFT_KANJI_CHAPTERS, type KanjiChapter, type KanjiExample, type KanjiItem, type KanjiLevel } from '../data/kanji'

export interface ManagedVocabChapter extends VocabChapter {
  id: string
  level: 'n5' | 'n4'
  published: boolean
}

export interface ManagedKanjiChapter extends KanjiChapter {
  id: string
  published: boolean
}

function client() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi')
  return supabase
}

/** Konversi data bawaan ke format ManagedVocabChapter untuk fallback. */
export function getBuiltInVocabChapters(): ManagedVocabChapter[] {
  return [
    ...N5_CHAPTERS.map((ch) => ({
      ...ch,
      id: `builtin-vocab-n5-${ch.chapter}`,
      level: 'n5' as const,
      published: true,
    })),
    ...N4_CHAPTERS.map((ch) => ({
      ...ch,
      id: `builtin-vocab-n4-${ch.chapter}`,
      level: 'n4' as const,
      published: true,
    })),
  ]
}

/** Konversi data bawaan ke format ManagedKanjiChapter untuk fallback. */
export function getBuiltInKanjiChapters(): ManagedKanjiChapter[] {
  return [...N5_KANJI_CHAPTERS, ...N4_KANJI_CHAPTERS, ...JFT_KANJI_CHAPTERS].map((ch) => ({
    ...ch,
    id: `builtin-kanji-${ch.level}-${ch.chapter}`,
    published: true,
  }))
}

/** Muat materi Kosakata & Kanji dari cache Dexie lokal. */
export async function loadCachedContent(): Promise<{
  vocab: ManagedVocabChapter[] | null
  kanji: ManagedKanjiChapter[] | null
}> {
  try {
    const [vCh, vWords, kCh, kItems] = await Promise.all([
      db.cached_vocab_chapters.toArray(),
      db.cached_vocab_words.toArray(),
      db.cached_kanji_chapters.toArray(),
      db.cached_kanji_items.toArray(),
    ])

    let vocab: ManagedVocabChapter[] | null = null
    if (vCh.length > 0) {
      const wordsByCh = new Map<string, VocabWord[]>()
      vWords.sort((a, b) => a.sortOrder - b.sortOrder)
      for (const w of vWords) {
        const list = wordsByCh.get(w.chapterId) ?? []
        list.push({
          id: w.id,
          kanji: w.kanji,
          kana: w.kana,
          romaji: w.romaji,
          meaning: w.meaning,
          type: w.type,
          exampleJp: w.exampleJp,
          exampleId: w.exampleId,
        })
        wordsByCh.set(w.chapterId, list)
      }
      vocab = vCh
        .slice()
        .sort((a, b) => a.chapter - b.chapter)
        .map((c) => ({
          id: c.id,
          level: c.level,
          chapter: c.chapter,
          title: c.title,
          description: c.description,
          published: c.published ?? true,
          words: wordsByCh.get(c.id) ?? [],
        }))
    }

    let kanji: ManagedKanjiChapter[] | null = null
    if (kCh.length > 0) {
      const itemsByCh = new Map<string, KanjiItem[]>()
      kItems.sort((a, b) => a.sortOrder - b.sortOrder)
      for (const item of kItems) {
        const list = itemsByCh.get(item.chapterId) ?? []
        list.push({
          id: item.id,
          kanji: item.kanji,
          onyomi: item.onyomi,
          kunyomi: item.kunyomi,
          meaning: item.meaning,
          mnemonic: item.mnemonic,
          image: item.image,
          examples: item.examples,
        })
        itemsByCh.set(item.chapterId, list)
      }
      kanji = kCh
        .slice()
        .sort((a, b) => a.chapter - b.chapter)
        .map((c) => ({
          id: c.id,
          level: c.level,
          chapter: c.chapter,
          title: c.title,
          description: c.description,
          published: c.published ?? true,
          items: itemsByCh.get(c.id) ?? [],
        }))
    }

    return { vocab, kanji }
  } catch {
    return { vocab: null, kanji: null }
  }
}

/** Ambil materi terbaru dari Supabase dan simpan ke cache Dexie. */
export async function fetchRemoteContent(includeDrafts: boolean = false): Promise<{
  vocab: ManagedVocabChapter[] | null
  kanji: ManagedKanjiChapter[] | null
}> {
  if (!supabase || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { vocab: null, kanji: null }
  }

  const [vChRes, vWordRes, kChRes, kItemRes] = await Promise.all([
    supabase.from('vocab_chapters').select('*').order('chapter', { ascending: true }),
    supabase.from('vocab_words').select('*').order('sort_order', { ascending: true }),
    supabase.from('kanji_chapters').select('*').order('chapter', { ascending: true }),
    supabase.from('kanji_items').select('*').order('sort_order', { ascending: true }),
  ])

  let vocab: ManagedVocabChapter[] | null = null
  if (!vChRes.error && !vWordRes.error && vChRes.data && vChRes.data.length > 0) {
    const wordsByCh = new Map<string, VocabWord[]>()
    const cachedWords: CachedVocabWord[] = []
    for (const r of vWordRes.data as any[]) {
      const word: VocabWord = {
        id: r.id,
        kanji: r.kanji || undefined,
        kana: r.kana,
        romaji: r.romaji,
        meaning: r.meaning,
        type: r.type || undefined,
        exampleJp: r.example_jp || undefined,
        exampleId: r.example_id || undefined,
      }
      const list = wordsByCh.get(r.chapter_id) ?? []
      list.push(word)
      wordsByCh.set(r.chapter_id, list)
      cachedWords.push({ ...word, chapterId: r.chapter_id, sortOrder: r.sort_order ?? 0 })
    }

    const filteredCh = (vChRes.data as any[]).filter((c) => includeDrafts || c.published !== false)
    vocab = filteredCh.map((c) => ({
      id: c.id,
      level: c.level === 'n4' ? 'n4' : 'n5',
      chapter: c.chapter,
      title: c.title,
      description: c.description || undefined,
      published: c.published !== false,
      words: wordsByCh.get(c.id) ?? [],
    }))

    // Simpan ke cache Dexie (hanya versi published untuk siswa)
    if (!includeDrafts) {
      const cachedChapters: CachedVocabChapter[] = vocab.map((c) => ({
        id: c.id,
        level: c.level,
        chapter: c.chapter,
        title: c.title,
        description: c.description,
        published: c.published,
      }))
      await db.transaction('rw', db.cached_vocab_chapters, db.cached_vocab_words, async () => {
        await db.cached_vocab_chapters.clear()
        await db.cached_vocab_words.clear()
        await db.cached_vocab_chapters.bulkPut(cachedChapters)
        await db.cached_vocab_words.bulkPut(cachedWords)
      })
    }
  }

  let kanji: ManagedKanjiChapter[] | null = null
  if (!kChRes.error && !kItemRes.error && kChRes.data && kChRes.data.length > 0) {
    const itemsByCh = new Map<string, KanjiItem[]>()
    const cachedItems: CachedKanjiItem[] = []
    for (const r of kItemRes.data as any[]) {
      const examples: KanjiExample[] = Array.isArray(r.examples) ? r.examples : []
      const item: KanjiItem = {
        id: r.id,
        kanji: r.kanji,
        onyomi: r.onyomi ?? '',
        kunyomi: r.kunyomi ?? '',
        meaning: r.meaning,
        mnemonic: r.mnemonic || undefined,
        image: r.image_url || undefined,
        examples,
      }
      const list = itemsByCh.get(r.chapter_id) ?? []
      list.push(item)
      itemsByCh.set(r.chapter_id, list)
      cachedItems.push({ ...item, chapterId: r.chapter_id, sortOrder: r.sort_order ?? 0 })
    }

    const filteredCh = (kChRes.data as any[]).filter((c) => includeDrafts || c.published !== false)
    kanji = filteredCh.map((c) => ({
      id: c.id,
      level: (c.level === 'n4' ? 'n4' : c.level === 'jft' ? 'jft' : 'n5') as KanjiLevel,
      chapter: c.chapter,
      title: c.title,
      description: c.description || undefined,
      published: c.published !== false,
      items: itemsByCh.get(c.id) ?? [],
    }))

    if (!includeDrafts) {
      const cachedChapters: CachedKanjiChapter[] = kanji.map((c) => ({
        id: c.id,
        level: c.level,
        chapter: c.chapter,
        title: c.title,
        description: c.description,
        published: c.published,
      }))
      await db.transaction('rw', db.cached_kanji_chapters, db.cached_kanji_items, async () => {
        await db.cached_kanji_chapters.clear()
        await db.cached_kanji_items.clear()
        await db.cached_kanji_chapters.bulkPut(cachedChapters)
        await db.cached_kanji_items.bulkPut(cachedItems)
      })
    }
  }

  return { vocab, kanji }
}

// ================= ADMIN CRUD OPERATIONS =================

export async function upsertVocabChapter(input: {
  id?: string
  level: 'n5' | 'n4'
  chapter: number
  title: string
  description?: string
  published?: boolean
}): Promise<string> {
  const c = client()
  const payload = {
    level: input.level,
    chapter: input.chapter,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    published: input.published ?? true,
    updated_at: new Date().toISOString(),
  }
  if (input.id && !input.id.startsWith('builtin-')) {
    const { error } = await c.from('vocab_chapters').update(payload).eq('id', input.id)
    if (error) throw new Error(error.message)
    return input.id
  }
  const { data, error } = await c
    .from('vocab_chapters')
    .upsert(payload, { onConflict: 'level,chapter' })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function deleteVocabChapter(id: string): Promise<void> {
  const { error } = await client().from('vocab_chapters').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function upsertVocabWord(chapterId: string, word: VocabWord, sortOrder: number = 0): Promise<void> {
  const { error } = await client().from('vocab_words').upsert({
    id: word.id.trim(),
    chapter_id: chapterId,
    sort_order: sortOrder,
    kanji: word.kanji?.trim() || null,
    kana: word.kana.trim(),
    romaji: (word.romaji ?? '').trim(),
    meaning: word.meaning.trim(),
    type: word.type?.trim() || null,
    example_jp: word.exampleJp?.trim() || null,
    example_id: word.exampleId?.trim() || null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function deleteVocabWord(wordId: string): Promise<void> {
  const { error } = await client().from('vocab_words').delete().eq('id', wordId)
  if (error) throw new Error(error.message)
}

export async function bulkUpsertVocabWords(
  chapterId: string,
  words: VocabWord[],
  startSortOrder: number = 0,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const c = client()
  const BATCH_SIZE = 50
  const now = new Date().toISOString()
  let done = 0

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const chunk = words.slice(i, i + BATCH_SIZE).map((w, idx) => ({
      id: w.id.trim(),
      chapter_id: chapterId,
      sort_order: startSortOrder + i + idx,
      kanji: w.kanji?.trim() || null,
      kana: w.kana.trim(),
      romaji: (w.romaji ?? '').trim(),
      meaning: w.meaning.trim(),
      type: w.type?.trim() || null,
      example_jp: w.exampleJp?.trim() || null,
      example_id: w.exampleId?.trim() || null,
      updated_at: now,
    }))
    const { error } = await c.from('vocab_words').upsert(chunk)
    if (error) throw new Error(`Gagal pada batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
    done += chunk.length
    onProgress?.(done, words.length)
  }
  return done
}

export async function upsertKanjiChapter(input: {
  id?: string
  level: KanjiLevel
  chapter: number
  title: string
  description?: string
  published?: boolean
}): Promise<string> {
  const c = client()
  const payload = {
    level: input.level,
    chapter: input.chapter,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    published: input.published ?? true,
    updated_at: new Date().toISOString(),
  }
  if (input.id && !input.id.startsWith('builtin-')) {
    const { error } = await c.from('kanji_chapters').update(payload).eq('id', input.id)
    if (error) throw new Error(error.message)
    return input.id
  }
  const { data, error } = await c
    .from('kanji_chapters')
    .upsert(payload, { onConflict: 'level,chapter' })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function deleteKanjiChapter(id: string): Promise<void> {
  const { error } = await client().from('kanji_chapters').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function upsertKanjiItem(chapterId: string, item: KanjiItem, sortOrder: number = 0): Promise<void> {
  const { error } = await client().from('kanji_items').upsert({
    id: item.id.trim(),
    chapter_id: chapterId,
    sort_order: sortOrder,
    kanji: item.kanji.trim(),
    onyomi: item.onyomi.trim(),
    kunyomi: item.kunyomi.trim(),
    meaning: item.meaning.trim(),
    mnemonic: item.mnemonic?.trim() || null,
    image_url: item.image?.trim() || null,
    examples: item.examples ?? [],
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function deleteKanjiItem(kanjiId: string): Promise<void> {
  const { error } = await client().from('kanji_items').delete().eq('id', kanjiId)
  if (error) throw new Error(error.message)
}

export async function bulkUpsertKanjiItems(
  chapterId: string,
  items: KanjiItem[],
  startSortOrder: number = 0,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const c = client()
  const BATCH_SIZE = 50
  const now = new Date().toISOString()
  let done = 0

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE).map((item, idx) => ({
      id: item.id.trim(),
      chapter_id: chapterId,
      sort_order: startSortOrder + i + idx,
      kanji: item.kanji.trim(),
      onyomi: item.onyomi.trim(),
      kunyomi: item.kunyomi.trim(),
      meaning: item.meaning.trim(),
      mnemonic: item.mnemonic?.trim() || null,
      image_url: item.image?.trim() || null,
      examples: item.examples ?? [],
      updated_at: now,
    }))
    const { error } = await c.from('kanji_items').upsert(chunk)
    if (error) throw new Error(`Gagal pada batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
    done += chunk.length
    onProgress?.(done, items.length)
  }
  return done
}

/** Upload gambar ilustrasi Kanji ke Supabase Storage bucket `kanji-illustrations`. */
export async function uploadKanjiImage(file: File, kanjiId: string): Promise<string> {
  const c = client()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'webp'
  const safeId = kanjiId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const path = `${safeId}-${Date.now()}.${ext}`

  const { error } = await c.storage.from('kanji-illustrations').upload(path, file, {
    cacheControl: '31536000',
    upsert: true,
  })
  if (error) throw new Error(error.message)

  const { data } = c.storage.from('kanji-illustrations').getPublicUrl(path)
  return data.publicUrl
}

/** 1-Klik Seed data bawaan Kosakata ke Supabase. */
export async function seedDefaultVocabToDB(): Promise<number> {
  const chapters = getBuiltInVocabChapters()
  let count = 0
  for (const ch of chapters) {
    const chId = await upsertVocabChapter({
      level: ch.level,
      chapter: ch.chapter,
      title: ch.title,
      description: ch.description,
      published: true,
    })
    const rows = ch.words.map((w, idx) => ({
      id: w.id,
      chapter_id: chId,
      sort_order: idx,
      kanji: w.kanji || null,
      kana: w.kana,
      romaji: w.romaji,
      meaning: w.meaning,
      type: w.type || null,
      example_jp: w.exampleJp || null,
      example_id: w.exampleId || null,
      updated_at: new Date().toISOString(),
    }))
    if (rows.length > 0) {
      const { error } = await client().from('vocab_words').upsert(rows)
      if (error) throw new Error(error.message)
      count += rows.length
    }
  }
  return count
}

/** 1-Klik Seed data bawaan Kanji ke Supabase. */
export async function seedDefaultKanjiToDB(): Promise<number> {
  const chapters = [...N5_KANJI_CHAPTERS, ...N4_KANJI_CHAPTERS, ...JFT_KANJI_CHAPTERS]
  let count = 0
  for (const ch of chapters) {
    const chId = await upsertKanjiChapter({
      level: ch.level,
      chapter: ch.chapter,
      title: ch.title,
      description: ch.description,
      published: true,
    })
    const rows = ch.items.map((item, idx) => ({
      id: item.id,
      chapter_id: chId,
      sort_order: idx,
      kanji: item.kanji,
      onyomi: item.onyomi,
      kunyomi: item.kunyomi,
      meaning: item.meaning,
      mnemonic: item.mnemonic || null,
      image_url: item.image || null,
      examples: item.examples ?? [],
      updated_at: new Date().toISOString(),
    }))
    if (rows.length > 0) {
      const { error } = await client().from('kanji_items').upsert(rows)
      if (error) throw new Error(error.message)
      count += rows.length
    }
  }
  return count
}

// ================= CSV PARSERS =================

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Parse CSV/TSV Kosakata.
 * Format kolom: kana, romaji, meaning, [kanji], [type], [exampleJp], [exampleId]
 */
export function parseVocabCSV(raw: string, idPrefix: string): VocabWord[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const delimiter = lines[0].includes(';') ? ';' : ','
  const results: VocabWord[] = []

  for (let i = 0; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter)
    if (i === 0 && cols[0].toLowerCase() === 'kana') continue // lewati baris header
    const [kana = '', romaji = '', meaning = '', kanji = '', type = '', exampleJp = '', exampleId = ''] = cols
    if (!kana || !meaning) continue
    results.push({
      id: `${idPrefix}-${Date.now()}-${i}`,
      kana,
      romaji: romaji || kana,
      meaning,
      kanji: kanji || undefined,
      type: type || undefined,
      exampleJp: exampleJp || undefined,
      exampleId: exampleId || undefined,
    })
  }
  return results
}

/**
 * Parse CSV Kanji.
 * Format kolom: kanji, onyomi, kunyomi, meaning, [mnemonic]
 */
export function parseKanjiCSV(raw: string, idPrefix: string): KanjiItem[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const delimiter = lines[0].includes(';') ? ';' : ','
  const results: KanjiItem[] = []

  for (let i = 0; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter)
    if (i === 0 && cols[0].toLowerCase() === 'kanji') continue // lewati baris header
    const [kanji = '', onyomi = '', kunyomi = '', meaning = '', mnemonic = ''] = cols
    if (!kanji || !meaning) continue
    results.push({
      id: `${idPrefix}-${Date.now()}-${i}`,
      kanji,
      onyomi: onyomi || '-',
      kunyomi: kunyomi || '-',
      meaning,
      mnemonic: mnemonic || undefined,
      examples: [],
    })
  }
  return results
}
