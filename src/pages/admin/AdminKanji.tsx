import { useEffect, useRef, useState } from 'react'
import { SlidingTabs } from '../../components/Segmented'
import { AdminFlipCard } from '../../components/admin/AdminFlipCard'
import { FieldLabel, SlideOverDrawer, type DrawerStep } from '../../components/admin/SlideOverDrawer'
import { BulkImportDrawer } from '../../components/admin/BulkImportDrawer'
import {
  deleteKanjiChapter,
  deleteKanjiItem,
  seedDefaultKanjiToDB,
  uploadKanjiImage,
  upsertKanjiChapter,
  upsertKanjiItem,
  type ManagedKanjiChapter,
} from '../../lib/content'
import { useContentStore } from '../../store/useContentStore'
import { showToast } from '../../store/useToast'
import type { KanjiExample, KanjiItem, KanjiLevel } from '../../data/kanji/types'
import { getAdminMeaningSize } from '../../lib/cardTextSize'

const KANJI_STEPS: DrawerStep[] = [
  { id: 'identity', label: 'Identitas' },
  { id: 'visual', label: 'Ilustrasi & Ingatan', optional: true },
  { id: 'examples', label: 'Contoh & Pratinjau', optional: true },
]

function normalizeExamples(list: KanjiExample[]): KanjiExample[] {
  return list
    .map((ex) => ({
      word: ex.word.trim(),
      reading: ex.reading.trim(),
      meaning: ex.meaning.trim(),
    }))
    .filter((ex) => ex.word && ex.meaning)
}

function formatKanjiLevel(lv: KanjiLevel): string {
  return lv === 'jft' ? 'JFT' : `JLPT ${lv.toUpperCase()}`
}

