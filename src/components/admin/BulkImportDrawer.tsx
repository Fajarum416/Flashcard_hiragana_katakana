import { useEffect, useMemo, useRef, useState } from 'react'
import { SlideOverDrawer, type DrawerStep } from './SlideOverDrawer'
import { bulkUpsertKanjiItems, bulkUpsertVocabWords } from '../../lib/content'
import {
  downloadErrorReport,
  downloadImportTemplate,
  parseImportFile,
  parseKanjiImportText,
  parseVocabImportText,
  type DuplicateStrategy,
  type ImportKind,
  type ImportPreviewResult,
  type ImportRowStatus,
} from '../../lib/importer'
import type { KanjiItem } from '../../data/kanji/types'
import type { VocabWord } from '../../data/vocab/types'

interface BulkImportDrawerProps {
  open: boolean
  onClose: () => void
  kind: ImportKind
  chapterId: string
  chapterLabel: string
  idPrefix: string
  existingWords?: VocabWord[]
  existingItems?: KanjiItem[]
  onImported: (summaryMsg: string) => Promise<void> | void
}

const STEPS: DrawerStep[] = [
  { id: 'source', label: 'Sumber Data' },
  { id: 'preview', label: 'Pratinjau & Validasi' },
  { id: 'done', label: 'Hasil Import' },
]

