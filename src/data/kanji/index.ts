import { N5_KANJI_CHAPTERS } from './n5'
import { N4_KANJI_CHAPTERS } from './n4'
import { JFT_KANJI_CHAPTERS } from './jft'
import type { KanjiChapter, KanjiItem, KanjiLevel } from './types'

export * from './types'
export { N5_KANJI_CHAPTERS, N4_KANJI_CHAPTERS, JFT_KANJI_CHAPTERS }

export const ALL_KANJI_CHAPTERS: KanjiChapter[] = [
  ...N5_KANJI_CHAPTERS,
  ...N4_KANJI_CHAPTERS,
  ...JFT_KANJI_CHAPTERS,
]

export function getKanjiChaptersByLevel(level: KanjiLevel): KanjiChapter[] {
  if (level === 'n4') return N4_KANJI_CHAPTERS
  if (level === 'jft') return JFT_KANJI_CHAPTERS
  return N5_KANJI_CHAPTERS
}

export function getKanjiChapter(level: KanjiLevel, chapterNum: number): KanjiChapter | undefined {
  const list = getKanjiChaptersByLevel(level)
  return list.find((c) => c.chapter === chapterNum)
}

export function getAllKanji(): KanjiItem[] {
  return ALL_KANJI_CHAPTERS.flatMap((c) => c.items)
}

export function formatKanjiLevelLabel(level: KanjiLevel | string): string {
  const norm = level.toLowerCase()
  if (norm === 'n4') return 'JLPT N4'
  if (norm === 'jft') return 'JFT'
  return 'JLPT N5'
}
