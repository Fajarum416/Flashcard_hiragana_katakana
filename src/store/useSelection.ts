import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COL_IDS, YOON_IDS, type Script } from '../data/kana'
import type { Mode, Selection } from '../lib/deck'

export interface Stat {
  ok: number
  no: number
}

interface Actions {
  setScript: (s: Script) => void
  setMode: (m: Mode) => void
  setComp: (c: boolean) => void
  toggleCol: (script: Script, id: string) => void
  toggleYoon: (script: Script, id: string) => void
  selectAll: (script: Script) => void
  clearAll: (script: Script) => void
  useDefault: (script: Script) => void
  record: (id: string, correct: boolean) => void
}

export type AppState = Selection & { stats: Record<string, Stat> } & Actions

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
        sel: { hiragana: ['a'], katakana: ['a'] },
        selY: { hiragana: ['ki'], katakana: ['ki'] },
        stats: {},
        setScript: (script) => set({ script }),
        setMode: (mode) => set({ mode }),
        setComp: (comp) => set({ comp }),
        toggleCol: (script, id) => set((s) => ({ sel: { ...s.sel, [script]: toggle(s.sel[script], id) } })),
        toggleYoon: (script, id) => set((s) => ({ selY: { ...s.selY, [script]: toggle(s.selY[script], id) } })),
        selectAll: (script) => patch(script, [...YOON_IDS], [...COL_IDS]),
        clearAll: (script) => patch(script, [], []),
        useDefault: (script) => patch(script, ['ki'], ['a']),
        record: (id, correct) =>
          set((s) => {
            const cur = s.stats[id] ?? { ok: 0, no: 0 }
            const next = correct ? { ...cur, ok: cur.ok + 1 } : { ...cur, no: cur.no + 1 }
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
        sel: s.sel,
        selY: s.selY,
        stats: s.stats,
      }),
    },
  ),
)
