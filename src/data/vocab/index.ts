import { N5_CHAPTERS } from './n5'
import { N4_CHAPTERS } from './n4'
import type { VocabChapter, VocabWord } from './types'

export * from './types'
export { N5_CHAPTERS } from './n5'
export { N4_CHAPTERS } from './n4'

export function getChaptersByLevel(level: 'n5' | 'n4'): VocabChapter[] {
  return level.toLowerCase() === 'n4' ? N4_CHAPTERS : N5_CHAPTERS
}

export function getChapter(level: 'n5' | 'n4', chapterNum: number): VocabChapter | undefined {
  const chapters = getChaptersByLevel(level)
  return chapters.find((c) => c.chapter === chapterNum)
}

export function getAllWords(level?: 'n5' | 'n4'): VocabWord[] {
  if (level) {
    return getChaptersByLevel(level).flatMap((c) => c.words)
  }
  return [...N5_CHAPTERS.flatMap((c) => c.words), ...N4_CHAPTERS.flatMap((c) => c.words)]
}
