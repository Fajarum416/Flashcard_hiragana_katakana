import { create } from 'zustand'
import {
  fetchRemoteContent,
  getBuiltInKanjiChapters,
  getBuiltInVocabChapters,
  loadCachedContent,
  type ManagedKanjiChapter,
  type ManagedVocabChapter,
} from '../lib/content'
import type { KanjiItem, KanjiLevel } from '../data/kanji/types'
import type { VocabWord } from '../data/vocab/types'

interface ContentState {
  vocabChapters: ManagedVocabChapter[]
  kanjiChapters: ManagedKanjiChapter[]
  loaded: boolean
  init: () => Promise<void>
  refresh: (includeDrafts?: boolean) => Promise<void>
  getVocabByLevel: (level: 'n5' | 'n4') => ManagedVocabChapter[]
  getVocabChapter: (level: 'n5' | 'n4', chapter: number) => ManagedVocabChapter | undefined
  getAllVocabWords: () => VocabWord[]
  getKanjiByLevel: (level: KanjiLevel) => ManagedKanjiChapter[]
  getKanjiChapter: (level: KanjiLevel, chapter: number) => ManagedKanjiChapter | undefined
  getAllKanjiItems: () => KanjiItem[]
}

export const useContentStore = create<ContentState>((set, get) => ({
  vocabChapters: getBuiltInVocabChapters(),
  kanjiChapters: getBuiltInKanjiChapters(),
  loaded: false,

  init: async () => {
    // 1. Muat cache Dexie terlebih dahulu agar instan (offline-ready)
    const cached = await loadCachedContent()
    if (cached.vocab || cached.kanji) {
      set((s) => ({
        vocabChapters: cached.vocab ?? s.vocabChapters,
        kanjiChapters: cached.kanji ?? s.kanjiChapters,
      }))
    }
    // 2. Sync dari Supabase jika online
    await get().refresh(false)
  },

  refresh: async (includeDrafts = false) => {
    try {
      const remote = await fetchRemoteContent(includeDrafts)
      set((s) => ({
        vocabChapters: remote.vocab ?? s.vocabChapters,
        kanjiChapters: remote.kanji ?? s.kanjiChapters,
        loaded: true,
      }))
    } catch {
      set({ loaded: true })
    }
  },

  getVocabByLevel: (level) => get().vocabChapters.filter((c) => c.level === level),

  getVocabChapter: (level, chapter) =>
    get().vocabChapters.find((c) => c.level === level && c.chapter === chapter),

  getAllVocabWords: () => get().vocabChapters.flatMap((c) => c.words),

  getKanjiByLevel: (level) => get().kanjiChapters.filter((c) => c.level === level),

  getKanjiChapter: (level, chapter) =>
    get().kanjiChapters.find((c) => c.level === level && c.chapter === chapter),

  getAllKanjiItems: () => get().kanjiChapters.flatMap((c) => c.items),
}))