export function BulkImportDrawer({
  open,
  onClose,
  kind,
  chapterId,
  chapterLabel,
  idPrefix,
  existingWords = [],
  existingItems = [],
  onImported,
}: BulkImportDrawerProps) {
  const [step, setStep] = useState(0)
  const [inputTab, setInputTab] = useState<'file' | 'paste'>('file')
  const [pasteText, setPasteText] = useState('')
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<ImportPreviewResult<VocabWord | KanjiItem> | null>(null)
  const [dupStrategy, setDupStrategy] = useState<DuplicateStrategy>('skip')
  const [filterStatus, setFilterStatus] = useState<'all' | ImportRowStatus>('all')
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number; errors: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setParseError(null)
    setImportError(null)
    setResult(null)
    setProgress({ done: 0, total: 0 })
    setFilterStatus('all')
  }, [open, chapterId])

  const labelItem = kind === 'vocab' ? 'Kosakata' : 'Kanji'

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return
    setParseError(null)
    setBusy(true)
    try {
      const res: ImportPreviewResult<VocabWord | KanjiItem> =
        kind === 'vocab'
          ? await parseImportFile<VocabWord>(file, 'vocab', existingWords, idPrefix)
          : await parseImportFile<KanjiItem>(file, 'kanji', existingItems, idPrefix)
      if (res.rows.length === 0) {
        setParseError('File tidak berisi baris data yang bisa dibaca.')
        return
      }
      setFileName(file.name)
      setPreview(res)
      setFilterStatus('all')
      setStep(1)
    } catch (err: any) {
      setParseError(err?.message ?? 'Gagal membaca file import.')
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleParsePaste = () => {
    setParseError(null)
    if (!pasteText.trim()) {
      setParseError('Tempelkan data CSV, tabel Excel/Google Sheets, atau JSON terlebih dahulu.')
      return
    }
    try {
      const res =
        kind === 'vocab'
          ? parseVocabImportText(pasteText, existingWords, idPrefix)
          : parseKanjiImportText(pasteText, existingItems, idPrefix)
      if (res.rows.length === 0) {
        setParseError('Tidak ada baris data yang terdeteksi.')
        return
      }
      setFileName('Tempel Teks Langsung')
      setPreview(res)
      setFilterStatus('all')
      setStep(1)
    } catch (err: any) {
      setParseError(err?.message ?? 'Format teks tidak valid.')
    }
  }

  const readyToSaveCount = useMemo(() => {
    if (!preview) return 0
    return preview.newCount + (dupStrategy === 'update' ? preview.duplicateCount : 0)
  }, [preview, dupStrategy])

  const filteredRows = useMemo(() => {
    if (!preview) return []
    if (filterStatus === 'all') return preview.rows
    return preview.rows.filter((r) => r.status === filterStatus)
  }, [preview, filterStatus])

  const handleExecuteImport = async () => {
    if (!preview || readyToSaveCount === 0) return
    setBusy(true)
    setImportError(null)
    const toWrite = preview.rows
      .filter((r) => r.status === 'new' || (r.status === 'duplicate' && dupStrategy === 'update'))
      .map((r) => r.data!)
      .filter(Boolean)

    const added = preview.newCount
    const updated = dupStrategy === 'update' ? preview.duplicateCount : 0
    const skipped = dupStrategy === 'skip' ? preview.duplicateCount : 0
    const errors = preview.errorCount

    setProgress({ done: 0, total: toWrite.length })
    try {
      if (kind === 'vocab') {
        await bulkUpsertVocabWords(
          chapterId,
          toWrite as VocabWord[],
          existingWords.length,
          (done, total) => setProgress({ done, total }),
        )
      } else {
        await bulkUpsertKanjiItems(
          chapterId,
          toWrite as KanjiItem[],
          existingItems.length,
          (done, total) => setProgress({ done, total }),
        )
      }
      setResult({ added, updated, skipped, errors })
      setStep(2)
      const parts: string[] = []
      if (added > 0) parts.push(`${added} ditambah`)
      if (updated > 0) parts.push(`${updated} diperbarui`)
      await onImported(`Import ${labelItem} selesai: ${parts.join(', ') || 'selesai'}.`)
    } catch (err: any) {
      setImportError(err?.message ?? 'Terjadi kesalahan saat menyimpan ke database.')
    } finally {
      setBusy(false)
    }
  }

  const footer = (
    <div className="flex items-center justify-between gap-2 w-full">
      <div className="text-xs text-muted">
        {step === 1 && preview && (
          <span>
            Siap diproses: <strong className="text-ink">{readyToSaveCount}</strong> {labelItem}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {step === 0 && (
          <>
            <button type="button" disabled={busy} onClick={onClose} className="btn btn-sm sm:btn-md">
              Tutup
            </button>
            {inputTab === 'paste' && (
              <button
                type="button"
                disabled={busy || !pasteText.trim()}
                onClick={handleParsePaste}
                className="btn btn-sm sm:btn-md bg-accent hover:opacity-90 border-0 text-white"
              >
                Pratinjau Data →
              </button>
            )}
          </>
        )}
        {step === 1 && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(0)}
              className="btn btn-sm sm:btn-md"
            >
              ← Ganti Sumber
            </button>
            <button
              type="button"
              disabled={busy || readyToSaveCount === 0}
              onClick={() => void handleExecuteImport()}
              className="btn btn-sm sm:btn-md bg-[#5eb839] hover:bg-[#4ea32e] border-0 text-white"
            >
              {busy ? (
                <>
                  <span className="loading loading-spinner loading-xs" />
                  <span>Menyimpan ({progress.done}/{progress.total})...</span>
                </>
              ) : (
                `Simpan ${readyToSaveCount} ${labelItem}`
              )}
            </button>
          </>
        )}
        {step === 2 && (
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm sm:btn-md bg-accent hover:opacity-90 border-0 text-white"
          >
            Selesai
          </button>
        )}
      </div>
    </div>
  )

  return (
    <SlideOverDrawer
      open={open}
      onClose={onClose}
      busy={busy}
      mode="add"
      title={`Import Data ${labelItem}`}
      subtitle={`Target bab: ${chapterLabel}`}
      steps={STEPS}
      activeStep={step}
      canJumpToStep={(idx) => (idx === 0 && step === 1 && !busy) || (idx === 1 && Boolean(preview) && step < 2 && !busy)}
      onStepChange={(idx) => {
        if (!busy && idx < 2) setStep(idx)
      }}
      maxWidthClass="max-w-3xl"
      footer={footer}
    >
      {/* STEP 0: PILIH SUMBER DATA & TEMPLATE */}
      {step === 0 && (
        <div className="space-y-5">
          {/* Template Downloader */}
          <div className="bg-bg/60 border border-line rounded-2xl p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-ink">1. Unduh Template Resmi (Disarankan)</div>
                <p className="text-[11px] text-muted m-0">
                  Isi data di template agar kolom dan aksara Jepang terbaca 100% akurat.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => void downloadImportTemplate(kind, 'xlsx')}
                  className="btn btn-xs bg-pill hover:bg-pill-on border border-line text-ink rounded-lg"
                >
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => void downloadImportTemplate(kind, 'csv')}
                  className="btn btn-xs bg-pill hover:bg-pill-on border border-line text-ink rounded-lg"
                >
                  CSV (UTF-8)
                </button>
                <button
                  type="button"
                  onClick={() => void downloadImportTemplate(kind, 'json')}
                  className="btn btn-xs bg-pill hover:bg-pill-on border border-line text-ink rounded-lg"
                >
                  JSON
                </button>
              </div>
            </div>
            <div className="text-[11px] text-muted bg-panel border border-line/70 rounded-xl px-3 py-2">
              {kind === 'vocab' ? (
                <>
                  Kolom wajib: <strong className="text-ink">kana</strong>, <strong className="text-ink">meaning</strong>{' '}
                  (opsional: romaji, kanji, type, exampleJp, exampleId).
                </>
              ) : (
                <>
                  Kolom wajib: <strong className="text-ink">kanji</strong>, <strong className="text-ink">meaning</strong>{' '}
                  (opsional: onyomi, kunyomi, mnemonic, examples). Contoh kata di Excel pakai format{' '}
                  <code className="text-accent">kata|bacaan|arti; kata2|bacaan2|arti2</code>. Ilustrasi tetap di-upload manual per kartu.
                </>
              )}
            </div>
          </div>

          {/* Input Mode Switcher */}
          <div>
            <div className="inline-flex bg-pill border border-line rounded-xl p-1 mb-3">
              <button
                type="button"
                onClick={() => setInputTab('file')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  inputTab === 'file' ? 'bg-panel text-accent shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                Upload File (.xlsx / .csv / .json)
              </button>
              <button
                type="button"
                onClick={() => setInputTab('paste')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  inputTab === 'paste' ? 'bg-panel text-accent shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                Copy-Paste Excel / Teks / JSON
              </button>
            </div>

            {inputTab === 'file' ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  void handleFileChange(e.dataTransfer.files?.[0])
                }}
                className="border-2 border-dashed border-line hover:border-accent/60 rounded-2xl bg-bg/40 p-8 text-center space-y-3 transition-colors"
              >
                <div className="text-3xl">📄</div>
                <div>
                  <div className="text-sm font-bold text-ink">Seret file ke sini atau pilih dari perangkat</div>
                  <p className="text-xs text-muted mt-1">
                    Mendukung Excel (<code>.xlsx</code>, <code>.xls</code>), <code>.csv</code>, <code>.tsv</code>, dan <code>.json</code>
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt,.json"
                  onChange={(e) => void handleFileChange(e.target.files?.[0])}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-sm bg-accent hover:opacity-90 border-0 text-white rounded-xl px-5"
                >
                  {busy ? 'Membaca file...' : 'Pilih File'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={10}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={
                    kind === 'vocab'
                      ? 'Tempel langsung baris dari Excel / Google Sheets (Tab), CSV, atau array JSON:\nせんせい\tsensei\tGuru\t先生\tKata Benda'
                      : 'Tempel langsung baris dari Excel / Google Sheets (Tab), CSV, atau array JSON:\n山\tサン\tやま\tGunung\tTiga puncak gunung'
                  }
                  className="textarea textarea-bordered w-full bg-bg border-line font-mono text-xs leading-relaxed"
                />
              </div>
            )}
          </div>

          {parseError && (
            <div className="alert alert-error text-xs sm:text-sm py-2.5 rounded-xl">
              <span>{parseError}</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: PRATINJAU & VALIDASI */}
      {step === 1 && preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              Sumber: <strong className="text-ink">{fileName}</strong> · Format:{' '}
              <span className="uppercase font-bold text-accent">{preview.format}</span>
            </span>
            {preview.errorCount > 0 && (
              <button
                type="button"
                onClick={() => downloadErrorReport(preview.rows, kind)}
                className="btn btn-xs btn-outline border-error/50 text-error rounded-lg"
              >
                Unduh Baris Error ({preview.errorCount})
              </button>
            )}
          </div>

          {/* 3 Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-bg/50 border border-ok/40 rounded-xl p-3">
              <div className="text-[11px] text-ok font-semibold">Baru</div>
              <div className="text-xl font-black text-ink tabular-nums">{preview.newCount}</div>
            </div>
            <div className="bg-bg/50 border border-accent/40 rounded-xl p-3">
              <div className="text-[11px] text-accent font-semibold">Sudah Ada (Duplikat)</div>
              <div className="text-xl font-black text-ink tabular-nums">{preview.duplicateCount}</div>
            </div>
            <div className="bg-bg/50 border border-error/40 rounded-xl p-3">
              <div className="text-[11px] text-error font-semibold">Error (Dilewati)</div>
              <div className="text-xl font-black text-ink tabular-nums">{preview.errorCount}</div>
            </div>
          </div>

          {/* Duplicate Handling Strategy */}
          {preview.duplicateCount > 0 && (
            <div className="bg-bg/60 border border-line rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                <strong className="text-ink">Penanganan {preview.duplicateCount} data duplikat:</strong>
                <div className="text-[11px] text-muted">
                  {kind === 'kanji'
                    ? 'Mode Perbarui tetap mempertahankan gambar ilustrasi manual yang sudah ada.'
                    : 'Mode Perbarui menimpa arti/contoh lama tanpa membuat kartu ganda.'}
                </div>
              </div>
              <div className="join bg-pill p-0.5 rounded-lg border border-line">
                <button
                  type="button"
                  onClick={() => setDupStrategy('skip')}
                  className={`join-item btn btn-xs border-0 ${
                    dupStrategy === 'skip' ? 'bg-accent text-white' : 'btn-ghost text-muted'
                  }`}
                >
                  Lewati (Skip)
                </button>
                <button
                  type="button"
                  onClick={() => setDupStrategy('update')}
                  className={`join-item btn btn-xs border-0 ${
                    dupStrategy === 'update' ? 'bg-accent text-white' : 'btn-ghost text-muted'
                  }`}
                >
                  Perbarui (Update)
                </button>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', `Semua (${preview.rows.length})`],
                ['new', `Baru (${preview.newCount})`],
                ['duplicate', `Duplikat (${preview.duplicateCount})`],
                ['error', `Error (${preview.errorCount})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterStatus(key)}
                className={`btn btn-xs rounded-full ${
                  filterStatus === key
                    ? 'bg-accent text-white border-0'
                    : 'bg-pill border-line text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto max-h-[320px] border border-line rounded-xl bg-bg/30">
            <table className="table table-xs table-pin-rows">
              <thead>
                <tr>
                  <th>Baris</th>
                  <th>Status</th>
                  <th>{kind === 'vocab' ? 'Kana / Kanji' : 'Kanji'}</th>
                  <th>Arti</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.rawPreview.kana ?? row.rawPreview.kanji}`}>
                    <th className="text-muted tabular-nums">{row.rowNumber}</th>
                    <td>
                      {row.status === 'new' && (
                        <span className="badge badge-soft badge-success badge-xs font-semibold">Baru</span>
                      )}
                      {row.status === 'duplicate' && (
                        <span className="badge badge-soft badge-info badge-xs font-semibold">
                          {dupStrategy === 'update' ? 'Update' : 'Skip'}
                        </span>
                      )}
                      {row.status === 'error' && (
                        <span className="badge badge-soft badge-error badge-xs font-semibold">Error</span>
                      )}
                    </td>
                    <td className="font-japanese font-bold text-ink">
                      {kind === 'vocab' ? (
                        <>
                          {row.rawPreview.kanji || row.rawPreview.kana || '-'}
                          {row.rawPreview.kanji && (
                            <span className="block text-[10px] font-normal text-muted">{row.rawPreview.kana}</span>
                          )}
                        </>
                      ) : (
                        row.rawPreview.kanji || '-'
                      )}
                    </td>
                    <td className="max-w-[160px] truncate">{row.rawPreview.meaning || '-'}</td>
                    <td className="text-[11px]">
                      {row.status === 'error' ? (
                        <span className="text-error font-medium">{row.errors.join('; ')}</span>
                      ) : row.status === 'duplicate' ? (
                        <span className="text-muted">Sudah ada di bab ini</span>
                      ) : (
                        <span className="text-muted">Siap disimpan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {busy && progress.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted">
                <span>Mengirim batch ke Supabase...</span>
                <span>
                  {progress.done} / {progress.total}
                </span>
              </div>
              <progress className="progress progress-success w-full" value={progress.done} max={progress.total} />
            </div>
          )}

          {importError && (
            <div className="alert alert-error text-xs sm:text-sm py-2.5 rounded-xl">
              <span>{importError}</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: HASIL IMPORT */}
      {step === 2 && result && (
        <div className="py-8 text-center space-y-4">
          <div className="text-4xl">✅</div>
          <div>
            <h3 className="text-lg font-bold text-ink m-0">Import {labelItem} Selesai!</h3>
            <p className="text-xs text-muted mt-1">Data pada {chapterLabel} sudah diperbarui.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg mx-auto text-left">
            <div className="bg-bg/50 border border-ok/40 rounded-xl p-3">
              <div className="text-[11px] text-ok font-semibold">Ditambah</div>
              <div className="text-xl font-black text-ink">{result.added}</div>
            </div>
            <div className="bg-bg/50 border border-accent/40 rounded-xl p-3">
              <div className="text-[11px] text-accent font-semibold">Diperbarui</div>
              <div className="text-xl font-black text-ink">{result.updated}</div>
            </div>
            <div className="bg-bg/50 border border-line rounded-xl p-3">
              <div className="text-[11px] text-muted font-semibold">Dilewati</div>
              <div className="text-xl font-black text-ink">{result.skipped}</div>
            </div>
            <div className="bg-bg/50 border border-error/40 rounded-xl p-3">
              <div className="text-[11px] text-error font-semibold">Error</div>
              <div className="text-xl font-black text-ink">{result.errors}</div>
            </div>
          </div>
        </div>
      )}
    </SlideOverDrawer>
  )
}
