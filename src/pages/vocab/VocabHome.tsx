import { useNavigate, useSearchParams } from 'react-router-dom'
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
    <div className="w-full space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
            Flashcard Kosakata
          </h1>
          <p className="text-sm md:text-base text-muted mt-1">
            Pilih level JLPT dan bab kosakata untuk mulai menghafal dengan metode flashcard.
          </p>
        </div>

        {/* Level Switcher (N5 / N4) */}
        <div className="flex items-center gap-2 bg-pill p-1 rounded-xl border border-line self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setLevel('n5')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              level === 'n5'
                ? 'bg-panel text-accent shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            JLPT N5
          </button>
          <button
            type="button"
            onClick={() => setLevel('n4')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              level === 'n4'
                ? 'bg-panel text-accent shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            JLPT N4
          </button>
        </div>
      </div>

      {/* Settings bar */}
      <div className="flex items-center justify-between bg-panel border border-line p-3.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">Tampilkan Romaji di Sisi Depan</span>
          <span className="text-xs text-muted hidden sm:inline">(Membantu pemula yang belum lancar baca kana)</span>
        </div>
        <input
          type="checkbox"
          checked={showRomajiFront}
          onChange={toggleShowRomajiFront}
          className="toggle toggle-success h-6 w-11"
        />
      </div>

      {/* Chapters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {chapters.map((ch) => {
          const stats = getChapterStats(ch.words)
          const percentLearned = Math.round((stats.learned / ch.words.length) * 100) || 0

          return (
            <div
              key={ch.chapter}
              className="bg-panel border border-line rounded-2xl p-5 hover:border-accent/40 transition-all flex flex-col justify-between gap-4 group shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="badge badge-sm font-bold text-accent bg-accent/10 border-accent/20 px-2.5 py-2">
                    Bab {ch.chapter}
                  </span>
                  <span className="text-xs font-semibold text-muted">
                    {ch.words.length} Kosakata
                  </span>
                </div>

                <h2 className="text-lg font-bold text-ink group-hover:text-accent transition-colors">
                  {ch.title}
                </h2>
                {ch.description && (
                  <p className="text-sm text-muted mt-1 line-clamp-2">
                    {ch.description}
                  </p>
                )}
              </div>

              {/* Progress & Stats */}
              <div className="space-y-3 pt-3 border-t border-line/60">
                <div className="flex items-center justify-between text-xs font-medium text-muted">
                  <span>Progres: {stats.learned}/{ch.words.length} dihafal</span>
                  <span>Akurasi: {stats.accuracy}%</span>
                </div>

                <div className="w-full bg-pill rounded-full h-2 overflow-hidden border border-line/40">
                  <div
                    className="bg-accent h-full transition-all duration-300"
                    style={{ width: `${percentLearned}%` }}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/vocab/${level}/${ch.chapter}`)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent hover:opacity-90 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-opacity"
                  >
                    <span>Mulai Belajar</span>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
