export interface ProgressRow {
  ok: number
  no: number
  box: number
}

export type Level = 'none' | 'weak' | 'learning' | 'almost' | 'mastered'

/** 71 single + 33 yoon per aksara */
export const TOTAL_CARDS = 104

/**
 * Kategori hafalan per huruf (dokumen bagian 4.5):
 * - none: belum dipelajari
 * - weak: akurasi di bawah 60%
 * - mastered: box 4-5 dan akurasi minimal 80%
 * - almost: box 3
 * - learning: sisanya (box 1-2, atau box 4-5 dengan akurasi 60-79%)
 */
export function masteryLevel(row: ProgressRow | undefined): Level {
  if (!row) return 'none'
  const total = row.ok + row.no
  if (total === 0) return 'none'
  const acc = row.ok / total
  if (acc < 0.6) return 'weak'
  if (row.box >= 4 && acc >= 0.8) return 'mastered'
  if (row.box === 3) return 'almost'
  return 'learning'
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

/** Streak hari beruntun (zona waktu lokal). Boleh dimulai dari hari ini atau kemarin. */
export function streak(dates: string[], now: Date = new Date()): number {
  const days = new Set(dates.map((s) => dayKey(new Date(s))))
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let n = 0
  while (days.has(dayKey(cursor))) {
    n++
    cursor.setDate(cursor.getDate() - 1)
  }
  return n
}

export const percent = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0)
