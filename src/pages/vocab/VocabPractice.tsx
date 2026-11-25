import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getChapter, type VocabWord } from '../../data/vocab'
import { useVocabStore } from '../../store/useVocabStore'
import { recordVocabAnswer, queueVocabSession } from '../../lib/sync'
import { getMasteryLabel, sortDeckBySRS } from '../../lib/srs'
import { generateQuizOptions } from '../../lib/vocabQuiz'

type PracticeMode = 'flashcard' | 'quiz'

export default function VocabPractice() {
  const { level = 'n5', chapter = '1' } = useParams<{ level: string; chapter: string }>()
  const navigate = useNavigate()
  const chapterNum = parseInt(chapter, 10) || 1
  const validLevel = (level.toLowerCase() === 'n4' ? 'n4' : 'n5') as 'n5' | 'n4'

  const chapterData = useMemo(() => getChapter(validLevel, chapterNum), [validLevel, chapterNum])

  const [words, setWords] = useState<VocabWord[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('flashcard')
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [isQuizComplete, setIsQuizComplete] = useState(false)
  const [quizMistakes, setQuizMistakes] = useState<VocabWord[]>([])
  const [usageModalOpen, setUsageModalOpen] = useState(false)
  const [confirmExitAction, setConfirmExitAction] = useState<'flashcard' | 'back' | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionIncorrect, setSessionIncorrect] = useState(0)

  const sessionCorrectRef = useRef(sessionCorrect)
  const sessionIncorrectRef = useRef(sessionIncorrect)
  const startedAtRef = useRef(Date.now())
  const sessionSavedRef = useRef(false)
  const autoAdvanceTimerRef = useRef<number | null>(null)

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearAutoAdvance()
  }, [clearAutoAdvance])

  useEffect(() => {
    sessionCorrectRef.current = sessionCorrect
    sessionIncorrectRef.current = sessionIncorrect
  }, [sessionCorrect, sessionIncorrect])

  const flushSession = useCallback(() => {
    if (sessionSavedRef.current) return
    const total = sessionCorrectRef.current + sessionIncorrectRef.current
    if (total > 0) {
      sessionSavedRef.current = true
      void queueVocabSession({
        level: validLevel.toUpperCase(),
        chapter: chapterNum,
        totalCards: total,
        correctCards: sessionCorrectRef.current,
        durationSec: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        startedAt: new Date(startedAtRef.current).toISOString(),
      })
    }
  }, [validLevel, chapterNum])

  useEffect(() => {
    if (practiceMode === 'quiz' && isQuizComplete) {
      flushSession()
    }
  }, [practiceMode, isQuizComplete, flushSession])

  const { showRomajiFront, getWordStat } = useVocabStore()

  // Initialize or reset words when chapterData changes (urutkan otomatis via SRS)
  useEffect(() => {
    if (chapterData) {
      const currentStats = useVocabStore.getState().stats
      setWords(sortDeckBySRS(chapterData.words, currentStats))
      setCurrentIndex(0)
      setIsFlipped(false)
      setSelectedOptionId(null)
      setIsQuizComplete(false)
      setQuizMistakes([])
      setSessionCorrect(0)
      setSessionIncorrect(0)
      startedAtRef.current = Date.now()
      sessionSavedRef.current = false
    }
  }, [chapterData])

  const currentWord: VocabWord | undefined = words[currentIndex]
  const totalCards = words.length
  const currentStat = currentWord ? getWordStat(currentWord.id) : undefined

  const quizOptions = useMemo(() => {
    if (!currentWord || !chapterData) return []
    return generateQuizOptions(currentWord, chapterData.words, 4)
  }, [currentWord, chapterData])

  // Session accuracy
  const totalReviewed = sessionCorrect + sessionIncorrect
  const accuracy = totalReviewed > 0 ? Math.round((sessionCorrect / totalReviewed) * 100) : 100
  const quizInProgress = practiceMode === 'quiz' && !isQuizComplete && totalReviewed > 0

  const handleNext = useCallback(() => {
    clearAutoAdvance()
    setSelectedOptionId(null)
    setIsFlipped(false)
    if (practiceMode === 'quiz') {
      if (currentIndex + 1 >= totalCards) {
        setIsQuizComplete(true)
      } else {
        setCurrentIndex((prev) => prev + 1)
      }
      return
    }
    setCurrentIndex((prev) => (prev + 1 < totalCards ? prev + 1 : 0))
  }, [practiceMode, currentIndex, totalCards, clearAutoAdvance])

  const handlePrev = useCallback(() => {
    clearAutoAdvance()
    setSelectedOptionId(null)
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalCards - 1))
  }, [totalCards, clearAutoAdvance])

  const applyModeChange = (mode: PracticeMode) => {
    clearAutoAdvance()

    if (chapterData) {
      const currentStats = useVocabStore.getState().stats
      setWords(sortDeckBySRS(chapterData.words, currentStats))
    }

    setPracticeMode(mode)
    setCurrentIndex(0)
    setIsFlipped(false)
    setSelectedOptionId(null)
    setUsageModalOpen(false)
    setConfirmExitAction(null)
    setIsQuizComplete(false)
    setQuizMistakes([])
    setSessionCorrect(0)
    setSessionIncorrect(0)
    startedAtRef.current = Date.now()
    sessionSavedRef.current = false
  }

  const handleModeChange = (mode: PracticeMode) => {
    if (mode === practiceMode) return
    if (mode === 'flashcard' && quizInProgress) {
      clearAutoAdvance()
      setConfirmExitAction('flashcard')
      return
    }
    applyModeChange(mode)
  }

  const handleBackClick = (e: React.MouseEvent) => {
    if (quizInProgress) {
      e.preventDefault()
      clearAutoAdvance()
      setConfirmExitAction('back')
    }
  }

  const handleConfirmExit = () => {
    const action = confirmExitAction
    setConfirmExitAction(null)
    if (action === 'flashcard') {
      applyModeChange('flashcard')
    } else if (action === 'back') {
      navigate('/vocab')
    }
  }

  const handleRestartQuiz = (onlyMistakes: boolean) => {
    if (!chapterData) return
    clearAutoAdvance()
    const currentStats = useVocabStore.getState().stats
    const nextDeck = onlyMistakes && quizMistakes.length > 0 ? quizMistakes : chapterData.words
    setWords(sortDeckBySRS(nextDeck, currentStats))
    setCurrentIndex(0)
    setSelectedOptionId(null)
    setIsFlipped(false)
    setIsQuizComplete(false)
    setQuizMistakes([])
    setSessionCorrect(0)
    setSessionIncorrect(0)
    startedAtRef.current = Date.now()
    sessionSavedRef.current = false
  }

  const handleSelectOption = useCallback((option: VocabWord) => {
    if (!currentWord || selectedOptionId !== null) return
    setSelectedOptionId(option.id)
    const isCorrect = option.id === currentWord.id
    void recordVocabAnswer(currentWord.id, validLevel.toUpperCase(), chapterNum, isCorrect)
    if (isCorrect) {
      setSessionCorrect((c) => c + 1)
    } else {
      setSessionIncorrect((c) => c + 1)
      setQuizMistakes((prev) => (prev.some((w) => w.id === currentWord.id) ? prev : [...prev, currentWord]))
    }
    clearAutoAdvance()
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      handleNext()
    }, isCorrect ? 700 : 1400)
  }, [currentWord, selectedOptionId, validLevel, chapterNum, clearAutoAdvance, handleNext])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (confirmExitAction !== null) {
        if (e.key === 'Escape') {
          setConfirmExitAction(null)
        }
        return
      }

      if (usageModalOpen) {
        if (e.key === 'Escape') {
          setUsageModalOpen(false)
        }
        return
      }

      if (practiceMode === 'quiz' && isQuizComplete) return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
        return
      }

      if (practiceMode === 'flashcard') {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault()
          setIsFlipped((f) => !f)
        }
      } else {
        if ((e.code === 'Space' || e.key === 'Enter') && selectedOptionId !== null) {
          e.preventDefault()
          handleNext()
        } else if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1
          if (quizOptions[idx]) {
            handleSelectOption(quizOptions[idx])
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev, handleSelectOption, practiceMode, quizOptions, selectedOptionId, isQuizComplete, usageModalOpen, confirmExitAction])

  if (!chapterData || words.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-ink">Bab Tidak Ditemukan</h2>
        <p className="text-sm text-muted">Data kosakata untuk level {validLevel.toUpperCase()} Bab {chapterNum} belum tersedia.</p>
        <button
          type="button"
          onClick={() => navigate('/vocab')}
          className="btn btn-outline border-line text-ink"
        >
          Kembali ke Daftar Bab
        </button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Bar: Navigation & Chapter Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-4">
          <Link
            to="/vocab"
            onClick={handleBackClick}
            className="btn btn-md btn-ghost border border-line text-ink hover:bg-pill rounded-xl px-4 font-semibold text-sm sm:text-base flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="hidden sm:inline">Daftar Bab</span>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-[26px] font-bold text-ink leading-tight">
              {chapterData.title}
            </h1>
          </div>
        </div>

        {/* Mode Switcher: Flashcard (Review) vs Pilihan Ganda (Kuis) */}
        <div className="join bg-pill p-1 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => handleModeChange('flashcard')}
            className={`join-item btn btn-sm rounded-lg border-0 px-3 sm:px-4 font-semibold text-xs sm:text-sm cursor-pointer ${
              practiceMode === 'flashcard'
                ? 'bg-accent text-white shadow-xs'
                : 'btn-ghost text-muted hover:text-ink'
            }`}
          >
            Flashcard
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('quiz')}
            className={`join-item btn btn-sm rounded-lg border-0 px-3 sm:px-4 font-semibold text-xs sm:text-sm cursor-pointer ${
              practiceMode === 'quiz'
                ? 'bg-accent text-white shadow-xs'
                : 'btn-ghost text-muted hover:text-ink'
            }`}
          >
            Kuis
          </button>
        </div>
      </div>

      {practiceMode === 'quiz' && isQuizComplete ? (
        /* Layar Selesai Kuis */
        <div className="bg-panel border-2 border-line rounded-3xl p-4 sm:p-10 space-y-5 sm:space-y-6 shadow-sm">
          <div className="text-center space-y-1.5 sm:space-y-2">
            <div className="text-3xl sm:text-4xl">🎉</div>
            <h2 className="text-xl sm:text-3xl font-black text-ink">Kuis Selesai!</h2>
            <p className="text-xs sm:text-sm text-muted">
              Anda telah menyelesaikan putaran kuis untuk {chapterData.title}.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            <div className="bg-pill/50 border border-line rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-center">
              <div className="text-[11px] sm:text-xs font-semibold text-muted">Benar</div>
              <div className="text-lg sm:text-3xl font-black text-success tabular-nums">{sessionCorrect}</div>
            </div>
            <div className="bg-pill/50 border border-line rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-center">
              <div className="text-[11px] sm:text-xs font-semibold text-muted">Salah</div>
              <div className="text-lg sm:text-3xl font-black text-error tabular-nums">{sessionIncorrect}</div>
            </div>
            <div className="bg-pill/50 border border-line rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-center">
              <div className="text-[11px] sm:text-xs font-semibold text-muted">Akurasi</div>
              <div className="text-lg sm:text-3xl font-black text-accent tabular-nums">{accuracy}%</div>
            </div>
          </div>

          {quizMistakes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink">
                Kosakata yang Masih Salah ({quizMistakes.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {quizMistakes.map((word) => (
                  <div
                    key={word.id}
                    className="bg-pill/40 border border-error/30 rounded-xl p-3 flex flex-col justify-between gap-1"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-lg font-black text-ink font-japanese">
                        {word.kanji || word.kana}
                      </span>
                      <span className="text-xs text-muted font-japanese">{word.kana}</span>
                    </div>
                    <div className="text-sm font-semibold text-accent">{word.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {quizMistakes.length > 0 && (
              <button
                type="button"
                onClick={() => handleRestartQuiz(true)}
                className="btn bg-accent hover:opacity-90 text-white border-0 rounded-xl px-6 font-bold cursor-pointer"
              >
                Ulangi yang Salah ({quizMistakes.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRestartQuiz(false)}
              className="btn btn-outline border-line text-ink hover:bg-pill rounded-xl px-6 font-semibold cursor-pointer"
            >
              Ulangi Semua Soal
            </button>
            <Link
              to="/vocab"
              className="btn btn-ghost border border-line text-muted hover:text-ink rounded-xl px-5 font-semibold"
            >
              Daftar Bab
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Bar (Only shown in Quiz mode) */}
          {practiceMode === 'quiz' && (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
              <div className="bg-panel border border-line rounded-xl p-2 sm:p-3 text-center">
                <div className="text-[11px] sm:text-xs font-semibold text-muted">Akurasi</div>
                <div className="text-base sm:text-2xl font-black text-ink tabular-nums">
                  {accuracy}%
                </div>
              </div>

              <div className="bg-panel border border-line rounded-xl p-2 sm:p-3 text-center">
                <div className="text-[11px] sm:text-xs font-semibold text-muted">Nomor Kartu</div>
                <div className="text-base sm:text-2xl font-black text-ink tabular-nums">
                  {currentIndex + 1} <span className="text-xs sm:text-sm font-normal text-muted">/ {totalCards}</span>
                </div>
              </div>

              <div className="bg-panel border border-line rounded-xl p-2 sm:p-3 text-center">
                <div className="text-[11px] sm:text-xs font-semibold text-muted">Tingkat Hafalan</div>
                <div className="text-sm sm:text-2xl font-black text-accent leading-tight">
                  {getMasteryLabel(currentStat?.box)}
                </div>
              </div>
            </div>
          )}

      {/* Flashcard / Quiz Card Container */}
      <div
        role={practiceMode === 'flashcard' ? 'button' : undefined}
        tabIndex={practiceMode === 'flashcard' ? 0 : undefined}
        onClick={() => {
          if (practiceMode === 'flashcard') setIsFlipped(!isFlipped)
        }}
        onKeyDown={(e) => {
          if (practiceMode === 'flashcard' && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault()
            setIsFlipped(!isFlipped)
          }
        }}
        className={`relative w-full bg-panel border-2 border-line rounded-3xl flex items-center justify-center text-center shadow-sm select-none transition-colors overflow-hidden ${
          practiceMode === 'flashcard'
            ? 'h-[320px] sm:h-[380px] md:h-[440px] p-4 sm:p-8 hover:border-accent/40 cursor-pointer'
            : 'h-[260px] sm:h-[310px] md:h-[350px] p-4 sm:p-8'
        }`}
      >
        {/* Top Bar */}
        <div className="absolute inset-x-4 top-4 sm:inset-x-8 sm:top-6 z-10 grid grid-cols-3 items-center text-xs text-muted">
          <div className="justify-self-start">
            <span className="badge badge-sm bg-pill border border-line text-ink font-semibold">
              {currentWord?.type || 'Kosakata'}
            </span>
          </div>

          <div className="justify-self-center">
            {practiceMode === 'flashcard' && (
              <span className="text-sm font-bold text-ink tabular-nums">
                {currentIndex + 1} <span className="font-normal text-muted">/ {totalCards}</span>
              </span>
            )}
          </div>

          <div className="justify-self-end">
            {practiceMode === 'flashcard' ? (
              <span className="flex items-center gap-1 font-medium text-muted whitespace-nowrap">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>{isFlipped ? 'Arti Kosakata' : 'Klik untuk membalik'}</span>
              </span>
            ) : (
              <span className="font-medium text-muted whitespace-nowrap">
                Kuis Pilihan Ganda
              </span>
            )}
          </div>
        </div>

        {/* 3D Flipping Text Only (Flip stays false in quiz mode) */}
        <div className="[perspective:1000px] w-full flex items-center justify-center overflow-hidden">
          <div
            className={`grid [grid-template-areas:'stack'] place-items-center w-full transition-transform duration-500 [transform-style:preserve-3d] ${
              practiceMode === 'flashcard' && isFlipped ? '[transform:rotateY(180deg)]' : ''
            }`}
          >
            {/* Sisi Depan (Huruf Jepang) */}
            <div className="[grid-area:stack] [backface-visibility:hidden] flex flex-col items-center justify-center space-y-4 w-full px-2">
              {currentWord?.kanji ? (
                <>
                  <div className="text-5xl sm:text-7xl md:text-8xl font-black text-ink tracking-wide font-japanese break-words max-w-full">
                    {currentWord.kanji}
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-accent font-japanese break-words max-w-full">
                    {currentWord.kana}
                  </div>
                </>
              ) : (
                <div className="text-5xl sm:text-7xl md:text-8xl font-black text-ink tracking-wide font-japanese break-words max-w-full">
                  {currentWord?.kana}
                </div>
              )}

              {showRomajiFront && (
                <div className="text-lg sm:text-xl md:text-2xl font-medium text-muted tracking-wide break-words max-w-full">
                  {currentWord?.romaji}
                </div>
              )}
            </div>

            {/* Sisi Belakang (Arti Kosakata) */}
            <div className="[grid-area:stack] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center space-y-4 w-full px-2 sm:px-6">
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-ink font-japanese break-words max-w-full">
                {currentWord?.kanji || currentWord?.kana}
              </div>
              <div className="text-xl sm:text-2xl font-medium text-muted break-words max-w-full">
                {currentWord?.kana} • <span className="italic">{currentWord?.romaji}</span>
              </div>

              <div className="pt-3 border-t border-line/60 w-full max-w-3xl">
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-accent break-words leading-snug">
                  {currentWord?.meaning}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        {practiceMode === 'flashcard' && (
          <div className="absolute inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-6 z-10 flex items-center justify-start">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setUsageModalOpen(true)
              }}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-pill hover:bg-pill-on border border-line text-ink hover:text-accent font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              title="Lihat Penggunaan Kosakata"
              aria-label="Lihat Penggunaan Kosakata"
            >
              <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span className="hidden sm:inline">Penggunaan</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="space-y-3">
        {practiceMode === 'quiz' && (
          /* Multiple Choice Options */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quizOptions.map((opt, idx) => {
              const isAnswered = selectedOptionId !== null
              const isSelected = selectedOptionId === opt.id
              const isCorrectOption = opt.id === currentWord?.id

              let btnStyle = 'bg-panel border-2 border-line hover:border-accent hover:bg-pill/50 text-ink'
              if (isAnswered) {
                if (isCorrectOption) {
                  btnStyle = 'bg-success/15 border-2 border-success text-success font-bold'
                } else if (isSelected) {
                  btnStyle = 'bg-error/15 border-2 border-error text-error font-bold'
                } else {
                  btnStyle = 'bg-panel border-2 border-line/50 text-muted opacity-60'
                }
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(opt)}
                  className={`min-h-14 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-semibold flex items-center gap-3 text-left transition-all cursor-pointer disabled:cursor-default ${btnStyle}`}
                >
                  <span className="w-6 h-6 rounded-lg bg-pill border border-line text-xs font-bold flex items-center justify-center shrink-0 text-ink">
                    {idx + 1}
                  </span>
                  <span className="break-words leading-snug">{opt.meaning}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Navigation Next / Prev */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            className="flex-1 h-11 rounded-xl bg-pill hover:bg-pill-on border border-line text-ink font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Sebelumnya</span>
          </button>

          {practiceMode === 'flashcard' && (
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="h-11 px-5 rounded-xl bg-panel border border-line text-ink font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer hover:border-accent transition-colors"
            >
              <span>Flip</span>
              <span className="text-xs text-muted hidden sm:inline">(Spasi)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 h-11 rounded-xl bg-pill hover:bg-pill-on border border-line text-ink font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>Berikutnya</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
        </>
      )}

      {/* Modal Penggunaan Kosakata */}
      <dialog id="usage_modal" className={`modal ${usageModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box bg-panel border border-line text-ink w-[calc(100%-2rem)] max-w-lg p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-line pb-2.5 sm:pb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <h3 className="font-bold text-base sm:text-lg text-ink">Penggunaan Kosakata</h3>
            </div>
            <button
              type="button"
              className="btn btn-xs sm:btn-sm btn-ghost btn-circle text-muted hover:text-ink cursor-pointer"
              onClick={() => setUsageModalOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
            <div className="bg-pill/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-line flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-black text-ink font-japanese break-words">
                  {currentWord?.kanji || currentWord?.kana}
                </div>
                <div className="text-xs sm:text-sm font-medium text-muted break-words">
                  {currentWord?.kana} • <span className="italic">{currentWord?.romaji}</span>
                </div>
              </div>
              <span className="badge badge-xs sm:badge-sm font-semibold bg-panel border border-line text-accent shrink-0">
                {currentWord?.type || 'Kosakata'}
              </span>
            </div>

            <div>
              <div className="text-[11px] sm:text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Arti Kosakata
              </div>
              <div className="text-base sm:text-lg font-bold text-ink break-words">
                {currentWord?.meaning}
              </div>
            </div>

            {currentWord?.exampleJp ? (
              <div className="space-y-1.5 sm:space-y-2 pt-2 border-t border-line/60">
                <div className="text-[11px] sm:text-xs font-bold text-muted uppercase tracking-wider">
                  Contoh Kalimat / Pola Penggunaan
                </div>
                <div className="bg-pill/40 p-3 sm:p-3.5 rounded-xl border border-line space-y-1">
                  <div className="text-sm sm:text-lg font-bold text-ink font-japanese break-words">
                    {currentWord.exampleJp}
                  </div>
                  {currentWord.exampleId && (
                    <div className="text-xs sm:text-sm text-muted break-words">
                      {currentWord.exampleId}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-line/60 text-xs sm:text-sm text-muted">
                Belum ada contoh kalimat khusus untuk kata ini.
              </div>
            )}
          </div>

          <div className="modal-action border-t border-line pt-3 mt-2">
            <button
              type="button"
              className="btn btn-sm sm:btn-md bg-accent hover:opacity-90 text-white border-0 font-semibold px-5 sm:px-6 rounded-xl cursor-pointer"
              onClick={() => setUsageModalOpen(false)}
            >
              Tutup
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={() => setUsageModalOpen(false)}>
          <button>close</button>
        </form>
      </dialog>

      {/* Modal Konfirmasi Keluar dari Kuis */}
      <dialog id="confirm_exit_quiz_modal" className={`modal ${confirmExitAction !== null ? 'modal-open' : ''}`}>
        <div className="modal-box bg-panel border border-line text-ink max-w-md">
          <h3 className="font-bold text-lg text-ink">Kuis Sedang Berjalan</h3>
          <p className="py-3 text-sm text-muted">
            Anda baru menyelesaikan <strong className="text-ink">{totalReviewed} dari {totalCards}</strong> soal. Jika keluar sekarang, sesi kuis ini tidak akan tercatat di Riwayat Sesi. Yakin ingin keluar dari kuis?
          </p>
          <div className="modal-action border-t border-line pt-3 flex gap-2">
            <button
              type="button"
              className="btn btn-sm sm:btn-md btn-ghost border border-line text-ink hover:bg-pill font-semibold rounded-xl cursor-pointer"
              onClick={() => setConfirmExitAction(null)}
            >
              Lanjut Kuis
            </button>
            <button
              type="button"
              className="btn btn-sm sm:btn-md bg-error hover:opacity-90 text-white border-0 font-semibold rounded-xl cursor-pointer"
              onClick={handleConfirmExit}
            >
              Ya, Keluar Kuis
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={() => setConfirmExitAction(null)}>
          <button>close</button>
        </form>
      </dialog>
    </div>
  )
}
