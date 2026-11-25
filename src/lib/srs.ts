export interface CardStat {
  ok: number
  no: number
  box?: number
  lastReviewedAt?: number
}

/** Interval peninjauan dalam milidetik untuk tiap kotak Leitner (Box 1-5). */
export const LEITNER_INTERVALS_MS: Record<number, number> = {
  1: 0, // Segera / hari yang sama
  2: 24 * 60 * 60 * 1000, // 1 hari
  3: 3 * 24 * 60 * 60 * 1000, // 3 hari
  4: 7 * 24 * 60 * 60 * 1000, // 7 hari
  5: 14 * 24 * 60 * 60 * 1000, // 14 hari (sudah sangat hafal)
}

/** Bobot dasar kemunculan berdasarkan Box (Box rendah = bobot tinggi). */
export const BOX_WEIGHTS: Record<number, number> = {
  1: 6,
  2: 4,
  3: 3,
  4: 2,
  5: 1,
}

export const MASTERY_LABELS: Record<number, string> = {
  1: 'Perlu Ulang',
  2: 'Masih Belajar',
  3: 'Hampir Hafal',
  4: 'Lancar',
  5: 'Hafal Kuat',
}

/** Mengembalikan label tingkat hafalan yang ramah pengguna berdasarkan nilai box (1-5). */
export function getMasteryLabel(box?: number): string {
  if (box === undefined) return 'Baru'
  const level = Math.max(1, Math.min(5, box))
  return MASTERY_LABELS[level] ?? 'Perlu Ulang'
}

/** Mendapatkan Box saat ini (1 sampai 5, default 1). */
export function getBox(stat?: CardStat): number {
  if (!stat || !stat.box) return 1
  return Math.max(1, Math.min(5, stat.box))
}

/** Menghitung Box baru setelah menjawab: benar naik 1 (maks 5), salah turun ke 1. */
export function nextBox(currentBox: number, isCorrect: boolean): number {
  if (!isCorrect) return 1
  return Math.min(5, currentBox + 1)
}

/** Mengecek apakah kartu sudah jatuh tempo untuk ditinjau kembali (due). */
export function isDue(stat?: CardStat, now: number = Date.now()): boolean {
  if (!stat || !stat.lastReviewedAt) return true
  const box = getBox(stat)
  const interval = LEITNER_INTERVALS_MS[box] ?? 0
  return stat.lastReviewedAt + interval <= now
}

/**
 * Menghitung bobot prioritas kartu.
 * Kartu lemah (Box 1-2) atau yang sudah jatuh tempo (due) mendapat bobot lebih tinggi.
 */
export function getCardPriority(stat?: CardStat, now: number = Date.now()): number {
  if (!stat) return 10 // Kartu baru belum pernah dicoba = prioritas tinggi
  const box = getBox(stat)
  const baseWeight = BOX_WEIGHTS[box] ?? 1
  const due = isDue(stat, now)
  const errorRate = stat.no / Math.max(1, stat.ok + stat.no)
  
  // Pengali jika due dan jika sering salah
  let priority = baseWeight
  if (due) priority *= 2
  if (errorRate >= 0.4) priority += 2
  
  return priority
}

/**
 * Mengurutkan kartu untuk sesi latihan dengan algoritma Leitner SRS:
 * Kartu dipilah berdasarkan urgensi (kartu jatuh tempo / box rendah didahulukan,
 * dengan sedikit jitter acak agar urutan tidak kaku).
 */
export function sortDeckBySRS<T extends { id?: string }>(
  cards: T[],
  stats: Record<string, CardStat>,
  now: number = Date.now(),
  rng: () => number = Math.random
): T[] {
  const weighted = cards.map((card) => {
    const stat = card.id ? stats[card.id] : undefined
    const priority = getCardPriority(stat, now)
    // Jitter acak 0-2 agar variatif namun tetap berbobot
    const score = priority + rng() * 2
    return { card, score }
  })

  // Urutkan dari skor tertinggi ke terendah
  weighted.sort((a, b) => b.score - a.score)
  return weighted.map((w) => w.card)
}
