import type { KanjiItem } from '../data/kanji/types'

/**
 * Menghasilkan daftar opsi pilihan ganda Kanji (1 jawaban benar + pengecoh unik)
 * yang sudah diacak posisinya.
 */
export function generateKanjiQuizOptions(
  target: KanjiItem,
  pool: KanjiItem[],
  count: number = 4,
  rng: () => number = Math.random
): KanjiItem[] {
  const distractors: KanjiItem[] = []
  const seenMeanings = new Set<string>([target.meaning.trim().toLowerCase()])

  const candidates = pool.filter((k) => k.id !== target.id)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  for (const item of candidates) {
    if (distractors.length >= count - 1) break
    const normMeaning = item.meaning.trim().toLowerCase()
    if (!seenMeanings.has(normMeaning)) {
      seenMeanings.add(normMeaning)
      distractors.push(item)
    }
  }

  const options = [target, ...distractors]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }

  return options
}
