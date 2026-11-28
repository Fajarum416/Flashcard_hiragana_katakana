import { useNavigate, useSearchParams } from 'react-router-dom'
import { SlidingTabs } from '../../components/Segmented'
import { useContentStore } from '../../store/useContentStore'
import { useVocabStore } from '../../store/useVocabStore'

export default function VocabHome() {
  const [searchParams, setSearchParams] = useSearchParams()
  const level: 'n5' | 'n4' = searchParams.get('level')?.toLowerCase() === 'n4' ? 'n4' : 'n5'
  const setLevel = (next: 'n5' | 'n4') => setSearchParams({ level: next })
  const navigate = useNavigate()
  const { getChapterStats, showRomajiFront, toggleShowRomajiFront } = useVocabStore()
  const vocabChapters = useContentStore((s) => s.vocabChapters)

  const chapters = vocabChapters.filter((c) => c.level === level)

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-line pb-3 sm:pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
            Flashcard Kosakata
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted mt-1">
            Pilih level JLPT dan bab kosakata untuk mulai menghafal dengan metode flashcard.
          </p>
        </div>

        {/* Level Switcher (N5 / N4) */}
        <SlidingTabs
          ariaLabel="Pilih Level Kosakata"
          value={level}
          onChange={setLevel}
          className="inline-flex items-center gap-1.5 sm:gap-2 bg-pill p-1 rounded-xl border border-line self-start sm:self-auto"
          indicatorClassName="bg-panel rounded-lg shadow-sm"
          buttonClassName="px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold"
          activeButtonClassName="text-accent"
          inactiveButtonClassName="text-muted hover:text-ink"
          options={[
            { value: 'n5', label: 'JLPT N5' },
            { value: 'n4', label: 'JLPT N4' },
          ]}
        />
      </div>

      {/* Settings bar */}
      <div className="flex items-center justify-between bg-panel border border-line p-2.5 sm:p-3.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-medium text-ink">Tampilkan Romaji di Sisi Depan</span>
          <span className="text-xs text-muted hidden sm:inline">(Membantu pemula yang belum lancar baca kana)</span>
        </div>
        <input
          type="checkbox"
          checked={showRomajiFront}
          onChange={toggleShowRomajiFront}
          className="toggle toggle-success toggle-sm sm:toggle-md"
        />
      </div>

      {/* Chapters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {chapters.map((ch) => {
          const stats = getChapterStats(ch.words)
          const percentLearned = Math.round((stats.learned / ch.words.length) * 100) || 0

          return (
            <div
              key={ch.chapter}
              className="bg-panel border border-line rounded-xl sm:rounded-2xl p-3.5 sm:p-5 hover:border-accent/40 transition-all flex flex-col justify-between gap-2.5 sm:gap-4 group shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                  <span className="badge badge-soft badge-accent badge-sm font-bold">
                    Bab {ch.chapter}
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold text-muted">
                    {ch.words.length} Kosakata
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-ink group-hover:text-accent transition-colors">
                  {ch.title}
                </h2>
                {ch.description && (
                  <p className="text-xs sm:text-sm text-muted mt-0.5 sm:mt-1 line-clamp-2">
                    {ch.description}
                  </p>
                )}
              </div>

              {/* Progress & Stats */}
              <div className="space-y-2 sm:space-y-3 pt-2.5 sm:pt-3 border-t border-line/60">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium text-muted">
                  <span>Progres: {stats.learned}/{ch.words.length} dihafal</span>
                  <span>Akurasi: {stats.accuracy}%</span>
                </div>

                <div className="w-full bg-pill rounded-full h-1.5 sm:h-2 overflow-hidden border border-line/40">
                  <div
                    className="bg-accent h-full transition-all duration-300"
                    style={{ width: `${percentLearned}%` }}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-0.5 sm:pt-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/vocab/${level}/${ch.chapter}`)}
                    className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-accent hover:opacity-90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-opacity"
                  >
                    <span>Mulai Belajar</span>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
