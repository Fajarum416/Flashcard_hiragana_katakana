import { useEffect, useRef, useState } from 'react'
import { SlidingTabs } from '../../components/Segmented'
import { AdminFlipCard } from '../../components/admin/AdminFlipCard'
import { FieldLabel, SlideOverDrawer, type DrawerStep } from '../../components/admin/SlideOverDrawer'
import {
  deleteVocabChapter,
  deleteVocabWord,
  seedDefaultVocabToDB,
  upsertVocabChapter,
  upsertVocabWord,
  type ManagedVocabChapter,
} from '../../lib/content'
import { useContentStore } from '../../store/useContentStore'
import { showToast } from '../../store/useToast'
import type { VocabWord } from '../../data/vocab/types'

const WORD_TYPES = [
  'Kata Benda',
  'Kata Kerja',
  'Kata Sifat-i',
  'Kata Sifat-na',
  'Kata Keterangan',
  'Ungkapan',
]

const VOCAB_STEPS: DrawerStep[] = [
  { id: 'main', label: 'Data Utama' },
  { id: 'example', label: 'Contoh & Pratinjau', optional: true },
]

export default function AdminVocab() {
  const { vocabChapters, refresh } = useContentStore()
  const [level, setLevel] = useState<'n5' | 'n4'>('n5')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')
  const [chapterSearch, setChapterSearch] = useState('')
  const [wordSearch, setWordSearch] = useState('')
  const [wordFilter, setWordFilter] = useState<'all' | 'no-example'>('all')
  const [flippedIds, setFlippedIds] = useState<Set<string>>(() => new Set())
  const [showScrollTop, setShowScrollTop] = useState(false)
  const gridScrollRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)

  // Drawer Bab
  const [chapterDrawerOpen, setChapterDrawerOpen] = useState(false)
  const [chEditId, setChEditId] = useState<string | undefined>()
  const [chOriginal, setChOriginal] = useState<ManagedVocabChapter | null>(null)
  const [chLevel, setChLevel] = useState<'n5' | 'n4'>('n5')
  const [chNum, setChNum] = useState(1)
  const [chTitle, setChTitle] = useState('')
  const [chDesc, setChDesc] = useState('')
  const [chPublished, setChPublished] = useState(true)

  // Drawer Kosakata
  const [wordDrawerOpen, setWordDrawerOpen] = useState(false)
  const [wordMode, setWordMode] = useState<'add' | 'edit'>('add')
  const [wordStep, setWordStep] = useState(0)
  const [originalWord, setOriginalWord] = useState<VocabWord | null>(null)
  const [wLevel, setWLevel] = useState<'n5' | 'n4'>('n5')
  const [wChapterId, setWChapterId] = useState('')
  const [wOriginalChapterId, setWOriginalChapterId] = useState('')
  const [wId, setWId] = useState('')
  const [wKanji, setWKanji] = useState('')
  const [wKana, setWKana] = useState('')
  const [wRomaji, setWRomaji] = useState('')
  const [wMeaning, setWMeaning] = useState('')
  const [wType, setWType] = useState('')
  const [wExJp, setWExJp] = useState('')
  const [wExId, setWExId] = useState('')

  useEffect(() => {
    void refresh(true)
  }, [refresh])

  const chapters = vocabChapters.filter((c) => c.level === level)
  const activeChapter: ManagedVocabChapter | undefined =
    chapters.find((c) => c.id === selectedChapterId) ?? chapters[0]

  const isBuiltInOnly = Boolean(activeChapter?.id.startsWith('builtin-'))

  useEffect(() => {
    setFlippedIds(new Set())
    setShowScrollTop(false)
    gridScrollRef.current?.scrollTo({ top: 0 })
  }, [activeChapter?.id, level])

  // Ringkasan statistik level aktif
  const totalWords = chapters.reduce((acc, ch) => acc + ch.words.length, 0)
  const wordsWithExamples = chapters.reduce(
    (acc, ch) => acc + ch.words.filter((w) => Boolean(w.exampleJp?.trim())).length,
    0
  )

  const filteredChapters = chapters.filter((ch) => {
    const q = chapterSearch.trim().toLowerCase()
    if (!q) return true
    return ch.title.toLowerCase().includes(q) || `bab ${ch.chapter}`.includes(q)
  })

  const filteredWords = (activeChapter?.words ?? []).filter((w) => {
    if (wordFilter === 'no-example' && w.exampleJp?.trim()) return false
    const q = wordSearch.trim().toLowerCase()
    if (!q) return true
    return (
      w.kana.toLowerCase().includes(q) ||
      w.romaji.toLowerCase().includes(q) ||
      w.meaning.toLowerCase().includes(q) ||
      (w.kanji?.toLowerCase().includes(q) ?? false)
    )
  })

  const allFilteredFlipped =
    filteredWords.length > 0 && filteredWords.every((w) => flippedIds.has(w.id))

  const toggleFlip = (id: string) => {
    setFlippedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleFlipAll = () => {
    if (allFilteredFlipped) {
      setFlippedIds(new Set())
    } else {
      setFlippedIds(new Set(filteredWords.map((w) => w.id)))
    }
  }

  // Daftar bab tujuan di dalam drawer kosakata
  const drawerChapters = vocabChapters.filter((c) => c.level === wLevel && !c.id.startsWith('builtin-'))
  const targetChapter = vocabChapters.find((c) => c.id === wChapterId)

  const showSuccess = (msg: string) => showToast(msg, 'success')
  const setError = (msg: string | null) => {
    if (msg) showToast(msg, 'error')
  }

  const handleSeed = async () => {
    setBusy(true)
    setError(null)
    try {
      const total = await seedDefaultVocabToDB()
      await refresh(true)
      showSuccess(`Berhasil menyalin ${total} kosakata bawaan ke Supabase.`)
    } catch (e: any) {
      setError(e?.message ?? 'Gagal seed kosakata')
    } finally {
      setBusy(false)
    }
  }

  const getNextChapterNum = (lv: 'n5' | 'n4') => {
    const list = vocabChapters.filter((c) => c.level === lv)
    return list.length > 0 ? Math.max(...list.map((c) => c.chapter)) + 1 : 1
  }

  const openNewChapter = () => {
    const nextNum = getNextChapterNum(level)
    setChEditId(undefined)
    setChOriginal(null)
    setChLevel(level)
    setChNum(nextNum)
    setChTitle(`Bab ${nextNum}: `)
    setChDesc('')
    setChPublished(true)
    setChapterDrawerOpen(true)
  }

  const openEditChapter = (ch: ManagedVocabChapter) => {
    setChEditId(ch.id)
    setChOriginal(ch)
    setChLevel(ch.level)
    setChNum(ch.chapter)
    setChTitle(ch.title)
    setChDesc(ch.description ?? '')
    setChPublished(ch.published)
    setChapterDrawerOpen(true)
  }

  const handleDrawerChapterLevelChange = (nextLv: 'n5' | 'n4') => {
    setChLevel(nextLv)
    if (!chEditId) {
      const nextNum = getNextChapterNum(nextLv)
      setChNum(nextNum)
      if (/^Bab \d+:\s*$/.test(chTitle)) {
        setChTitle(`Bab ${nextNum}: `)
      }
    }
  }

  const saveChapter = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!chTitle.trim()) return
    setBusy(true)
    setError(null)
    try {
      const newId = await upsertVocabChapter({
        id: chEditId,
        level: chLevel,
        chapter: chNum,
        title: chTitle,
        description: chDesc,
        published: chPublished,
      })
      await refresh(true)
      setLevel(chLevel)
      setSelectedChapterId(newId)
      setChapterDrawerOpen(false)
      showSuccess('Bab kosakata berhasil disimpan.')
    } catch (err: any) {
      setError(err?.message ?? 'Gagal menyimpan bab')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteChapter = (ch: ManagedVocabChapter) => {
    if (ch.id.startsWith('builtin-')) return
    setConfirmDelete({
      title: 'Hapus Bab Kosakata?',
      message: `Hapus "${ch.title}" beserta seluruh kosakatanya? Tindakan ini tidak bisa dibatalkan.`,
      onConfirm: async () => {
        setBusy(true)
        try {
          await deleteVocabChapter(ch.id)
          await refresh(true)
          setSelectedChapterId('')
          showSuccess('Bab berhasil dihapus.')
        } catch (err: any) {
          setError(err?.message ?? 'Gagal menghapus bab')
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const resetWordFields = (lv: 'n5' | 'n4', chapterObj?: ManagedVocabChapter) => {
    const chNumForId = chapterObj?.chapter ?? 1
    setWId(`${lv}-b${String(chNumForId).padStart(2, '0')}-${Date.now().toString().slice(-4)}`)
    setWKanji('')
    setWKana('')
    setWRomaji('')
    setWMeaning('')
    setWType('Kata Benda')
    setWExJp('')
    setWExId('')
    setWordStep(0)
  }

  const openNewWord = () => {
    if (!activeChapter) return
    setWordMode('add')
    setOriginalWord(null)
    setWLevel(level)
    setWChapterId(activeChapter.id)
    setWOriginalChapterId(activeChapter.id)
    resetWordFields(level, activeChapter)
    setWordDrawerOpen(true)
  }

  const openEditWord = (w: VocabWord) => {
    if (!activeChapter) return
    setWordMode('edit')
    setOriginalWord(w)
    setWLevel(level)
    setWChapterId(activeChapter.id)
    setWOriginalChapterId(activeChapter.id)
    setWId(w.id)
    setWKanji(w.kanji ?? '')
    setWKana(w.kana)
    setWRomaji(w.romaji)
    setWMeaning(w.meaning)
    setWType(w.type ?? '')
    setWExJp(w.exampleJp ?? '')
    setWExId(w.exampleId ?? '')
    setWordStep(0)
    setWordDrawerOpen(true)
  }

  const handleWordLevelChange = (nextLv: 'n5' | 'n4') => {
    setWLevel(nextLv)
    const available = vocabChapters.filter((c) => c.level === nextLv && !c.id.startsWith('builtin-'))
    const first = available[0]
    setWChapterId(first?.id ?? '')
    if (wordMode === 'add') {
      const chNumForId = first?.chapter ?? 1
      setWId(`${nextLv}-b${String(chNumForId).padStart(2, '0')}-${Date.now().toString().slice(-4)}`)
    }
  }

  const isWordStep1Valid = Boolean(
    wKana.trim() && wRomaji.trim() && wMeaning.trim() && wChapterId && !wChapterId.startsWith('builtin-')
  )

  const wordChangedFields: string[] = []
  if (wordMode === 'edit' && originalWord) {
    if (wChapterId !== wOriginalChapterId) wordChangedFields.push('Bab Tujuan')
    if (wKanji !== (originalWord.kanji ?? '')) wordChangedFields.push('Kanji')
    if (wKana !== originalWord.kana) wordChangedFields.push('Kana')
    if (wRomaji !== originalWord.romaji) wordChangedFields.push('Romaji')
    if (wMeaning !== originalWord.meaning) wordChangedFields.push('Arti')
    if (wType !== (originalWord.type ?? '')) wordChangedFields.push('Jenis Kata')
    if (wExJp !== (originalWord.exampleJp ?? '')) wordChangedFields.push('Contoh JP')
    if (wExId !== (originalWord.exampleId ?? '')) wordChangedFields.push('Arti Contoh')
  }

  const saveWord = async (keepOpenForNext = false) => {
    if (!targetChapter || !isWordStep1Valid) return
    setBusy(true)
    setError(null)
    try {
      const existingIdx = targetChapter.words.findIndex((w) => w.id === wId)
      const sortOrder = existingIdx >= 0 ? existingIdx : targetChapter.words.length
      await upsertVocabWord(
        targetChapter.id,
        {
          id: wId,
          kanji: wKanji.trim() || undefined,
          kana: wKana.trim(),
          romaji: wRomaji.trim(),
          meaning: wMeaning.trim(),
          type: wType.trim() || undefined,
          exampleJp: wExJp.trim() || undefined,
          exampleId: wExId.trim() || undefined,
        },
        sortOrder
      )
      await refresh(true)
      setLevel(wLevel)
      setSelectedChapterId(targetChapter.id)
      if (keepOpenForNext) {
        resetWordFields(wLevel, targetChapter)
        showSuccess('Tersimpan! Silakan lanjut tambah kosakata berikutnya.')
      } else {
        setWordDrawerOpen(false)
        showSuccess(wordMode === 'edit' ? 'Perubahan kosakata disimpan.' : 'Kosakata baru berhasil ditambahkan.')
      }
    } catch (err: any) {
      setError(err?.message ?? 'Gagal menyimpan kosakata')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteWord = (wordId: string) => {
    setConfirmDelete({
      title: 'Hapus Kosakata?',
      message: 'Yakin ingin menghapus kosakata ini? Tindakan ini tidak bisa dibatalkan.',
      onConfirm: async () => {
        setBusy(true)
        try {
          await deleteVocabWord(wordId)
          await refresh(true)
          showSuccess('Kosakata dihapus.')
        } catch (err: any) {
          setError(err?.message ?? 'Gagal menghapus kosakata')
        } finally {
          setBusy(false)
        }
      },
    })
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-ink m-0">CMS Kelola Kosakata</h2>
        <p className="text-[11px] sm:text-xs md:text-sm leading-snug text-muted mt-0.5 m-0">
          Kelola bab & daftar kosakata resmi Enna Card langsung ke database Supabase.
        </p>
      </div>

      {isBuiltInOnly && (
        <div className="bg-warning/15 border border-warning/40 text-ink rounded-xl p-3.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
          <span>
            Data saat ini masih berasal dari fallback kode lokal. Klik <strong>Seed Data Bawaan</strong> agar bab & kosakata masuk ke Supabase untuk diedit.
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSeed()}
            className="btn btn-xs sm:btn-sm btn-warning text-white border-0 rounded-xl cursor-pointer shrink-0"
          >
            Seed Data Bawaan
          </button>
        </div>
      )}

      {/* 1. Pilih Kategori */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
          1. Pilih Kategori
        </div>
        <SlidingTabs
          ariaLabel="Level Kosakata Admin"
          value={level}
          onChange={(lv) => {
            setLevel(lv)
            setSelectedChapterId('')
            setWordSearch('')
          }}
          className="inline-flex bg-pill border border-line rounded-xl p-1"
          indicatorClassName="bg-base-100 border border-line rounded-lg shadow-sm"
          buttonClassName="px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold"
          activeButtonClassName="text-accent"
          inactiveButtonClassName="text-muted hover:text-ink"
          options={[
            { value: 'n5', label: 'JLPT N5' },
            { value: 'n4', label: 'JLPT N4' },
          ]}
        />
      </div>

      {/* Ringkasan Statistik Level */}
      <div className="stats stats-horizontal shadow-sm w-full grid grid-cols-3 bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="stat px-3 py-2.5 sm:px-4 sm:py-3 min-w-0">
          <div className="stat-title text-muted text-[10px] sm:text-xs truncate">Total Bab</div>
          <div className="stat-value text-ink text-lg sm:text-2xl font-black tabular-nums">{chapters.length}</div>
          <div className="stat-desc text-muted text-[11px] hidden sm:block">JLPT {level.toUpperCase()}</div>
        </div>
        <div className="stat px-3 py-2.5 sm:px-4 sm:py-3 min-w-0">
          <div className="stat-title text-accent text-[10px] sm:text-xs truncate">Total Kosakata</div>
          <div className="stat-value text-accent text-lg sm:text-2xl font-black tabular-nums">{totalWords}</div>
          <div className="stat-desc text-muted text-[11px] hidden sm:block">Semua bab aktif</div>
        </div>
        <div className="stat px-3 py-2.5 sm:px-4 sm:py-3 min-w-0">
          <div className="stat-title text-ok text-[10px] sm:text-xs truncate">Ada Contoh</div>
          <div className="stat-value text-ok text-lg sm:text-2xl font-black tabular-nums">{wordsWithExamples}</div>
          <div className="stat-desc text-muted text-[11px] hidden sm:block">
            {totalWords > 0 ? `${Math.round((wordsWithExamples / totalWords) * 100)}% lengkap` : '0%'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* 2. Pilih Bab (Scroll Independen dengan Batas Bawah Sejajar) */}
        <div className="lg:col-span-4 bg-panel border border-line rounded-2xl p-3.5 sm:p-4 flex flex-col max-h-[280px] lg:max-h-none lg:h-[calc(100vh-280px)] lg:min-h-[480px]">
          <div className="space-y-2 pb-3 border-b border-line shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              2. Pilih Bab ({chapters.length})
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="Cari bab..."
                className="flex-1 min-w-0 h-8 rounded-full border border-line bg-bg text-ink text-xs px-3.5 placeholder:text-muted"
              />
              <button
                type="button"
                disabled={busy}
                onClick={openNewChapter}
                className="btn btn-xs sm:btn-sm bg-accent hover:opacity-90 text-white border-0 rounded-xl cursor-pointer shrink-0"
              >
                + Tambah Bab
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
            {filteredChapters.length === 0 ? (
              <p className="text-xs text-muted text-center py-6">Bab tidak ditemukan.</p>
            ) : (
              filteredChapters.map((ch) => {
                const isSelected = activeChapter?.id === ch.id
                return (
                  <div
                    key={ch.id}
                    onClick={() => {
                      setSelectedChapterId(ch.id)
                      setWordSearch('')
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-base-200 border-accent text-ink shadow-xs'
                        : 'bg-bg/50 border-line hover:border-accent/40 text-ink'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-accent">Bab {ch.chapter}</span>
                        {!ch.published && <span className="badge badge-soft badge-warning badge-xs">Draft</span>}
                      </div>
                      <div className="font-bold text-xs sm:text-sm truncate">{ch.title}</div>
                      <div className="text-[11px] text-muted">{ch.words.length} kosakata</div>
                    </div>
                    {!ch.id.startsWith('builtin-') && (
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openEditChapter(ch)}
                          className="btn btn-xs btn-ghost text-muted hover:text-ink"
                          title="Edit Bab"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
                            <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
                            <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteChapter(ch)}
                          className="btn btn-xs btn-ghost text-error"
                          title="Hapus Bab"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
                            <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 3. Isi Bab: Grid Kartu 3D Flip (Scroll Independen dengan Batas Bawah Sejajar) */}
        <div className="lg:col-span-8 bg-panel border border-line rounded-2xl p-3.5 sm:p-4 flex flex-col max-h-[75vh] lg:max-h-none lg:h-[calc(100vh-280px)] lg:min-h-[480px] relative">
          {activeChapter ? (
            <>
              <div className="space-y-3 pb-3 border-b border-line shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      3. Kartu Kosakata · JLPT {level.toUpperCase()}
                    </div>
                    <h3 className="font-bold text-base md:text-lg text-ink m-0 truncate">{activeChapter.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {filteredWords.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleFlipAll}
                        className="btn btn-xs sm:btn-sm btn-outline border-line text-ink rounded-xl cursor-pointer"
                      >
                        {allFilteredFlipped ? 'Tutup Semua' : 'Balik Semua'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy || isBuiltInOnly}
                      onClick={openNewWord}
                      className="btn btn-xs sm:btn-sm bg-accent hover:opacity-90 text-white border-0 rounded-xl cursor-pointer"
                    >
                      + Tambah Kosakata
                    </button>
                  </div>
                </div>

                {activeChapter.words.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                      <input
                        type="text"
                        value={wordSearch}
                        onChange={(e) => setWordSearch(e.target.value)}
                        placeholder="Cari kana, kanji, romaji, atau arti..."
                        className="w-full sm:max-w-[240px] h-8 rounded-full border border-line bg-bg text-ink text-xs px-3.5 placeholder:text-muted"
                      />
                      <select
                        aria-label="Filter kelengkapan kosakata"
                        value={wordFilter}
                        onChange={(e) => setWordFilter(e.target.value as 'all' | 'no-example')}
                        className="select select-xs sm:select-sm rounded-full border-line bg-bg text-xs font-medium"
                      >
                        <option value="all">Semua</option>
                        <option value="no-example">Tanpa Contoh</option>
                      </select>
                    </div>
                    <span className="text-[11px] text-muted">
                      {filteredWords.length} dari {activeChapter.words.length} kartu
                    </span>
                  </div>
                )}
              </div>

              <div
                ref={gridScrollRef}
                onScroll={(e) => setShowScrollTop(e.currentTarget.scrollTop > 180)}
                className="flex-1 overflow-y-auto pt-3 pr-1"
              >
                {activeChapter.words.length === 0 ? (
                  <p className="text-sm text-muted py-12 text-center">Belum ada kosakata di bab ini.</p>
                ) : filteredWords.length === 0 ? (
                  <p className="text-sm text-muted py-12 text-center">Tidak ada kosakata yang cocok.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-2">
                    {filteredWords.map((w, idx) => (
                      <AdminFlipCard
                        key={w.id}
                        flipped={flippedIds.has(w.id)}
                        onToggleFlip={() => toggleFlip(w.id)}
                        heightClass="h-48"
                        disabled={isBuiltInOnly}
                        onEdit={() => openEditWord(w)}
                        onDelete={() => void handleDeleteWord(w.id)}
                        front={
                          <div className="w-full space-y-1.5">
                            <div className="flex items-center justify-between gap-1 text-[10px] text-muted">
                              <span className="font-bold tabular-nums">#{idx + 1}</span>
                              {w.type && (
                                <span className="badge badge-soft badge-accent badge-xs font-semibold truncate max-w-[120px]">
                                  {w.type}
                                </span>
                              )}
                            </div>
                            <div className="pt-1 font-black font-japanese text-2xl sm:text-3xl text-ink leading-tight break-words">
                              {w.kanji || w.kana}
                            </div>
                            {w.kanji && (
                              <div className="text-sm font-bold font-japanese text-accent break-words">
                                {w.kana}
                              </div>
                            )}
                            <div className="text-xs text-muted font-medium">{w.romaji}</div>
                          </div>
                        }
                        back={
                          <div className="w-full space-y-2">
                            <div className="text-xs font-bold font-japanese text-muted">
                              {w.kanji || w.kana} · {w.romaji}
                            </div>
                            <div className="pt-1.5 border-t border-line/60 font-meaning font-extrabold text-base sm:text-lg text-accent leading-snug break-words">
                              {w.meaning}
                            </div>
                            {w.exampleJp && (
                              <div className="pt-1.5 border-t border-line/50 text-[11px] space-y-0.5">
                                <div className="font-japanese text-ink leading-snug">{w.exampleJp}</div>
                                {w.exampleId && (
                                  <div className="font-meaning text-muted leading-snug">{w.exampleId}</div>
                                )}
                              </div>
                            )}
                          </div>
                        }
                        footerLeft={
                          w.exampleJp ? (
                            <span className="badge badge-soft badge-success badge-xs">Contoh ✓</span>
                          ) : (
                            <span className="badge badge-soft badge-neutral badge-xs opacity-70">Tanpa contoh</span>
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {showScrollTop && (
                <button
                  type="button"
                  onClick={() => gridScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="btn btn-xs sm:btn-sm bg-accent hover:opacity-90 text-white border-0 rounded-full shadow-lg absolute bottom-4 right-5 z-10 cursor-pointer"
                >
                  ↑ Ke Atas
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted py-12 text-center">Pilih atau buat bab terlebih dahulu.</p>
          )}
        </div>
      </div>

      {/* Slide-Over Drawer: Tambah/Edit Bab */}
      <SlideOverDrawer
        open={chapterDrawerOpen}
        onClose={() => setChapterDrawerOpen(false)}
        busy={busy}
        mode={chEditId ? 'edit' : 'add'}
        title={chEditId ? 'Edit Bab Kosakata' : 'Tambah Bab Kosakata'}
        subtitle={`JLPT ${chLevel.toUpperCase()}`}
        maxWidthClass="max-w-md"
        editTarget={
          chOriginal ? (
            <span>
              Sedang mengedit: <strong>Bab {chOriginal.chapter} — {chOriginal.title}</strong>
            </span>
          ) : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button type="button" disabled={busy} className="btn btn-sm btn-ghost" onClick={() => setChapterDrawerOpen(false)}>
              Batal
            </button>
            <button
              type="button"
              disabled={busy || !chTitle.trim()}
              onClick={() => void saveChapter()}
              className="btn btn-sm bg-accent hover:opacity-90 text-white border-0"
            >
              {busy ? 'Menyimpan...' : chEditId ? 'Simpan Perubahan' : 'Simpan Bab'}
            </button>
          </div>
        }
      >
        <form onSubmit={saveChapter} className="space-y-4">
          {/* Pilihan Kategori / Level */}
          <div>
            <FieldLabel
              label="Kategori / Level"
              required
              changed={Boolean(chOriginal && chLevel !== chOriginal.level)}
            />
            <div className="grid grid-cols-2 gap-2">
              {(['n5', 'n4'] as const).map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => handleDrawerChapterLevelChange(lv)}
                  className={`py-2 px-3 rounded-xl border text-xs md:text-sm font-bold cursor-pointer transition-all ${
                    chLevel === lv
                      ? 'bg-accent text-white border-accent shadow-xs'
                      : 'bg-bg border-line text-muted hover:text-ink'
                  }`}
                >
                  JLPT {lv.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <FieldLabel
                label="Nomor Bab"
                required
                changed={Boolean(chOriginal && chNum !== chOriginal.chapter)}
              />
              <input
                type="number"
                min={1}
                required
                value={chNum}
                onChange={(e) => setChNum(parseInt(e.target.value, 10) || 1)}
                className="input input-bordered input-sm md:input-md bg-bg border-line"
              />
            </label>
            <label className="form-control flex flex-row items-center gap-2 pt-6 cursor-pointer">
              <input
                type="checkbox"
                checked={chPublished}
                onChange={(e) => setChPublished(e.target.checked)}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="text-xs md:text-sm font-medium">Publikasikan</span>
            </label>
          </div>

          <label className="form-control w-full block">
            <FieldLabel
              label="Judul Bab"
              required
              changed={Boolean(chOriginal && chTitle !== chOriginal.title)}
            />
            <input
              type="text"
              required
              value={chTitle}
              onChange={(e) => setChTitle(e.target.value)}
              className="input input-bordered input-sm md:input-md bg-bg border-line w-full"
            />
          </label>

          <label className="form-control w-full block">
            <FieldLabel
              label="Deskripsi"
              hint="Opsional"
              changed={Boolean(chOriginal && chDesc !== (chOriginal.description ?? ''))}
            />
            <textarea
              rows={3}
              value={chDesc}
              onChange={(e) => setChDesc(e.target.value)}
              className="textarea textarea-bordered textarea-sm md:textarea-md bg-bg border-line w-full"
            />
          </label>
        </form>
      </SlideOverDrawer>

      {/* Slide-Over Drawer: Tambah/Edit Kosakata Bertahap */}
      <SlideOverDrawer
        open={wordDrawerOpen}
        onClose={() => setWordDrawerOpen(false)}
        busy={busy}
        mode={wordMode}
        title={wordMode === 'edit' ? 'Edit Kosakata' : 'Tambah Kosakata Baru'}
        subtitle={`JLPT ${wLevel.toUpperCase()} · ${targetChapter?.title ?? 'Pilih Bab'}`}
        steps={VOCAB_STEPS}
        activeStep={wordStep}
        onStepChange={setWordStep}
        canJumpToStep={(idx) => (wordMode === 'edit' ? true : idx === 0 || isWordStep1Valid)}
        editTarget={
          originalWord ? (
            <span className="truncate block">
              Sedang mengedit:{' '}
              <strong className="font-japanese">{originalWord.kanji || originalWord.kana}</strong> ({originalWord.kana}) —{' '}
              <strong className="font-meaning">{originalWord.meaning}</strong>
            </span>
          ) : undefined
        }
        footer={
          <div className="space-y-2.5">
            {wordMode === 'edit' && (
              <div className="text-[11px] text-muted flex items-center justify-between gap-2">
                <span>
                  {wordChangedFields.length > 0 ? (
                    <>
                      Perubahan: <strong className="text-ink">{wordChangedFields.join(', ')}</strong>
                    </>
                  ) : (
                    'Belum ada perubahan'
                  )}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                {wordStep > 0 ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setWordStep(0)}
                    className="btn btn-sm btn-ghost"
                  >
                    ← Sebelumnya
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setWordDrawerOpen(false)}
                    className="btn btn-sm btn-ghost"
                  >
                    Batal
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {wordStep === 0 && (
                  <button
                    type="button"
                    disabled={!isWordStep1Valid}
                    onClick={() => setWordStep(1)}
                    className="btn btn-sm btn-outline border-line text-ink"
                  >
                    Lanjut (Contoh) →
                  </button>
                )}
                {wordMode === 'add' && (
                  <button
                    type="button"
                    disabled={busy || !isWordStep1Valid}
                    onClick={() => void saveWord(true)}
                    className="btn btn-sm bg-pill hover:bg-pill-on border border-line text-ink"
                  >
                    Simpan & Tambah Lagi
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy || !isWordStep1Valid}
                  onClick={() => void saveWord(false)}
                  className="btn btn-sm bg-accent hover:opacity-90 text-white border-0"
                >
                  {busy ? 'Menyimpan...' : wordMode === 'edit' ? 'Simpan Perubahan' : 'Simpan Kosakata'}
                </button>
              </div>
            </div>
          </div>
        }
      >
        {wordStep === 0 ? (
          <div className="space-y-4">
            {/* Pemilih Kategori & Bab Tujuan */}
            <div className="bg-bg/50 border border-line rounded-xl p-3 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <FieldLabel label="Kategori" required />
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['n5', 'n4'] as const).map((lv) => (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => handleWordLevelChange(lv)}
                        className={`py-1.5 px-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          wLevel === lv
                            ? 'bg-accent text-white border-accent'
                            : 'bg-panel border-line text-muted hover:text-ink'
                        }`}
                      >
                        JLPT {lv.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="form-control block">
                  <FieldLabel
                    label="Bab Tujuan"
                    required
                    changed={Boolean(originalWord && wChapterId !== wOriginalChapterId)}
                  />
                  <select
                    value={wChapterId}
                    onChange={(e) => setWChapterId(e.target.value)}
                    className="select select-bordered select-sm bg-panel border-line w-full text-xs"
                  >
                    {drawerChapters.length === 0 ? (
                      <option value="">Belum ada bab di level ini</option>
                    ) : (
                      drawerChapters.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          Bab {ch.chapter}: {ch.title}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="form-control block">
                <FieldLabel
                  label="Kana"
                  required
                  changed={Boolean(originalWord && wKana !== originalWord.kana)}
                />
                <input
                  type="text"
                  required
                  value={wKana}
                  onChange={(e) => setWKana(e.target.value)}
                  placeholder="contoh: せんせい"
                  className="input input-bordered input-sm md:input-md bg-bg border-line w-full font-japanese"
                />
              </label>

              <label className="form-control block">
                <FieldLabel
                  label="Romaji"
                  required
                  changed={Boolean(originalWord && wRomaji !== originalWord.romaji)}
                />
                <input
                  type="text"
                  required
                  value={wRomaji}
                  onChange={(e) => setWRomaji(e.target.value)}
                  placeholder="contoh: sensei"
                  className="input input-bordered input-sm md:input-md bg-bg border-line w-full"
                />
              </label>
            </div>

            <label className="form-control w-full block">
              <FieldLabel
                label="Arti Bahasa Indonesia"
                required
                changed={Boolean(originalWord && wMeaning !== originalWord.meaning)}
              />
              <input
                type="text"
                required
                value={wMeaning}
                onChange={(e) => setWMeaning(e.target.value)}
                placeholder="contoh: Guru / Pengajar"
                className="input input-bordered input-sm md:input-md bg-bg border-line w-full font-meaning"
              />
            </label>

            <label className="form-control w-full block">
              <FieldLabel
                label="Kanji"
                hint="Opsional"
                changed={Boolean(originalWord && wKanji !== (originalWord.kanji ?? ''))}
              />
              <input
                type="text"
                value={wKanji}
                onChange={(e) => setWKanji(e.target.value)}
                placeholder="contoh: 先生 (kosongkan jika hanya kana)"
                className="input input-bordered input-sm md:input-md bg-bg border-line w-full font-japanese"
              />
            </label>

            <div className="space-y-2">
              <FieldLabel
                label="Jenis Kata"
                hint="Opsional"
                changed={Boolean(originalWord && wType !== (originalWord.type ?? ''))}
              />
              <div className="flex flex-wrap gap-1.5">
                {WORD_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setWType(t)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-colors ${
                      wType === t
                        ? 'bg-accent text-white border-accent'
                        : 'bg-pill/60 hover:bg-pill text-muted hover:text-ink border-line'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={wType}
                onChange={(e) => setWType(e.target.value)}
                placeholder="Atau ketik jenis kata lainnya..."
                className="input input-bordered input-sm bg-bg border-line w-full"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="form-control w-full block">
              <FieldLabel
                label="Contoh Kalimat (Jepang)"
                hint="Opsional"
                changed={Boolean(originalWord && wExJp !== (originalWord.exampleJp ?? ''))}
              />
              <input
                type="text"
                value={wExJp}
                onChange={(e) => setWExJp(e.target.value)}
                placeholder="contoh: 先生は親切です。"
                className="input input-bordered input-sm md:input-md bg-bg border-line w-full font-japanese"
              />
            </label>

            <label className="form-control w-full block">
              <FieldLabel
                label="Arti Contoh Kalimat"
                hint="Opsional"
                changed={Boolean(originalWord && wExId !== (originalWord.exampleId ?? ''))}
              />
              <input
                type="text"
                value={wExId}
                onChange={(e) => setWExId(e.target.value)}
                placeholder="contoh: Guru itu ramah."
                className="input input-bordered input-sm md:input-md bg-bg border-line w-full font-meaning"
              />
            </label>

            {/* Live Preview Kartu Kosakata */}
            <div className="bg-bg/60 border border-line rounded-2xl p-4 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Pratinjau Kartu Siswa
              </div>
              <div className="bg-panel border border-line rounded-xl p-4 text-center space-y-1.5">
                {wType && (
                  <span className="badge badge-soft badge-accent badge-xs font-semibold">{wType}</span>
                )}
                <div className="text-2xl font-bold font-japanese text-ink">
                  {wKanji.trim() || wKana.trim() || '—'}
                </div>
                {wKanji.trim() && wKana.trim() && (
                  <div className="text-sm font-japanese text-muted">{wKana}</div>
                )}
                <div className="text-xs text-muted">{wRomaji || 'romaji'}</div>
                <div className="pt-2 border-t border-line/60 font-meaning font-bold text-sm text-ink">
                  {wMeaning || 'Arti kosakata'}
                </div>
                {(wExJp.trim() || wExId.trim()) && (
                  <div className="pt-2 text-xs text-muted space-y-0.5">
                    {wExJp.trim() && <div className="font-japanese text-ink">{wExJp}</div>}
                    {wExId.trim() && <div className="font-meaning">{wExId}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Modal Konfirmasi Hapus */}
      <dialog className={`modal ${confirmDelete ? 'modal-open' : ''}`}>
        <div className="modal-box bg-panel border border-line">
          <h3 className="text-lg font-bold">{confirmDelete?.title}</h3>
          <p className="py-4 text-sm text-muted">{confirmDelete?.message}</p>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setConfirmDelete(null)}>
              Tutup
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn btn-error text-white"
              onClick={async () => {
                const fn = confirmDelete?.onConfirm
                setConfirmDelete(null)
                if (fn) await fn()
              }}
            >
              Hapus
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
