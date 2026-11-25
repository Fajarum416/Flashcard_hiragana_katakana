import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getBox, isDue, nextBox, type CardStat } from '../lib/srs'
import type { VocabWord } from '../data/vocab/types'

export interface VocabProgressStore {
  stats: Record<string, CardStat> // key: wordId
  showRomajiFront: boolean
  toggleShowRomajiFront: () => void
  recordAnswer: (wordId: string, isCorrect: boolean) => void
  getWordStat: (wordId: string) => CardStat | undefined
  getChapterStats: (words: VocabWord[]) => {
    total: number
    learned: number
    mastered: number
    okCount: number
    noCount: number
    accuracy: number
  }
  resetChapterStats: (words: VocabWord[]) => void
  resetOnLogout: () => void
  setStats: (stats: Record<string, CardStat>) => void
  mergeStats: (incoming: Record<string, CardStat>) => void
}

export const useVocabStore = create<VocabProgressStore>()(
  persist(
    (set, get) => ({
      stats: {},
      showRomajiFront: false,

      toggleShowRomajiFront: () => {
        set((state) => ({ showRomajiFront: !state.showRomajiFront }))
      },

      recordAnswer: (wordId: string, isCorrect: boolean) => {
        set((state) => {
          const prev = state.stats[wordId]
          const currentBox = getBox(prev)
          const now = Date.now()
          // Naik box hanya jika kartu salah (reset ke Box 1) atau sudah jatuh tempo (isDue)
          const canUpdateSRS = !isCorrect || isDue(prev, now)
          const newBox = canUpdateSRS ? nextBox(currentBox, isCorrect) : currentBox

          const updated: CardStat = {
            ok: (prev?.ok ?? 0) + (isCorrect ? 1 : 0),
            no: (prev?.no ?? 0) + (isCorrect ? 0 : 1),
            box: newBox,
            lastReviewedAt: canUpdateSRS ? now : prev?.lastReviewedAt,
          }

          return {
            stats: {
              ...state.stats,
              [wordId]: updated,
            },
          }
        })
      },

      getWordStat: (wordId: string) => {
        return get().stats[wordId]
      },

      getChapterStats: (words: VocabWord[]) => {
        const stats = get().stats
        let okCount = 0
        let noCount = 0
        let learned = 0
        let mastered = 0

        for (const w of words) {
          const s = stats[w.id]
          if (s) {
            okCount += s.ok
            noCount += s.no
            if (s.ok > 0) learned++
            if ((s.box ?? 1) >= 4) mastered++
          }
        }

        const totalAnswered = okCount + noCount
        const accuracy = totalAnswered > 0 ? Math.round((okCount / totalAnswered) * 100) : 0

        return {
          total: words.length,
          learned,
          mastered,
          okCount,
          noCount,
          accuracy,
        }
      },

      resetChapterStats: (words: VocabWord[]) => {
        set((state) => {
          const newStats = { ...state.stats }
          for (const w of words) {
            delete newStats[w.id]
          }
          return { stats: newStats }
        })
      },

      resetOnLogout: () => {
        set({ stats: {} })
      },

      setStats: (stats: Record<string, CardStat>) => {
        set({ stats })
      },

      mergeStats: (incoming: Record<string, CardStat>) => {
        set((state) => {
          const updated = { ...state.stats }
          for (const [id, stat] of Object.entries(incoming)) {
            const existing = updated[id]
            if (!existing) {
              updated[id] = stat
            } else {
              updated[id] = {
                ok: Math.max(existing.ok, stat.ok),
                no: Math.max(existing.no, stat.no),
                box: Math.max(existing.box ?? 1, stat.box ?? 1),
                lastReviewedAt: Math.max(existing.lastReviewedAt ?? 0, stat.lastReviewedAt ?? 0) || undefined,
              }
            }
          }
          return { stats: updated }
        })
      },
    }),
    {
      name: 'vocab_progress_storage_v1',
    }
  )
)
