import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { SlidingTabs } from '../../components/Segmented'
import { type VocabWord } from '../../data/vocab'
import { useContentStore } from '../../store/useContentStore'
import { useVocabStore } from '../../store/useVocabStore'
import { recordVocabAnswer, queueVocabSession } from '../../lib/sync'
import { getMasteryLabel, sortDeckBySRS } from '../../lib/srs'
import { generateQuizOptions } from '../../lib/vocabQuiz'
import {
  getVocabBackPrimarySize,
  getVocabMeaningSize,
  getVocabPrimarySize,
  getVocabSubSize,
} from '../../lib/cardTextSize'

type PracticeMode = 'flashcard' | 'quiz'

export default function VocabPractice() {
  const { level = 'n5', chapter = '1' } = useParams<{ level: string; chapter: string }>()
  const navigate = useNavigate()
  const chapterNum = parseInt(chapter, 10) || 1
  const validLevel = (level.toLowerCase() === 'n4' ? 'n4' : 'n5') as 'n5' | 'n4'

  const vocabChapters = useContentStore((s) => s.vocabChapters)
  const chapterData = useMemo(
    () => vocabChapters.find((c) => c.level === validLevel && c.chapter === chapterNum),
    [vocabChapters, validLevel, chapterNum]
  )

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
  const accuracy = totalReviewed > 0 ? Math.round((sessionCorrect / totalReviewed) * 100) : 0
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
      <div className="flex items-center justify-between gap-2 sm:gap-4 border-b border-line pb-3 sm:pb-4">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Link
            to="/vocab"
            onClick={handleBackClick}
            className="btn btn-sm sm:btn-md bg-panel border border-line text-ink hover:bg-pill rounded-lg sm:rounded-xl px-2 sm:px-4 font-semibold text-xs sm:text-base flex items-center gap-1.5 sm:gap-2 shrink-0 shadow-xs"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="hidden sm:inline">Daftar Bab</span>
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-xl md:text-[26px] font-bold text-ink leading-tight truncate">
              {chapterData.title}
            </h1>
          </div>
        </div>

        {/* Mode Switcher: Flashcard (Review) vs Pilihan Ganda (Kuis) */}
        <SlidingTabs
          ariaLabel="Mode Latihan Kosakata"
          value={practiceMode}
          onChange={handleModeChange}
          className="inline-flex bg-pill p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-line shrink-0"
          indicatorClassName="bg-accent rounded-md sm:rounded-lg shadow-xs"
          buttonClassName="px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-md sm:rounded-lg font-semibold text-[11px] sm:text-sm"
          activeButtonClassName="text-white"
          inactiveButtonClassName="text-muted hover:text-ink"
          options={[
            { value: 'flashcard', label: 'Flashcard' },
            { value: 'quiz', label: 'Kuis' },
          ]}
        />
      </div>

      {practiceMode === 'quiz' && isQuizComplete ? (
        /* Layar Selesai Kuis */
        <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-5 space-y-4 shadow-sm">
          <div className="text-center space-y-1">
            <div className="text-2xl sm:text-3xl">🎉</div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">Kuis Selesai!</h2>
            <p className="text-[11px] sm:text-xs text-muted">
              Anda telah menyelesaikan putaran kuis untuk {chapterData.title}.
            </p>
          </div>

          <div className="stats stats-horizontal shadow w-full grid grid-cols-3 bg-pill/40 border border-line rounded-xl overflow-hidden">
            <div className="stat py-2 px-2 sm:py-2.5 sm:px-4 text-center min-w-0">
              <div className="stat-title text-muted text-[10px] sm:text-[11px]">Benar</div>
              <div className="stat-value text-success text-lg sm:text-2xl font-black tabular-nums">{sessionCorrect}</div>
            </div>
            <div className="stat py-2 px-2 sm:py-2.5 sm:px-4 text-center min-w-0">
              <div className="stat-title text-muted text-[10px] sm:text-[11px]">Salah</div>
              <div className="stat-value text-error text-lg sm:text-2xl font-black tabular-nums">{sessionIncorrect}</div>
            </div>
            <div className="stat py-2 px-2 sm:py-2.5 sm:px-4 text-center min-w-0">
              <div className="stat-title text-muted text-[10px] sm:text-[11px]">Akurasi</div>
              <div className="stat-value text-accent text-lg sm:text-2xl font-black tabular-nums">{accuracy}%</div>
            </div>
          </div>

          {quizMistakes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-bold text-ink">
                Kosakata yang Masih Salah ({quizMistakes.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {quizMistakes.map((word) => (
                  <div
                    key={word.id}
                    className="bg-pill/40 border border-error/30 rounded-xl p-2.5 flex flex-col justify-between gap-0.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-base font-bold text-ink font-japanese">
                        {word.kanji || word.kana}
                      </span>
                      <span className="text-[11px] text-muted font-japanese">{word.kana}</span>
                    </div>
                    <div className="text-xs font-semibold text-accent font-meaning">{word.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {quizMistakes.length > 0 && (
              <button
                type="button"
                onClick={() => handleRestartQuiz(true)}
                className="btn btn-sm bg-accent hover:opacity-90 text-white border-0 rounded-xl px-4 font-bold cursor-pointer"
              >
                Ulangi yang Salah ({quizMistakes.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRestartQuiz(false)}
              className="btn btn-sm btn-outline border-line text-ink hover:bg-pill rounded-xl px-4 font-semibold cursor-pointer"
            >
              Ulangi Semua Soal
            </button>
            <Link
              to="/vocab"
              className="btn btn-sm btn-ghost border border-line text-muted hover:text-ink rounded-xl px-4 font-semibold"
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
        className={`relative w-full bg-panel border-2 border-line rounded-3xl flex flex-col justify-between text-center shadow-sm select-none transition-colors overflow-hidden ${
          practiceMode === 'flashcard'
            ? 'h-[320px] sm:h-[380px] md:h-[440px] p-4 sm:p-8 hover:border-accent/40 cursor-pointer'
            : 'h-[260px] sm:h-[310px] md:h-[350px] p-4 sm:p-8'
        }`}
      >
        {/* Top Bar */}
        <div className="w-full h-7 shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs text-muted">
          <div className="justify-self-start min-w-0 max-w-full flex items-center">
            <span className="badge badge-soft badge-primary badge-sm font-semibold whitespace-nowrap truncate max-w-full">
              {currentWord?.type || 'Kosakata'}
            </span>
          </div>

          <div className="justify-self-center whitespace-nowrap">
            {practiceMode === 'flashcard' && (
              <span className="text-sm font-bold text-ink tabular-nums">
                {currentIndex + 1} <span className="font-normal text-muted">/ {totalCards}</span>
              </span>
            )}
          </div>

          <div className="justify-self-end min-w-0">
            {practiceMode === 'flashcard' ? (
              <span className="flex items-center gap-1 font-medium text-muted whitespace-nowrap">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span className="truncate">{isFlipped ? 'Arti Kosakata' : 'Klik untuk membalik'}</span>
              </span>
            ) : (
              <span className="font-medium text-muted whitespace-nowrap">
                Kuis Pilihan Ganda
              </span>
            )}
          </div>
        </div>

        {/* 3D Flipping Text Only (Flip stays false in quiz mode) */}
        <div className="[perspective:1000px] w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden py-2">
          <div
            className={`grid [grid-template-areas:'stack'] place-items-center w-full max-h-full transition-transform duration-500 [transform-style:preserve-3d] ${
              practiceMode === 'flashcard' && isFlipped ? '[transform:rotateY(180deg)]' : ''
            }`}
          >
            {/* Sisi Depan (Huruf Jepang) */}
            <div className="[grid-area:stack] [backface-visibility:hidden] flex flex-col items-center justify-center space-y-2.5 sm:space-y-4 w-full max-h-full overflow-y-auto px-2">
              {currentWord?.kanji ? (
                <>
                  <div
                    className={`${getVocabPrimarySize(currentWord.kanji)} font-black text-ink tracking-wide font-japanese leading-tight break-words max-w-full`}
                  >
                    {currentWord.kanji}
                  </div>
                  <div
                    className={`${getVocabSubSize(currentWord.kana)} font-bold text-accent font-japanese leading-snug break-words max-w-full`}
                  >
                    {currentWord.kana}
                  </div>
                </>
              ) : (
                <div
                  className={`${getVocabPrimarySize(currentWord?.kana)} font-black text-ink tracking-wide font-japanese leading-tight break-words max-w-full`}
                >
                  {currentWord?.kana}
                </div>
              )}

              {showRomajiFront && currentWord?.romaji && (
                <div className="text-base sm:text-xl md:text-2xl font-medium text-muted tracking-wide break-words max-w-full">
                  {currentWord.romaji}
                </div>
              )}
            </div>

            {/* Sisi Belakang (Arti Kosakata) */}
            <div className="[grid-area:stack] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center space-y-2.5 sm:space-y-4 w-full max-h-full overflow-y-auto px-2 sm:px-6">
              <div
                className={`${getVocabBackPrimarySize(currentWord?.kanji || currentWord?.kana)} font-black text-ink font-japanese leading-tight break-words max-w-full`}
              >
                {currentWord?.kanji || currentWord?.kana}
              </div>
              <div
                className={`${getVocabSubSize(`${currentWord?.kana ?? ''}${currentWord?.romaji ? ` • ${currentWord.romaji}` : ''}`)} font-medium text-muted leading-snug break-words max-w-full`}
              >
                {currentWord?.kana}
                {currentWord?.romaji && (
                  <> • <span className="italic">{currentWord.romaji}</span></>
                )}
              </div>

              <div className="pt-2.5 sm:pt-3 border-t border-line/60 w-full max-w-3xl">
                <div
                  className={`${getVocabMeaningSize(currentWord?.meaning)} font-extrabold text-accent font-meaning break-words leading-snug`}
                >
                  {currentWord?.meaning}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="w-full h-8 shrink-0 flex items-center justify-start">
          {practiceMode === 'flashcard' && (
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
          )}
        </div>
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
                  <span className="font-meaning break-words leading-snug">{opt.meaning}</span>
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
                  {currentWord?.kana}
                  {currentWord?.romaji && (
                    <> • <span className="italic">{currentWord.romaji}</span></>
                  )}
                </div>
              </div>
              <span className="badge badge-soft badge-accent badge-xs sm:badge-sm font-semibold shrink-0">
                {currentWord?.type || 'Kosakata'}
              </span>
            </div>

            <div>
              <div className="text-[11px] sm:text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Arti Kosakata
              </div>
              <div className="text-base sm:text-lg font-bold text-ink font-meaning break-words">
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
