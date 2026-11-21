import { describe, expect, it } from 'vitest'
import { getBox, getCardPriority, isDue, nextBox, sortDeckBySRS } from './srs'

describe('Leitner SRS logic', () => {
  it('default box adalah 1', () => {
    expect(getBox(undefined)).toBe(1)
    expect(getBox({ ok: 0, no: 0 })).toBe(1)
    expect(getBox({ ok: 2, no: 1, box: 3 })).toBe(3)
  })

  it('nextBox naik jika benar dan kembali ke 1 jika salah', () => {
    expect(nextBox(1, true)).toBe(2)
    expect(nextBox(4, true)).toBe(5)
    expect(nextBox(5, true)).toBe(5) // Max 5

    expect(nextBox(5, false)).toBe(1) // Reset ke 1 saat salah
    expect(nextBox(3, false)).toBe(1)
  })

  it('isDue mendeteksi kartu yang jatuh tempo', () => {
    const now = 1000000000000
    // Belum pernah review = due
    expect(isDue(undefined, now)).toBe(true)
    expect(isDue({ ok: 1, no: 0 }, now)).toBe(true)

    // Box 2 (interval 1 hari) baru direview 1 jam lalu = belum due
    const reviewedRecently = now - 3600 * 1000
    expect(isDue({ ok: 2, no: 0, box: 2, lastReviewedAt: reviewedRecently }, now)).toBe(false)

    // Box 2 direview 2 hari lalu = sudah due
    const reviewedLongAgo = now - 2 * 24 * 3600 * 1000
    expect(isDue({ ok: 2, no: 0, box: 2, lastReviewedAt: reviewedLongAgo }, now)).toBe(true)
  })

  it('getCardPriority memberi bobot lebih tinggi pada kartu baru/lemah/due', () => {
    const now = 1000000000000
    const newCardPrio = getCardPriority(undefined, now)
    const box5NotDuePrio = getCardPriority({ ok: 10, no: 0, box: 5, lastReviewedAt: now - 1000 }, now)

    expect(newCardPrio).toBeGreaterThan(box5NotDuePrio)
  })

  it('sortDeckBySRS memprioritaskan kartu dengan urgensi tinggi', () => {
    const now = 1000000000000
    const cards = [
      { id: 'hiragana:あ' }, // Box 5, not due (hafal)
      { id: 'hiragana:い' }, // Box 1, due (lemah)
    ]
    const stats = {
      'hiragana:あ': { ok: 10, no: 0, box: 5, lastReviewedAt: now - 1000 },
      'hiragana:い': { ok: 1, no: 3, box: 1, lastReviewedAt: now - 3600 * 1000 },
    }

    // Gunakan rng statis agar deterministic
    const sorted = sortDeckBySRS(cards, stats, now, () => 0)
    expect(sorted[0].id).toBe('hiragana:い')
    expect(sorted[1].id).toBe('hiragana:あ')
  })
})
