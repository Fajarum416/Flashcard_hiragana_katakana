import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COL_IDS, YOON_IDS, type Script } from '../data/kana'
import type { Mode, Selection } from '../lib/deck'
import type { SelectionState } from '../lib/settings'
import { nextBox, type CardStat } from '../lib/srs'

export type Stat = CardStat

interface Actions {
  setScript: (s: Script) => void
  setMode: (m: Mode) => void
  setComp: (c: boolean) => void
  setSrsMode: (enabled: boolean) => void
  toggleCol: (script: Script, id: string) => void
  toggleYoon: (script: Script, id: string) => void
  selectAll: (script: Script) => void
  clearAll: (script: Script) => void
  useDefault: (script: Script) => void
  record: (id: string, correct: boolean) => void
  /** Mengganti seluruh stats dengan data dari server. */
  setStats: (stats: Record<string, Stat>) => void
  /** Menerapkan pilihan dari server. */
  applySelection: (s: SelectionState) => void
}

export type AppState = Selection & { srsMode: boolean; stats: Record<string, Stat> } & Actions

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

/** Kunci 'kana-v2' dan bentuk state sama dengan prototipe, jadi data lama tetap terbaca. */
export const useSelection = create<AppState>()(
  persist(
    (set, get) => {
      const yoonActive = () => get().comp && get().mode === 'char'
      const patch = (script: Script, yoon: string[], gojuon: string[]) =>
        yoonActive()
          ? set((s) => ({ selY: { ...s.selY, [script]: yoon } }))
          : set((s) => ({ sel: { ...s.sel, [script]: gojuon } }))
      return {
        script: 'hiragana',
        mode: 'char',
        comp: false,
        srsMode: true,
        sel: { hiragana: ['a'], katakana: ['a'] },
        selY: { hiragana: ['ki'], katakana: ['ki'] },
        stats: {},
        setScript: (script) => set({ script }),
        setMode: (mode) => set({ mode }),
        setComp: (comp) => set({ comp }),
        setSrsMode: (srsMode) => set({ srsMode }),
        toggleCol: (script, id) => set((s) => ({ sel: { ...s.sel, [script]: toggle(s.sel[script], id) } })),
        toggleYoon: (script, id) => set((s) => ({ selY: { ...s.selY, [script]: toggle(s.selY[script], id) } })),
        selectAll: (script) => patch(script, [...YOON_IDS], [...COL_IDS]),
        clearAll: (script) => patch(script, [], []),
        useDefault: (script) => patch(script, ['ki'], ['a']),
        setStats: (stats) => set({ stats }),
        applySelection: (s) => set({ ...s }),
        record: (id, correct) =>
          set((s) => {
            const cur = s.stats[id] ?? { ok: 0, no: 0, box: 1 }
            const curBox = cur.box ?? 1
            const updatedBox = nextBox(curBox, correct)
            const next: Stat = {
              ok: correct ? cur.ok + 1 : cur.ok,
              no: correct ? cur.no : cur.no + 1,
              box: updatedBox,
              lastReviewedAt: Date.now(),
            }
            return { stats: { ...s.stats, [id]: next } }
          }),
      }
    },
    {
      name: 'kana-v2',
      partialize: (s) => ({
        script: s.script,
        mode: s.mode,
        comp: s.comp,
        srsMode: s.srsMode,
        sel: s.sel,
        selY: s.selY,
        stats: s.stats,
      }),
    },
  ),
)
