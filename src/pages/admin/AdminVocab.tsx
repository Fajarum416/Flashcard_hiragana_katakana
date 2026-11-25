import { useEffect, useState } from 'react'
import {
  deleteVocabChapter,
  deleteVocabWord,
  parseVocabCSV,
  seedDefaultVocabToDB,
  upsertVocabChapter,
  upsertVocabWord,
  type ManagedVocabChapter,
} from '../../lib/content'
import { useContentStore } from '../../store/useContentStore'
import { showToast } from '../../store/useToast'
import type { VocabWord } from '../../data/vocab/types'

export default function AdminVocab() {
  const { vocabChapters, refresh } = useContentStore()
  const [level, setLevel] = useState<'n5' | 'n4'>('n5')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)

  // Form Bab
  const [chapterModalOpen, setChapterModalOpen] = useState(false)
  const [chEditId, setChEditId] = useState<string | undefined>()
  const [chNum, setChNum] = useState(1)
  const [chTitle, setChTitle] = useState('')
  const [chDesc, setChDesc] = useState('')
  const [chPublished, setChPublished] = useState(true)

  // Form Kosakata
  const [wordModalOpen, setWordModalOpen] = useState(false)
  const [wId, setWId] = useState('')
  const [wKanji, setWKanji] = useState('')
  const [wKana, setWKana] = useState('')
  const [wRomaji, setWRomaji] = useState('')
  const [wMeaning, setWMeaning] = useState('')
  const [wType, setWType] = useState('')
  const [wExJp, setWExJp] = useState('')
  const [wExId, setWExId] = useState('')

  // Import CSV
  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [csvText, setCsvText] = useState('')

  useEffect(() => {
    void refresh(true)
  }, [refresh])

  const chapters = vocabChapters.filter((c) => c.level === level)
  const activeChapter: ManagedVocabChapter | undefined =
    chapters.find((c) => c.id === selectedChapterId) ?? chapters[0]

  const isBuiltInOnly = activeChapter?.id.startsWith('builtin-')

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

  const openNewChapter = () => {
    const nextNum = chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapter)) + 1 : 1
    setChEditId(undefined)
    setChNum(nextNum)
    setChTitle(`Bab ${nextNum}: `)
    setChDesc('')
    setChPublished(true)
    setChapterModalOpen(true)
  }

  const openEditChapter = (ch: ManagedVocabChapter) => {
    setChEditId(ch.id)
    setChNum(ch.chapter)
    setChTitle(ch.title)
    setChDesc(ch.description ?? '')
    setChPublished(ch.published)
    setChapterModalOpen(true)
  }

  const saveChapter = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const newId = await upsertVocabChapter({
        id: chEditId,
        level,
        chapter: chNum,
        title: chTitle,
        description: chDesc,
        published: chPublished,
      })
      await refresh(true)
      setSelectedChapterId(newId)
      setChapterModalOpen(false)
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

  const openNewWord = () => {
    if (!activeChapter) return
    setWId(`${level}-b${String(activeChapter.chapter).padStart(2, '0')}-${Date.now().toString().slice(-4)}`)
    setWKanji('')
    setWKana('')
    setWRomaji('')
    setWMeaning('')
    setWType('Kata Benda')
    setWExJp('')
    setWExId('')
    setWordModalOpen(true)
  }

  const openEditWord = (w: VocabWord) => {
    setWId(w.id)
    setWKanji(w.kanji ?? '')
    setWKana(w.kana)
    setWRomaji(w.romaji)
    setWMeaning(w.meaning)
    setWType(w.type ?? '')
    setWExJp(w.exampleJp ?? '')
    setWExId(w.exampleId ?? '')
    setWordModalOpen(true)
  }

  const saveWord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeChapter) return
    setBusy(true)
    setError(null)
    try {
      const existingIdx = activeChapter.words.findIndex((w) => w.id === wId)
      const sortOrder = existingIdx >= 0 ? existingIdx : activeChapter.words.length
      await upsertVocabWord(
        activeChapter.id,
        {
          id: wId,
          kanji: wKanji || undefined,
          kana: wKana,
          romaji: wRomaji,
          meaning: wMeaning,
          type: wType || undefined,
          exampleJp: wExJp || undefined,
          exampleId: wExId || undefined,
        },
        sortOrder
      )
      await refresh(true)
      setWordModalOpen(false)
      showSuccess('Kosakata berhasil disimpan ke Supabase.')
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

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeChapter || !csvText.trim()) return
    setBusy(true)
    setError(null)
    try {
      const prefix = `${level}-b${String(activeChapter.chapter).padStart(2, '0')}`
      const parsed = parseVocabCSV(csvText, prefix)
      if (parsed.length === 0) {
        setError('Tidak ada baris valid. Format: kana, romaji, meaning, [kanji], [type], [exampleJp], [exampleId]')
        setBusy(false)
        return
      }
      const startOrder = activeChapter.words.length
      for (let i = 0; i < parsed.length; i++) {
        await upsertVocabWord(activeChapter.id, parsed[i], startOrder + i)
      }
      await refresh(true)
      setCsvText('')
      setCsvModalOpen(false)
      showSuccess(`Berhasil mengimpor ${parsed.length} kosakata ke ${activeChapter.title}.`)
    } catch (err: any) {
      setError(err?.message ?? 'Gagal import CSV')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink m-0">CMS Kelola Kosakata</h2>
          <p className="text-xs text-muted mt-1">
            Kelola bab & daftar kosakata resmi Enna Card langsung ke database Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSeed()}
            className="btn btn-sm btn-outline border-line text-ink hover:bg-pill rounded-xl cursor-pointer"
          >
            Seed Data Bawaan
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={openNewChapter}
            className="btn btn-sm bg-accent hover:opacity-90 text-white border-0 rounded-xl cursor-pointer"
          >
            + Tambah Bab
          </button>
        </div>
      </div>

      {isBuiltInOnly && (
        <div className="bg-warning/15 border border-warning/40 text-ink rounded-xl p-3.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2">
          <span>
            Data saat ini masih berasal dari fallback kode lokal. Klik <strong>Seed Data Bawaan</strong> agar bab & kosakata masuk ke Supabase untuk diedit.
          </span>
        </div>
      )}

      {/* Level Switcher */}
      <div className="inline-flex bg-pill border border-line rounded-xl p-1">
        {(['n5', 'n4'] as const).map((lv) => (
          <button
            key={lv}
            type="button"
            onClick={() => {
              setLevel(lv)
              setSelectedChapterId('')
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              level === lv ? 'bg-base-100 text-accent border border-line shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            JLPT {lv.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sidebar Daftar Bab */}
        <div className="lg:col-span-4 space-y-2">
          {chapters.map((ch) => {
            const isSelected = activeChapter?.id === ch.id
            return (
              <div
                key={ch.id}
                onClick={() => setSelectedChapterId(ch.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-base-200 border-accent text-ink shadow-sm'
                    : 'bg-panel border-line hover:border-accent/40 text-ink'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-accent">Bab {ch.chapter}</span>
                    {!ch.published && <span className="badge badge-xs badge-warning">Draft</span>}
                  </div>
                  <div className="font-bold text-sm truncate">{ch.title}</div>
                  <div className="text-xs text-muted">{ch.words.length} kosakata</div>
                </div>
                {!ch.id.startsWith('builtin-') && (
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openEditChapter(ch)}
                      className="btn btn-xs btn-ghost text-muted hover:text-ink"
                      title="Edit Bab"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                        <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Panel Daftar Kata */}
        <div className="lg:col-span-8 bg-panel border border-line rounded-2xl p-4 sm:p-5 space-y-4">
          {activeChapter ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <h3 className="font-bold text-base text-ink m-0">{activeChapter.title}</h3>
                  <p className="text-xs text-muted m-0">{activeChapter.words.length} kosakata</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || isBuiltInOnly}
                    onClick={() => setCsvModalOpen(true)}
                    className="btn btn-xs sm:btn-sm btn-outline border-line text-ink rounded-xl cursor-pointer"
                  >
                    Import CSV
                  </button>
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

              {activeChapter.words.length === 0 ? (
                <p className="text-sm text-muted py-8 text-center">Belum ada kosakata di bab ini.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-fixed w-full min-w-[680px]">
                    <thead>
                      <tr>
                        <th className="w-12">#</th>
                        <th className="w-36">Kosakata</th>
                        <th className="w-44">Arti</th>
                        <th className="w-40">Bacaan</th>
                        <th className="w-28">Jenis</th>
                        <th className="w-32"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeChapter.words.map((w, idx) => (
                        <tr key={w.id}>
                          <th>{idx + 1}</th>
                          <td className="font-bold font-japanese text-base truncate" title={w.kanji || w.kana}>
                            {w.kanji || w.kana}
                          </td>
                          <td className="font-medium text-sm truncate" title={w.meaning}>
                            {w.meaning}
                          </td>
                          <td>
                            <div className="font-japanese text-sm truncate" title={w.kana}>
                              {w.kana}
                            </div>
                            <span className="badge badge-ghost badge-sm max-w-full truncate" title={w.romaji}>
                              {w.romaji}
                            </span>
                          </td>
                          <td className="text-xs opacity-70 truncate" title={w.type || '-'}>
                            {w.type || '-'}
                          </td>
                          <th className="text-right whitespace-nowrap space-x-1">
                            <button
                              type="button"
                              disabled={isBuiltInOnly}
                              onClick={() => openEditWord(w)}
                              className="btn btn-ghost btn-sm text-sm"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={isBuiltInOnly}
                              onClick={() => void handleDeleteWord(w.id)}
                              className="btn btn-ghost btn-sm text-sm text-error"
                            >
                              Hapus
                            </button>
                          </th>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>#</th>
                        <th>Kosakata</th>
                        <th>Arti</th>
                        <th>Bacaan</th>
                        <th>Jenis</th>
                        <th></th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted py-8 text-center">Pilih atau buat bab terlebih dahulu.</p>
          )}
        </div>
      </div>

      {/* Modal Tambah/Edit Bab */}
      <dialog className={`modal ${chapterModalOpen ? 'modal-open' : ''}`}>
        <form onSubmit={saveChapter} className="modal-box bg-panel border border-line text-ink space-y-3">
          <h3 className="font-bold text-lg">{chEditId ? 'Edit Bab Kosakata' : 'Tambah Bab Kosakata'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text text-xs font-semibold">Nomor Bab</span>
              <input
                type="number"
                min={1}
                required
                value={chNum}
                onChange={(e) => setChNum(parseInt(e.target.value, 10) || 1)}
                className="input input-bordered input-sm bg-bg border-line"
              />
            </label>
            <label className="form-control flex flex-row items-center gap-2 pt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={chPublished}
                onChange={(e) => setChPublished(e.target.checked)}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="text-sm font-medium">Publikasikan</span>
            </label>
          </div>
          <label className="form-control w-full">
            <span className="label-text text-xs font-semibold">Judul Bab</span>
            <input
              type="text"
              required
              value={chTitle}
              onChange={(e) => setChTitle(e.target.value)}
              className="input input-bordered input-sm bg-bg border-line w-full"
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text text-xs font-semibold">Deskripsi</span>
            <textarea
              rows={2}
              value={chDesc}
              onChange={(e) => setChDesc(e.target.value)}
              className="textarea textarea-bordered textarea-sm bg-bg border-line w-full"
            />
          </label>
          <div className="modal-action">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setChapterModalOpen(false)}>
              Batal
            </button>
            <button type="submit" disabled={busy} className="btn btn-sm bg-accent text-white border-0">
              Simpan Bab
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal Tambah/Edit Kosakata */}
      <dialog className={`modal ${wordModalOpen ? 'modal-open' : ''}`}>
        <form onSubmit={saveWord} className="modal-box bg-panel border border-line text-ink space-y-3 max-w-lg">
          <h3 className="font-bold text-lg">Simpan Kosakata</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text text-xs font-semibold">Kanji (Opsional)</span>
              <input
                type="text"
                value={wKanji}
                onChange={(e) => setWKanji(e.target.value)}
                placeholder="contoh: 先生"
                className="input input-bordered input-sm bg-bg border-line font-japanese"
              />
            </label>
            <label className="form-control">
              <span className="label-text text-xs font-semibold">Kana *</span>
              <input
                type="text"
                required
                value={wKana}
                onChange={(e) => setWKana(e.target.value)}
                placeholder="contoh: せんせい"
                className="input input-bordered input-sm bg-bg border-line font-japanese"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text text-xs font-semibold">Romaji *</span>
              <input
                type="text"
                required
                value={wRomaji}
                onChange={(e) => setWRomaji(e.target.value)}
                placeholder="contoh: sensei"
                className="input input-bordered input-sm bg-bg border-line"
              />
            </label>
            <label className="form-control">
              <span className="label-text text-xs font-semibold">Jenis Kata</span>
              <input
                type="text"
                value={wType}
                onChange={(e) => setWType(e.target.value)}
                placeholder="Kata Benda / Kerja"
                className="input input-bordered input-sm bg-bg border-line"
              />
            </label>
          </div>
          <label className="form-control w-full">
            <span className="label-text text-xs font-semibold">Arti Bahasa Indonesia *</span>
            <input
              type="text"
              required
              value={wMeaning}
              onChange={(e) => setWMeaning(e.target.value)}
              className="input input-bordered input-sm bg-bg border-line w-full"
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text text-xs font-semibold">Contoh Kalimat (Jepang)</span>
            <input
              type="text"
              value={wExJp}
              onChange={(e) => setWExJp(e.target.value)}
              className="input input-bordered input-sm bg-bg border-line w-full font-japanese"
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text text-xs font-semibold">Arti Contoh Kalimat</span>
            <input
              type="text"
              value={wExId}
              onChange={(e) => setWExId(e.target.value)}
              className="input input-bordered input-sm bg-bg border-line w-full"
            />
          </label>
          <div className="modal-action">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setWordModalOpen(false)}>
              Batal
            </button>
            <button type="submit" disabled={busy} className="btn btn-sm bg-accent text-white border-0">
              Simpan Kosakata
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal Import CSV */}
      <dialog className={`modal ${csvModalOpen ? 'modal-open' : ''}`}>
        <form onSubmit={handleCsvImport} className="modal-box bg-panel border border-line text-ink space-y-3 max-w-lg">
          <h3 className="font-bold text-lg">Import CSV Kosakata</h3>
          <p className="text-xs text-muted">
            Format per baris (pisahkan dengan koma atau titik koma): <br />
            <code>kana, romaji, meaning, kanji, type, exampleJp, exampleId</code>
          </p>
          <textarea
            rows={7}
            required
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'わたし, watashi, Saya, 私, Kata Ganti, わたしは学生です。, Saya adalah mahasiswa.'}
            className="textarea textarea-bordered textarea-sm bg-bg border-line w-full font-mono text-xs"
          />
          <div className="modal-action">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setCsvModalOpen(false)}>
              Batal
            </button>
            <button type="submit" disabled={busy} className="btn btn-sm bg-accent text-white border-0">
              Import Sekarang
            </button>
          </div>
        </form>
      </dialog>
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
