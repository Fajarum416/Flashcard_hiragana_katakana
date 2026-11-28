/**
 * Adaptive Tailwind typography helpers for flashcard and admin grid cards.
 * Returns full Tailwind class literals so Tailwind v4 CSS scanning picks up every class.
 */

function len(text?: string | null): number {
  return (text ?? '').trim().length
}

/**
 * Primary Japanese text size on the front of the student vocab flashcard.
 */
export function getVocabPrimarySize(text?: string | null): string {
  const n = len(text)
  if (n <= 4) return 'text-5xl sm:text-7xl md:text-8xl'
  if (n <= 8) return 'text-4xl sm:text-5xl md:text-6xl'
  if (n <= 13) return 'text-2xl sm:text-4xl md:text-5xl'
  if (n <= 20) return 'text-xl sm:text-3xl md:text-4xl'
  return 'text-lg sm:text-2xl md:text-3xl'
}

/**
 * Secondary reading text size (furigana on front, kana + romaji on back) in student vocab flashcard.
 */
export function getVocabSubSize(text?: string | null): string {
  const n = len(text)
  if (n <= 8) return 'text-2xl sm:text-3xl md:text-4xl'
  if (n <= 16) return 'text-lg sm:text-2xl md:text-3xl'
  return 'text-base sm:text-xl md:text-2xl'
}

/**
 * Primary Japanese word size on the back of the student vocab flashcard.
 */
export function getVocabBackPrimarySize(text?: string | null): string {
  const n = len(text)
  if (n <= 6) return 'text-3xl sm:text-4xl md:text-5xl'
  if (n <= 12) return 'text-2xl sm:text-3xl md:text-4xl'
  return 'text-xl sm:text-2xl md:text-3xl'
}

/**
 * Meaning text size on the back of student vocab & kanji flashcards.
 */
export function getVocabMeaningSize(text?: string | null): string {
  const n = len(text)
  if (n <= 16) return 'text-2xl sm:text-3xl md:text-4xl'
  if (n <= 32) return 'text-xl sm:text-2xl md:text-3xl'
  if (n <= 55) return 'text-lg sm:text-xl md:text-2xl'
  return 'text-base sm:text-lg md:text-xl'
}

/**
 * Primary Japanese text size inside the compact AdminVocab flip card (h-48).
 */
export function getAdminVocabPrimarySize(text?: string | null): string {
  const n = len(text)
  if (n <= 5) return 'text-2xl sm:text-3xl'
  if (n <= 10) return 'text-xl sm:text-2xl'
  if (n <= 16) return 'text-base sm:text-lg'
  return 'text-sm sm:text-base'
}

/**
 * Secondary furigana text size inside the compact AdminVocab flip card.
 */
export function getAdminVocabSubSize(text?: string | null): string {
  const n = len(text)
  if (n <= 10) return 'text-sm'
  return 'text-xs'
}

/**
 * Meaning text size on the back of AdminVocab and AdminKanji flip cards.
 */
export function getAdminMeaningSize(text?: string | null): string {
  const n = len(text)
  if (n <= 20) return 'text-base sm:text-lg'
  if (n <= 40) return 'text-sm sm:text-base'
  return 'text-xs sm:text-sm'
}
