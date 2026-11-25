import { describe, it, expect, beforeEach } from 'vitest'
import { useVocabStore } from '../store/useVocabStore'
import { getChapter, getChaptersByLevel, getAllWords } from '../data/vocab'
import { generateQuizOptions } from './vocabQuiz'

describe('Vocabulary Data & Store', () => {
  beforeEach(() => {
    useVocabStore.setState({
      stats: {},
      showRomajiFront: false,
    })
  })

  it('loads chapters for N5 and N4 correctly', () => {
    const n5Chapters = getChaptersByLevel('n5')
    expect(n5Chapters.length).toBeGreaterThan(0)
    expect(n5Chapters[0].chapter).toBe(1)
    expect(n5Chapters[0].words.length).toBeGreaterThan(0)

    const n4Chapters = getChaptersByLevel('n4')
    expect(n4Chapters.length).toBeGreaterThan(0)
    expect(n4Chapters[0].chapter).toBe(26)

    const ch1 = getChapter('n5', 1)
    expect(ch1).toBeDefined()
    expect(ch1?.title).toContain('Bab 1')

    const all = getAllWords()
    expect(all.length).toBeGreaterThan(0)
  })

  it('records correct answer and advances SRS box only when due in useVocabStore', () => {
    const wordId = 'n5-b01-01'

    // First correct answer -> box 2
    useVocabStore.getState().recordAnswer(wordId, true)
    let stat = useVocabStore.getState().getWordStat(wordId)
    expect(stat).toBeDefined()
    expect(stat?.ok).toBe(1)
    expect(stat?.no).toBe(0)
    expect(stat?.box).toBe(2)

    // Immediate second correct answer (not yet due) -> stays in box 2
    useVocabStore.getState().recordAnswer(wordId, true)
    stat = useVocabStore.getState().getWordStat(wordId)
    expect(stat?.ok).toBe(2)
    expect(stat?.box).toBe(2)

    // Simulate 2 days passing (now due for box 2 -> 1 day interval) -> advances to box 3
    useVocabStore.setState((s) => ({
      stats: {
        ...s.stats,
        [wordId]: { ...s.stats[wordId]!, lastReviewedAt: Date.now() - 2 * 24 * 60 * 60 * 1000 },
      },
    }))
    useVocabStore.getState().recordAnswer(wordId, true)
    stat = useVocabStore.getState().getWordStat(wordId)
    expect(stat?.ok).toBe(3)
    expect(stat?.box).toBe(3)

    // Incorrect answer -> drops to box 1 immediately
    useVocabStore.getState().recordAnswer(wordId, false)
    stat = useVocabStore.getState().getWordStat(wordId)
    expect(stat?.no).toBe(1)
    expect(stat?.box).toBe(1)
  })

  it('calculates chapter stats accurately', () => {
    const ch = getChapter('n5', 1)!
    const w1 = ch.words[0]
    const w2 = ch.words[1]

    useVocabStore.getState().recordAnswer(w1.id, true)
    useVocabStore.getState().recordAnswer(w2.id, false)

    const stats = useVocabStore.getState().getChapterStats(ch.words)
    expect(stats.total).toBe(ch.words.length)
    expect(stats.learned).toBe(1)
    expect(stats.okCount).toBe(1)
    expect(stats.noCount).toBe(1)
    expect(stats.accuracy).toBe(50)
  })

  it('toggles showRomajiFront', () => {
    expect(useVocabStore.getState().showRomajiFront).toBe(false)
    useVocabStore.getState().toggleShowRomajiFront()
    expect(useVocabStore.getState().showRomajiFront).toBe(true)
  })

  it('generates 4 unique quiz options including target word', () => {
    const ch = getChapter('n5', 1)!
    const target = ch.words[0]
    const options = generateQuizOptions(target, ch.words, 4)

    expect(options.length).toBe(4)
    expect(options.some((o) => o.id === target.id)).toBe(true)

    const uniqueMeanings = new Set(options.map((o) => o.meaning.trim().toLowerCase()))
    expect(uniqueMeanings.size).toBe(4)
  })
})
