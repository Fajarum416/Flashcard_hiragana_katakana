import type { VocabWord } from '../data/vocab/types'

/**
 * Menghasilkan daftar opsi pilihan ganda (1 jawaban benar + pengecoh unik)
 * yang sudah diacak posisinya.
 */
export function generateQuizOptions(
  target: VocabWord,
  pool: VocabWord[],
  count: number = 4,
  rng: () => number = Math.random
): VocabWord[] {
  const distractors: VocabWord[] = []
  const seenMeanings = new Set<string>([target.meaning.trim().toLowerCase()])

  const candidates = pool.filter((w) => w.id !== target.id)
  // Acak kandidat pengecoh (Fisher-Yates)
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
  // Acak urutan akhir opsi jawaban
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }

  return options
}
