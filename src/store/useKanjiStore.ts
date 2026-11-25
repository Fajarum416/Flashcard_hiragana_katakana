import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getBox, isDue, nextBox, type CardStat } from '../lib/srs'
import type { KanjiItem } from '../data/kanji/types'

export interface KanjiProgressStore {
  stats: Record<string, CardStat> // key: kanjiId
  recordAnswer: (kanjiId: string, isCorrect: boolean) => void
  getKanjiStat: (kanjiId: string) => CardStat | undefined
  getChapterStats: (items: KanjiItem[]) => {
    total: number
    learned: number
    mastered: number
    okCount: number
    noCount: number
    accuracy: number
  }
  resetChapterStats: (items: KanjiItem[]) => void
  resetOnLogout: () => void
  setStats: (stats: Record<string, CardStat>) => void
  mergeStats: (incoming: Record<string, CardStat>) => void
}

export const useKanjiStore = create<KanjiProgressStore>()(
  persist(
    (set, get) => ({
      stats: {},

      recordAnswer: (kanjiId: string, isCorrect: boolean) => {
        set((state) => {
          const prev = state.stats[kanjiId]
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
              [kanjiId]: updated,
            },
          }
        })
      },

      getKanjiStat: (kanjiId: string) => {
        return get().stats[kanjiId]
      },

      getChapterStats: (items: KanjiItem[]) => {
        const stats = get().stats
        let okCount = 0
        let noCount = 0
        let learned = 0
        let mastered = 0

        for (const item of items) {
          const s = stats[item.id]
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
          total: items.length,
          learned,
          mastered,
          okCount,
          noCount,
          accuracy,
        }
      },

      resetChapterStats: (items: KanjiItem[]) => {
        set((state) => {
          const newStats = { ...state.stats }
          for (const item of items) {
            delete newStats[item.id]
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
      name: 'kanji_progress_storage_v1',
    }
  )
)
