import { describe, it, expect, beforeEach } from 'vitest'
import { useKanjiStore } from '../store/useKanjiStore'
import { getKanjiChapter, getKanjiChaptersByLevel, getAllKanji } from '../data/kanji'
import { generateKanjiQuizOptions } from './kanjiQuiz'

describe('Kanji Data, Store & Quiz', () => {
  beforeEach(() => {
    useKanjiStore.setState({
      stats: {},
    })
  })

  it('loads chapters for N5, N4, and JFT correctly', () => {
    const n5 = getKanjiChaptersByLevel('n5')
    const n4 = getKanjiChaptersByLevel('n4')
    const jft = getKanjiChaptersByLevel('jft')

    expect(n5.length).toBeGreaterThan(0)
    expect(n4.length).toBeGreaterThan(0)
    expect(jft.length).toBeGreaterThan(0)

    const ch1 = getKanjiChapter('n5', 1)
    expect(ch1).toBeDefined()
    expect(ch1?.items.length).toBeGreaterThan(0)

    const all = getAllKanji()
    expect(all.length).toBeGreaterThanOrEqual(70)
  })

  it('advances SRS box only when due and drops to box 1 on mistake', () => {
    const kanjiId = 'n5-k01-01'

    // First correct -> box 2
    useKanjiStore.getState().recordAnswer(kanjiId, true)
    let stat = useKanjiStore.getState().getKanjiStat(kanjiId)
    expect(stat?.ok).toBe(1)
    expect(stat?.box).toBe(2)

    // Immediate second correct (not due) -> stays box 2
    useKanjiStore.getState().recordAnswer(kanjiId, true)
    stat = useKanjiStore.getState().getKanjiStat(kanjiId)
    expect(stat?.ok).toBe(2)
    expect(stat?.box).toBe(2)

    // After 2 days (due for box 2) -> advances to box 3
    useKanjiStore.setState((s) => ({
      stats: {
        ...s.stats,
        [kanjiId]: { ...s.stats[kanjiId]!, lastReviewedAt: Date.now() - 2 * 24 * 60 * 60 * 1000 },
      },
    }))
    useKanjiStore.getState().recordAnswer(kanjiId, true)
    stat = useKanjiStore.getState().getKanjiStat(kanjiId)
    expect(stat?.ok).toBe(3)
    expect(stat?.box).toBe(3)

    // Wrong answer -> drops to box 1
    useKanjiStore.getState().recordAnswer(kanjiId, false)
    stat = useKanjiStore.getState().getKanjiStat(kanjiId)
    expect(stat?.no).toBe(1)
    expect(stat?.box).toBe(1)
  })

  it('calculates chapter stats accurately', () => {
    const ch = getKanjiChapter('jft', 1)!
    useKanjiStore.getState().recordAnswer(ch.items[0].id, true)
    useKanjiStore.getState().recordAnswer(ch.items[1].id, false)

    const stats = useKanjiStore.getState().getChapterStats(ch.items)
    expect(stats.total).toBe(ch.items.length)
    expect(stats.learned).toBe(1)
    expect(stats.okCount).toBe(1)
    expect(stats.noCount).toBe(1)
    expect(stats.accuracy).toBe(50)
  })

  it('generates 4 unique quiz options including target kanji', () => {
    const ch = getKanjiChapter('n4', 1)!
    const target = ch.items[0]
    const options = generateKanjiQuizOptions(target, ch.items, 4)

    expect(options.length).toBe(4)
    expect(options.some((o) => o.id === target.id)).toBe(true)

    const uniqueMeanings = new Set(options.map((o) => o.meaning.trim().toLowerCase()))
    expect(uniqueMeanings.size).toBe(4)
  })
})