export default function AdminKanji() {
  const { kanjiChapters, refresh } = useContentStore()
  const [level, setLevel] = useState<KanjiLevel>('n5')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')
  const [chapterSearch, setChapterSearch] = useState('')
  const [kanjiSearch, setKanjiSearch] = useState('')
  const [kanjiFilter, setKanjiFilter] = useState<'all' | 'no-image' | 'no-example'>('all')
  const [flippedIds, setFlippedIds] = useState<Set<string>>(() => new Set())
  const [showScrollTop, setShowScrollTop] = useState(false)
  const gridScrollRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)

  // Drawer Bab
  const [chapterDrawerOpen, setChapterDrawerOpen] = useState(false)
  const [chEditId, setChEditId] = useState<string | undefined>()
  const [chOriginal, setChOriginal] = useState<ManagedKanjiChapter | null>(null)
  const [chLevel, setChLevel] = useState<KanjiLevel>('n5')
  const [chNum, setChNum] = useState(1)
  const [chTitle, setChTitle] = useState('')
  const [chDesc, setChDesc] = useState('')
  const [chPublished, setChPublished] = useState(true)

  // Drawer Kanji
  const [kanjiDrawerOpen, setKanjiDrawerOpen] = useState(false)
  const [kanjiMode, setKanjiMode] = useState<'add' | 'edit'>('add')
  const [kanjiStep, setKanjiStep] = useState(0)
  const [originalKanji, setOriginalKanji] = useState<KanjiItem | null>(null)
  const [kLevel, setKLevel] = useState<KanjiLevel>('n5')
  const [kChapterId, setKChapterId] = useState('')
  const [kOriginalChapterId, setKOriginalChapterId] = useState('')
  const [kId, setKId] = useState('')
  const [kChar, setKChar] = useState('')
  const [kOnyomi, setKOnyomi] = useState('')
  const [kKunyomi, setKKunyomi] = useState('')
  const [kMeaning, setKMeaning] = useState('')
  const [kMnemonic, setKMnemonic] = useState('')
  const [kImage, setKImage] = useState('')
  const [kExamples, setKExamples] = useState<KanjiExample[]>([])

  useEffect(() => {
    void refresh(true)
  }, [refresh])

  const chapters = kanjiChapters.filter((c) => c.level === level)
  const activeChapter: ManagedKanjiChapter | undefined =
    chapters.find((c) => c.id === selectedChapterId) ?? chapters[0]

  const isBuiltInOnly = Boolean(activeChapter?.id.startsWith('builtin-'))

  useEffect(() => {
    setFlippedIds(new Set())
    setShowScrollTop(false)
    gridScrollRef.current?.scrollTo({ top: 0 })
  }, [activeChapter?.id, level])

  // Ringkasan statistik level aktif
  const totalKanji = chapters.reduce((acc, ch) => acc + ch.items.length, 0)
  const kanjiWithImage = chapters.reduce(
    (acc, ch) => acc + ch.items.filter((k) => Boolean(k.image)).length,
    0
  )

  const filteredChapters = chapters.filter((ch) => {
    const q = chapterSearch.trim().toLowerCase()
    if (!q) return true
    return ch.title.toLowerCase().includes(q) || `bab ${ch.chapter}`.includes(q)
  })

  const filteredItems = (activeChapter?.items ?? []).filter((item) => {
    if (kanjiFilter === 'no-image' && item.image) return false
    if (kanjiFilter === 'no-example' && item.examples && item.examples.length > 0) return false
    const q = kanjiSearch.trim().toLowerCase()
    if (!q) return true
    return (
      item.kanji.toLowerCase().includes(q) ||
      item.meaning.toLowerCase().includes(q) ||
      item.onyomi.toLowerCase().includes(q) ||
      item.kunyomi.toLowerCase().includes(q) ||
      (item.mnemonic?.toLowerCase().includes(q) ?? false)
    )
  })

  const allFilteredFlipped =
    filteredItems.length > 0 && filteredItems.every((item) => flippedIds.has(item.id))

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
      setFlippedIds(new Set(filteredItems.map((item) => item.id)))
    }
  }

  // Daftar bab tujuan di dalam drawer kanji
  const drawerChapters = kanjiChapters.filter((c) => c.level === kLevel && !c.id.startsWith('builtin-'))
  const targetChapter = kanjiChapters.find((c) => c.id === kChapterId)

  const showSuccess = (msg: string) => showToast(msg, 'success')
  const setError = (msg: string | null) => {
    if (msg) showToast(msg, 'error')
  }

  const handleSeed = async () => {
    setBusy(true)
    setError(null)
    try {
      const total = await seedDefaultKanjiToDB()
      await refresh(true)
      showSuccess(`Berhasil menyalin ${total} Kanji bawaan ke Supabase.`)
    } catch (e: any) {
      setError(e?.message ?? 'Gagal seed Kanji')
    } finally {
      setBusy(false)
    }
  }

  const getNextChapterNum = (lv: KanjiLevel) => {
    const list = kanjiChapters.filter((c) => c.level === lv)
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

  const openEditChapter = (ch: ManagedKanjiChapter) => {
    setChEditId(ch.id)
    setChOriginal(ch)
    setChLevel(ch.level)
    setChNum(ch.chapter)
    setChTitle(ch.title)
    setChDesc(ch.description ?? '')
    setChPublished(ch.published)
    setChapterDrawerOpen(true)
  }

  const handleDrawerChapterLevelChange = (nextLv: KanjiLevel) => {
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
      const newId = await upsertKanjiChapter({
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
      showSuccess('Bab Kanji berhasil disimpan.')
    } catch (err: any) {
      setError(err?.message ?? 'Gagal menyimpan bab')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteChapter = (ch: ManagedKanjiChapter) => {
    if (ch.id.startsWith('builtin-')) return
    setConfirmDelete({
      title: 'Hapus Bab Kanji?',
      message: `Hapus "${ch.title}" beserta seluruh Kanji di dalamnya? Tindakan ini tidak bisa dibatalkan.`,
      onConfirm: async () => {
        setBusy(true)
        try {
          await deleteKanjiChapter(ch.id)
          await refresh(true)
          setSelectedChapterId('')
          showSuccess('Bab Kanji dihapus.')
        } catch (err: any) {
          setError(err?.message ?? 'Gagal menghapus bab')
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const resetKanjiFields = (lv: KanjiLevel, chapterObj?: ManagedKanjiChapter) => {
    const chNumForId = chapterObj?.chapter ?? 1
    setKId(`${lv}-k${String(chNumForId).padStart(2, '0')}-${Date.now().toString().slice(-4)}`)
    setKChar('')
    setKOnyomi('')
    setKKunyomi('')
    setKMeaning('')
    setKMnemonic('')
    setKImage('')
    setKExamples([{ word: '', reading: '', meaning: '' }])
    setKanjiStep(0)
  }

  const openNewKanji = () => {
    if (!activeChapter) return
    setKanjiMode('add')
    setOriginalKanji(null)
    setKLevel(level)
    setKChapterId(activeChapter.id)
    setKOriginalChapterId(activeChapter.id)
    resetKanjiFields(level, activeChapter)
    setKanjiDrawerOpen(true)
  }

  const openEditKanji = (item: KanjiItem) => {
    if (!activeChapter) return
    setKanjiMode('edit')
    setOriginalKanji(item)
    setKLevel(level)
    setKChapterId(activeChapter.id)
    setKOriginalChapterId(activeChapter.id)
    setKId(item.id)
    setKChar(item.kanji)
    setKOnyomi(item.onyomi === '-' ? '' : item.onyomi)
    setKKunyomi(item.kunyomi === '-' ? '' : item.kunyomi)
    setKMeaning(item.meaning)
    setKMnemonic(item.mnemonic ?? '')
    setKImage(item.image ?? '')
    setKExamples(
      item.examples && item.examples.length > 0
        ? item.examples.map((ex) => ({ ...ex }))
        : [{ word: '', reading: '', meaning: '' }]
    )
    setKanjiStep(0)
    setKanjiDrawerOpen(true)
  }

  const handleKanjiLevelChange = (nextLv: KanjiLevel) => {
    setKLevel(nextLv)
    const available = kanjiChapters.filter((c) => c.level === nextLv && !c.id.startsWith('builtin-'))
    const first = available[0]
    setKChapterId(first?.id ?? '')
    if (kanjiMode === 'add') {
      const chNumForId = first?.chapter ?? 1
      setKId(`${nextLv}-k${String(chNumForId).padStart(2, '0')}-${Date.now().toString().slice(-4)}`)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !kId) return
    setUploadingImg(true)
    setError(null)
    try {
      const publicUrl = await uploadKanjiImage(file, kId)
      setKImage(publicUrl)
      showSuccess('Gambar ilustrasi berhasil diunggah.')
    } catch (err: any) {
      setError(err?.message ?? 'Gagal mengunggah gambar ilustrasi')
    } finally {
      setUploadingImg(false)
    }
  }

  const updateExampleRow = (idx: number, field: keyof KanjiExample, val: string) => {
    setKExamples((prev) => prev.map((ex, i) => (i === idx ? { ...ex, [field]: val } : ex)))
  }

  const addExampleRow = () => {
    setKExamples((prev) => [...prev, { word: '', reading: '', meaning: '' }])
  }

  const removeExampleRow = (idx: number) => {
    setKExamples((prev) => (prev.length <= 1 ? [{ word: '', reading: '', meaning: '' }] : prev.filter((_, i) => i !== idx)))
  }

  const isKanjiStep1Valid = Boolean(
    kChar.trim() && kMeaning.trim() && kChapterId && !kChapterId.startsWith('builtin-')
  )

  const kanjiChangedFields: string[] = []
  if (kanjiMode === 'edit' && originalKanji) {
    const origOn = originalKanji.onyomi === '-' ? '' : originalKanji.onyomi
    const origKun = originalKanji.kunyomi === '-' ? '' : originalKanji.kunyomi
    if (kChapterId !== kOriginalChapterId) kanjiChangedFields.push('Bab Tujuan')
    if (kChar !== originalKanji.kanji) kanjiChangedFields.push('Huruf Kanji')
    if (kMeaning !== originalKanji.meaning) kanjiChangedFields.push('Arti')
    if (kOnyomi !== origOn) kanjiChangedFields.push('Onyomi')
    if (kKunyomi !== origKun) kanjiChangedFields.push('Kunyomi')
    if (kImage !== (originalKanji.image ?? '')) kanjiChangedFields.push('Ilustrasi')
    if (kMnemonic !== (originalKanji.mnemonic ?? '')) kanjiChangedFields.push('Mnemonic')
    const normCurrent = JSON.stringify(normalizeExamples(kExamples))
    const normOrig = JSON.stringify(normalizeExamples(originalKanji.examples ?? []))
    if (normCurrent !== normOrig) kanjiChangedFields.push('Contoh Kata')
  }

  const saveKanji = async (keepOpenForNext = false) => {
    if (!targetChapter || !isKanjiStep1Valid) return
    setBusy(true)
    setError(null)
    try {
      const examples = normalizeExamples(kExamples)
      const existingIdx = targetChapter.items.findIndex((k) => k.id === kId)
      const sortOrder = existingIdx >= 0 ? existingIdx : targetChapter.items.length

      await upsertKanjiItem(
        targetChapter.id,
        {
          id: kId,
          kanji: kChar.trim(),
          onyomi: kOnyomi.trim() || '-',
          kunyomi: kKunyomi.trim() || '-',
          meaning: kMeaning.trim(),
          mnemonic: kMnemonic.trim() || undefined,
          image: kImage || undefined,
          examples,
        },
        sortOrder
      )
      await refresh(true)
      setLevel(kLevel)
      setSelectedChapterId(targetChapter.id)
      if (keepOpenForNext) {
        resetKanjiFields(kLevel, targetChapter)
        showSuccess('Tersimpan! Silakan lanjut tambah Kanji berikutnya.')
      } else {
        setKanjiDrawerOpen(false)
        showSuccess(kanjiMode === 'edit' ? 'Perubahan Kanji disimpan.' : 'Kanji baru berhasil ditambahkan.')
      }
    } catch (err: any) {
      setError(err?.message ?? 'Gagal menyimpan Kanji')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteKanji = (kanjiId: string) => {
    setConfirmDelete({
      title: 'Hapus Kanji?',
      message: 'Yakin ingin menghapus Kanji ini? Tindakan ini tidak bisa dibatalkan.',
      onConfirm: async () => {
        setBusy(true)
        try {
          await deleteKanjiItem(kanjiId)
          await refresh(true)
          showSuccess('Kanji dihapus.')
        } catch (err: any) {
          setError(err?.message ?? 'Gagal menghapus Kanji')
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const validPreviewExamples = normalizeExamples(kExamples)

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-ink m-0">CMS Kelola Kanji & Ilustrasi</h2>
        <p className="text-[11px] sm:text-xs md:text-sm leading-snug text-muted mt-0.5 m-0">
          Kelola bab & huruf Kanji resmi Enna Card beserta gambar ilustrasi ke Supabase.
        </p>
      </div>

      {isBuiltInOnly && (
        <div className="bg-warning/15 border border-warning/40 text-ink rounded-xl p-3.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
          <span>
            Data saat ini masih berasal dari fallback kode lokal. Klik <strong>Seed Data Bawaan</strong> agar seluruh bab & Kanji masuk ke Supabase untuk dikelola dan diberi ilustrasi.
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
          ariaLabel="Level Kanji Admin"
          value={level}
          onChange={(lv) => {
            setLevel(lv)
            setSelectedChapterId('')
            setKanjiSearch('')
          }}
          className="inline-flex bg-pill border border-line rounded-xl p-1"
          indicatorClassName="bg-base-100 border border-line rounded-lg shadow-sm"
          buttonClassName="px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold"
          activeButtonClassName="text-accent"
          inactiveButtonClassName="text-muted hover:text-ink"
          options={[
            { value: 'n5', label: 'JLPT N5' },
            { value: 'n4', label: 'JLPT N4' },
            { value: 'jft', label: 'JFT' },
          ]}
        />
      </div>

      {/* Ringkasan Statistik Level */}
      <div className="stats stats-horizontal shadow-sm w-full grid grid-cols-3 bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="stat px-3 py-2.5 sm:px-4 sm:py-3 min-w-0">
          <div className="stat-title text-muted text-[10px] sm:text-xs truncate">Total Bab</div>
          <div className="stat-value text-ink text-lg sm:text-2xl font-black tabular-nums">{chapters.length}</div>
          <div className="stat-desc text-muted text-[11px] hidden sm:block">{formatKanjiLevel(level)}</div>
        </div>
        <div className="stat px-3 py-2.5 sm:px-4 sm:py-3 min-w-0">
          <div className="stat-title text-accent text-[10px] sm:text-xs truncate">Total Kanji</div>
          <div className="stat-value text-accent text-lg sm:text-2xl font-black tabular-nums">{totalKanji}</div>
          <div className="stat-desc text-muted text-[11px] hidden sm:block">Semua bab aktif</div>
        </div>
        <div className="stat px-3 py-2.5 sm:px-4 sm:py-3 min-w-0">
          <div className="stat-title text-ok text-[10px] sm:text-xs truncate">Ada Ilustrasi</div>
          <div className="stat-value text-ok text-lg sm:text-2xl font-black tabular-nums">{kanjiWithImage}</div>
          <div className="stat-desc text-muted text-[11px] hidden sm:block">
            {totalKanji > 0 ? `${Math.round((kanjiWithImage / totalKanji) * 100)}% bergambar` : '0%'}
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
                      setKanjiSearch('')
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
                      <div className="text-[11px] text-muted">{ch.items.length} Kanji</div>
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

        {/* 3. Isi Bab: Grid Kartu Kanji 3D Flip (Scroll Independen dengan Batas Bawah Sejajar) */}
        <div className="lg:col-span-8 bg-panel border border-line rounded-2xl p-3.5 sm:p-4 flex flex-col max-h-[75vh] lg:max-h-none lg:h-[calc(100vh-280px)] lg:min-h-[480px] relative">
          {activeChapter ? (
            <>
              <div className="space-y-3 pb-3 border-b border-line shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      3. Kartu Kanji · {formatKanjiLevel(level)}
                    </div>
                    <h3 className="font-bold text-base md:text-lg text-ink m-0 truncate">{activeChapter.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {filteredItems.length > 0 && (
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
                      onClick={() => setImportOpen(true)}
                      className="btn btn-xs sm:btn-sm btn-outline border-line text-ink rounded-xl cursor-pointer"
                    >
                      Import Data
                    </button>
                    <button
                      type="button"
                      disabled={busy || isBuiltInOnly}
                      onClick={openNewKanji}
                      className="btn btn-xs sm:btn-sm bg-accent hover:opacity-90 text-white border-0 rounded-xl cursor-pointer"
                    >
                      + Tambah Kanji
                    </button>
                  </div>
                </div>

                {activeChapter.items.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                      <input
                        type="text"
                        value={kanjiSearch}
                        onChange={(e) => setKanjiSearch(e.target.value)}
                        placeholder="Cari kanji, arti, bacaan, atau mnemonic..."
                        className="w-full sm:max-w-[250px] h-8 rounded-full border border-line bg-bg text-ink text-xs px-3.5 placeholder:text-muted"
                      />
                      <select
                        aria-label="Filter kelengkapan kanji"
                        value={kanjiFilter}
                        onChange={(e) => setKanjiFilter(e.target.value as 'all' | 'no-image' | 'no-example')}
                        className="select select-xs sm:select-sm rounded-full border-line bg-bg text-xs font-medium"
                      >
                        <option value="all">Semua</option>
                        <option value="no-image">Tanpa Gambar</option>
                        <option value="no-example">Tanpa Contoh</option>
                      </select>
                    </div>
                    <span className="text-[11px] text-muted">
                      {filteredItems.length} dari {activeChapter.items.length} kartu
                    </span>
                  </div>
                )}
              </div>

              <div
                ref={gridScrollRef}
                onScroll={(e) => setShowScrollTop(e.currentTarget.scrollTop > 180)}
                className="flex-1 overflow-y-auto pt-3 pr-1"
              >
                {activeChapter.items.length === 0 ? (
                  <p className="text-sm text-muted py-12 text-center">Belum ada Kanji di bab ini.</p>
                ) : filteredItems.length === 0 ? (
                  <p className="text-sm text-muted py-12 text-center">Tidak ada Kanji yang cocok.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-2">
                    {filteredItems.map((item, idx) => (
                      <AdminFlipCard
                        key={item.id}
                        flipped={flippedIds.has(item.id)}
                        onToggleFlip={() => toggleFlip(item.id)}
                        heightClass="h-52"
                        disabled={isBuiltInOnly}
                        onEdit={() => openEditKanji(item)}
                        onDelete={() => void handleDeleteKanji(item.id)}
                        front={
                          <div className="w-full h-full flex flex-col">
                            <div className="flex items-center justify-between h-5 shrink-0 text-[10px] text-muted">
                              <span className="font-bold tabular-nums">#{idx + 1}</span>
                              {item.mnemonic && (
                                <span className="badge badge-soft badge-neutral badge-xs whitespace-nowrap">Mnemonic</span>
                              )}
                            </div>
                            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.kanji}
                                  className="w-16 h-16 rounded-2xl object-cover border border-line bg-bg shadow-xs"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-2xl border border-dashed border-line bg-pill/40 flex items-center justify-center text-[10px] text-muted">
                                  Kosong
                                </div>
                              )}
                              <div className="font-black font-japanese text-3xl sm:text-4xl text-ink leading-none">
                                {item.kanji}
                              </div>
                            </div>
                          </div>
                        }
                        back={
                          <div className="w-full space-y-1.5">
                            <div className="text-xs font-bold font-japanese text-muted">
                              {item.kanji} · On: {item.onyomi || '-'} · Kun: {item.kunyomi || '-'}
                            </div>
                            <div
                              className={`pt-1 border-t border-line/60 font-meaning font-extrabold ${getAdminMeaningSize(item.meaning)} text-accent leading-snug break-words`}
                            >
                              {item.meaning}
                            </div>
                            {item.mnemonic && (
                              <div className="text-[11px] text-muted bg-pill/50 rounded-lg px-2 py-1 leading-snug">
                                {item.mnemonic}
                              </div>
                            )}
                            {item.examples && item.examples.length > 0 && (
                              <div className="pt-1 border-t border-line/50 space-y-0.5 text-[11px]">
                                {item.examples.slice(0, 2).map((ex, exIdx) => (
                                  <div key={exIdx} className="truncate">
                                    <span className="font-japanese font-semibold text-ink">{ex.word}</span>{' '}
                                    <span className="font-meaning text-muted">— {ex.meaning}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        }
                        footerLeft={
                          <>
                            {item.image ? (
                              <span className="badge badge-soft badge-success badge-xs">Ilustrasi ✓</span>
                            ) : (
                              <span className="badge badge-soft badge-warning badge-xs">Tanpa gambar</span>
                            )}
                            {item.examples && item.examples.length > 0 && (
                              <span className="badge badge-soft badge-info badge-xs">
                                {item.examples.length} contoh
                              </span>
                            )}
                          </>
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
        title={chEditId ? 'Edit Bab Kanji' : 'Tambah Bab Kanji'}
        subtitle={formatKanjiLevel(chLevel)}
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
            <div className="grid grid-cols-3 gap-2">
              {(['n5', 'n4', 'jft'] as const).map((lv) => (
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
                  {formatKanjiLevel(lv)}
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

      {/* Slide-Over Drawer: Tambah/Edit Kanji 3 Langkah */}
      <SlideOverDrawer
        open={kanjiDrawerOpen}
        onClose={() => setKanjiDrawerOpen(false)}
        busy={busy || uploadingImg}
        mode={kanjiMode}
        title={kanjiMode === 'edit' ? 'Edit Kanji' : 'Tambah Kanji Baru'}
        subtitle={`${formatKanjiLevel(kLevel)} · ${targetChapter?.title ?? 'Pilih Bab'}`}
        steps={KANJI_STEPS}
        activeStep={kanjiStep}
        onStepChange={setKanjiStep}
        canJumpToStep={(idx) => (kanjiMode === 'edit' ? true : idx === 0 || isKanjiStep1Valid)}
        editTarget={
          originalKanji ? (
            <span className="truncate block">
              Sedang mengedit:{' '}
              <strong className="font-japanese text-sm">{originalKanji.kanji}</strong> —{' '}
              <strong className="font-meaning">{originalKanji.meaning}</strong>
            </span>
          ) : undefined
        }
        footer={
          <div className="space-y-2.5">
            {kanjiMode === 'edit' && (
              <div className="text-[11px] text-muted">
                {kanjiChangedFields.length > 0 ? (
                  <>
                    Perubahan: <strong className="text-ink">{kanjiChangedFields.join(', ')}</strong>
                  </>
                ) : (
                  'Belum ada perubahan'
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                {kanjiStep > 0 ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setKanjiStep((s) => Math.max(0, s - 1))}
                    className="btn btn-sm btn-ghost"
                  >
                    ← Sebelumnya
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setKanjiDrawerOpen(false)}
                    className="btn btn-sm btn-ghost"
                  >
                    Batal
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {kanjiStep < 2 && (
                  <button
                    type="button"
                    disabled={!isKanjiStep1Valid}
                    onClick={() => setKanjiStep((s) => Math.min(2, s + 1))}
                    className="btn btn-sm btn-outline border-line text-ink"
                  >
                    {kanjiStep === 0 ? 'Lanjut (Ilustrasi) →' : 'Lanjut (Contoh) →'}
                  </button>
                )}
                {kanjiMode === 'add' && (
                  <button
                    type="button"
                    disabled={busy || uploadingImg || !isKanjiStep1Valid}
                    onClick={() => void saveKanji(true)}
                    className="btn btn-sm bg-pill hover:bg-pill-on border border-line text-ink"
                  >
                    Simpan & Tambah Lagi
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy || uploadingImg || !isKanjiStep1Valid}
                  onClick={() => void saveKanji(false)}
                  className="btn btn-sm bg-accent hover:opacity-90 text-white border-0"
                >
                  {busy ? 'Menyimpan...' : kanjiMode === 'edit' ? 'Simpan Perubahan' : 'Simpan Kanji'}
                </button>
              </div>
            </div>
          </div>
        }
      >
        {kanjiStep === 0 && (
          <div className="space-y-4">
            {/* Pemilih Kategori & Bab Tujuan */}
            <div className="bg-bg/50 border border-line rounded-xl p-3 space-y-2.5">
              <div>
                <FieldLabel label="Kategori" required />
                <div className="grid grid-cols-3 gap-1.5">
                  {(['n5', 'n4', 'jft'] as const).map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => handleKanjiLevelChange(lv)}
                      className={`py-1.5 px-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        kLevel === lv
                          ? 'bg-accent text-white border-accent'
                          : 'bg-panel border-line text-muted hover:text-ink'
                      }`}
                    >
                      {formatKanjiLevel(lv)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="form-control block">
                <FieldLabel
                  label="Bab Tujuan"
                  required
                  changed={Boolean(originalKanji && kChapterId !== kOriginalChapterId)}
                />
                <select
                  value={kChapterId}
                  onChange={(e) => setKChapterId(e.target.value)}
                  className="select select-bordered select-sm bg-panel border-line w-full text-xs"
                >
                  {drawerChapters.length === 0 ? (
                    <option value="">Belum ada bab di kategori ini</option>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="form-control block">
                <FieldLabel
                  label="Huruf Kanji"
                  required
                  changed={Boolean(originalKanji && kChar !== originalKanji.kanji)}
                />
                <input
                  type="text"
                  required
                  value={kChar}
                  onChange={(e) => setKChar(e.target.value)}
                  placeholder="contoh: 山"
                  className="input input-bordered input-sm md:input-md bg-bg border-line w-full font-japanese text-lg"
                />
              </label>

              <label className="form-control block">
                <FieldLabel
                  label="Arti Indonesia"
                  required
                  changed={Boolean(originalKanji && kMeaning !== originalKanji.meaning)}
                />
                <input
                  type="text"
                  required
                  value={kMeaning}
                  onChange={(e) => setKMeaning(e.target.value)}
                  placeholder="contoh: Gunung"
                  className="input input-bordered input-sm md:input-md bg-bg border-line w-full font-meaning"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="form-control block">
                <FieldLabel
                  label="Onyomi"
                  hint="Opsional"
                  changed={Boolean(
                    originalKanji &&
                      kOnyomi !== (originalKanji.onyomi === '-' ? '' : originalKanji.onyomi)
                  )}
                />
                <input
                  type="text"
                  value={kOnyomi}
                  onChange={(e) => setKOnyomi(e.target.value)}
                  placeholder="contoh: サン (san)"
                  className="input input-bordered input-sm md:input-md bg-bg border-line w-full font-japanese"
                />
              </label>

              <label className="form-control block">
                <FieldLabel
                  label="Kunyomi"
                  hint="Opsional"
                  changed={Boolean(
                    originalKanji &&
                      kKunyomi !== (originalKanji.kunyomi === '-' ? '' : originalKanji.kunyomi)
                  )}
                />
                <input
                  type="text"
                  value={kKunyomi}
                  onChange={(e) => setKKunyomi(e.target.value)}
                  placeholder="contoh: やま (yama)"
                  className="input input-bordered input-sm md:input-md bg-bg border-line w-full font-japanese"
                />
              </label>
            </div>
          </div>
        )}

        {kanjiStep === 1 && (
          <div className="space-y-4">
            <div className="bg-bg/50 border border-line rounded-2xl p-4 space-y-3">
              <FieldLabel
                label="Gambar Ilustrasi Kanji"
                hint="Opsional"
                changed={Boolean(originalKanji && kImage !== (originalKanji.image ?? ''))}
              />
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-24 h-24 rounded-2xl border border-dashed border-line bg-panel flex items-center justify-center overflow-hidden shrink-0">
                  {kImage ? (
                    <img src={kImage} alt="Preview Ilustrasi" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] text-muted text-center px-2">Belum ada gambar</span>
                  )}
                </div>
                <div className="flex-1 space-y-2 w-full">
                  <input
                    type="file"
                    accept="image/webp,image/png,image/jpeg,image/svg+xml"
                    onChange={handleImageUpload}
                    disabled={uploadingImg}
                    className="file-input file-input-bordered file-input-xs sm:file-input-sm w-full bg-bg border-line"
                  />
                  <p className="text-[11px] text-muted m-0">Format: WebP, PNG, JPG, atau SVG.</p>
                  {uploadingImg && <div className="text-xs text-accent font-medium">Mengunggah gambar...</div>}
                  {kImage && (
                    <button
                      type="button"
                      onClick={() => setKImage('')}
                      className="btn btn-xs btn-ghost text-error px-1"
                    >
                      Hapus Gambar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <label className="form-control w-full block">
              <FieldLabel
                label="Catatan Ingatan / Mnemonic"
                hint="Opsional"
                changed={Boolean(originalKanji && kMnemonic !== (originalKanji.mnemonic ?? ''))}
              />
              <textarea
                rows={3}
                value={kMnemonic}
                onChange={(e) => setKMnemonic(e.target.value)}
                placeholder="contoh: Bentuk tiga puncak gunung yang menjulang"
                className="textarea textarea-bordered textarea-sm md:textarea-md bg-bg border-line w-full"
              />
            </label>
          </div>
        )}

        {kanjiStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <FieldLabel
                  label="Contoh Kata"
                  hint="Opsional"
                  changed={Boolean(
                    originalKanji &&
                      JSON.stringify(normalizeExamples(kExamples)) !==
                        JSON.stringify(normalizeExamples(originalKanji.examples ?? []))
                  )}
                />
                <button
                  type="button"
                  onClick={addExampleRow}
                  className="btn btn-xs bg-pill hover:bg-pill-on border border-line text-ink rounded-lg"
                >
                  + Tambah Contoh
                </button>
              </div>

              <div className="space-y-2">
                {kExamples.map((ex, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-bg/50 border border-line rounded-xl p-2">
                    <input
                      type="text"
                      value={ex.word}
                      onChange={(e) => updateExampleRow(idx, 'word', e.target.value)}
                      placeholder="Kata (富士山)"
                      className="col-span-4 input input-bordered input-xs sm:input-sm bg-panel border-line font-japanese"
                    />
                    <input
                      type="text"
                      value={ex.reading}
                      onChange={(e) => updateExampleRow(idx, 'reading', e.target.value)}
                      placeholder="Bacaan (ふじさん)"
                      className="col-span-4 input input-bordered input-xs sm:input-sm bg-panel border-line font-japanese"
                    />
                    <input
                      type="text"
                      value={ex.meaning}
                      onChange={(e) => updateExampleRow(idx, 'meaning', e.target.value)}
                      placeholder="Arti (Gunung Fuji)"
                      className="col-span-3 input input-bordered input-xs sm:input-sm bg-panel border-line font-meaning"
                    />
                    <button
                      type="button"
                      onClick={() => removeExampleRow(idx)}
                      aria-label="Hapus baris contoh"
                      title="Hapus baris"
                      className="col-span-1 btn btn-xs btn-ghost text-error px-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Preview Kartu Kanji */}
            <div className="bg-bg/60 border border-line rounded-2xl p-4 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Pratinjau Kartu Siswa
              </div>
              <div className="bg-panel border border-line rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-4">
                  {kImage && (
                    <img
                      src={kImage}
                      alt={kChar}
                      className="w-16 h-16 rounded-xl object-cover border border-line shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-3xl font-bold font-japanese text-ink leading-none">
                      {kChar.trim() || '漢'}
                    </div>
                    <div className="text-sm font-bold font-meaning text-ink mt-1">
                      {kMeaning.trim() || 'Arti Kanji'}
                    </div>
                    <div className="text-xs text-muted mt-0.5 font-japanese">
                      On: {kOnyomi.trim() || '-'} · Kun: {kKunyomi.trim() || '-'}
                    </div>
                  </div>
                </div>

                {kMnemonic.trim() && (
                  <div className="text-xs text-muted bg-pill/40 rounded-lg px-2.5 py-1.5">
                    {kMnemonic}
                  </div>
                )}

                {validPreviewExamples.length > 0 && (
                  <div className="pt-2 border-t border-line/60 space-y-1">
                    {validPreviewExamples.map((ex, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-japanese text-ink">
                          <strong>{ex.word}</strong> {ex.reading && <span className="text-muted">({ex.reading})</span>}
                        </span>
                        <span className="font-meaning text-muted truncate">{ex.meaning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {activeChapter && (
        <BulkImportDrawer
          open={importOpen}
          onClose={() => setImportOpen(false)}
          kind="kanji"
          chapterId={activeChapter.id}
          chapterLabel={`${level === 'jft' ? 'JFT' : `JLPT ${level.toUpperCase()}`} · Bab ${activeChapter.chapter}: ${activeChapter.title}`}
          idPrefix={`${level}-k${String(activeChapter.chapter).padStart(2, '0')}`}
          existingItems={activeChapter.items}
          onImported={async (msg) => {
            await refresh(true)
            showSuccess(msg)
          }}
        />
      )}

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
