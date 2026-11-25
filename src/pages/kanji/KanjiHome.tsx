import { useNavigate, useSearchParams } from 'react-router-dom'
import { type KanjiLevel } from '../../data/kanji'
import { useContentStore } from '../../store/useContentStore'
import { useKanjiStore } from '../../store/useKanjiStore'

export default function KanjiHome() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawLevel = searchParams.get('level')?.toLowerCase()
  const level: KanjiLevel = rawLevel === 'n4' ? 'n4' : rawLevel === 'jft' ? 'jft' : 'n5'
  const setLevel = (next: KanjiLevel) => setSearchParams({ level: next })
  const navigate = useNavigate()
  const { getChapterStats } = useKanjiStore()
  const kanjiChapters = useContentStore((s) => s.kanjiChapters)

  const chapters = kanjiChapters.filter((c) => c.level === level)

  return (
    <div className="w-full space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
            Flashcard Kanji
          </h1>
          <p className="text-sm md:text-base text-muted mt-1">
            Pilih level (JLPT N5, JLPT N4, atau JFT) dan bab Kanji untuk mulai menghafal dengan sistem SRS.
          </p>
        </div>

        {/* Level Switcher (N5 / N4 / JFT) */}
        <div className="flex items-center gap-1.5 bg-pill p-1 rounded-xl border border-line self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setLevel('n5')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
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
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              level === 'n4'
                ? 'bg-panel text-accent shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            JLPT N4
          </button>
          <button
            type="button"
            onClick={() => setLevel('jft')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              level === 'jft'
                ? 'bg-panel text-accent shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            JFT
          </button>
        </div>
      </div>

      {/* Chapters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {chapters.map((ch) => {
          const stats = getChapterStats(ch.items)
          const percentLearned = Math.round((stats.learned / ch.items.length) * 100) || 0

          return (
            <div
              key={`${ch.level}-${ch.chapter}`}
              className="bg-panel border border-line rounded-2xl p-5 hover:border-accent/40 transition-all flex flex-col justify-between gap-4 group shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="badge badge-soft badge-accent badge-sm font-bold">
                    Bab {ch.chapter}
                  </span>
                  <span className="text-xs font-semibold text-muted">
                    {ch.items.length} Kanji
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
                  <span>Progres: {stats.learned}/{ch.items.length} dihafal</span>
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
                    onClick={() => navigate(`/kanji/${level}/${ch.chapter}`)}
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
