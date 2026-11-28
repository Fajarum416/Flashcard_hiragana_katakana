import { useEffect, type ReactNode } from 'react'

export interface DrawerStep {
  id: string
  label: string
  optional?: boolean
}

interface SlideOverDrawerProps {
  open: boolean
  onClose: () => void
  busy?: boolean
  mode: 'add' | 'edit'
  title: string
  subtitle?: string
  editTarget?: ReactNode
  steps?: DrawerStep[]
  activeStep?: number
  onStepChange?: (index: number) => void
  canJumpToStep?: (index: number) => boolean
  footer?: ReactNode
  children: ReactNode
  maxWidthClass?: string
}

/**
 * Reusable right-side slide-over drawer for admin CMS forms with optional stepper and edit-context banner.
 */
export function SlideOverDrawer({
  open,
  onClose,
  busy = false,
  mode,
  title,
  subtitle,
  editTarget,
  steps,
  activeStep = 0,
  onStepChange,
  canJumpToStep,
  footer,
  children,
  maxWidthClass = 'max-w-xl',
}: SlideOverDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onClose])

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[70] transition-[visibility] duration-300 ${
        open ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
      }`}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 ease-out ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => {
          if (!busy) onClose()
        }}
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed top-0 right-0 bottom-0 w-full ${maxWidthClass} bg-panel border-l border-line shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-line shrink-0 space-y-2.5 bg-panel">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`badge badge-soft badge-xs font-bold ${
                    mode === 'edit' ? 'badge-info' : 'badge-accent'
                  }`}
                >
                  {mode === 'edit' ? 'Mode Edit' : 'Tambah Baru'}
                </span>
                {subtitle && (
                  <span className="text-[11px] md:text-xs font-medium text-muted truncate">
                    {subtitle}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-ink m-0 leading-snug">
                {title}
              </h3>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              aria-label="Tutup panel"
              className="w-8 h-8 rounded-lg bg-pill hover:bg-pill-on border border-line text-ink flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-50"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 512 512">
                <polygon points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49" />
              </svg>
            </button>
          </div>

          {/* Highlight Target Banner in Edit Mode */}
          {mode === 'edit' && editTarget && (
            <div className="bg-info/10 border border-info/30 rounded-xl px-3 py-2 text-xs text-ink flex items-center gap-2">
              <svg className="w-4 h-4 text-info shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
              <div className="min-w-0 flex-1">{editTarget}</div>
            </div>
          )}

          {/* Stepper Bar */}
          {steps && steps.length > 1 && (
            <div className="grid gap-1.5 pt-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
              {steps.map((step, idx) => {
                const isCurrent = idx === activeStep
                const isPast = idx < activeStep
                const allowed = canJumpToStep ? canJumpToStep(idx) : mode === 'edit' || idx <= activeStep
                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!allowed}
                    onClick={() => allowed && onStepChange?.(idx)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? 'bg-accent/10 border-accent text-ink shadow-xs'
                        : isPast
                          ? 'bg-pill/70 border-line text-ink hover:border-accent/40'
                          : 'bg-bg/50 border-line/70 text-muted'
                    } ${allowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? 'bg-accent text-white'
                          : isPast
                            ? 'bg-ok text-white'
                            : 'bg-pill border border-line text-muted'
                      }`}
                    >
                      {isPast ? '✓' : idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold truncate leading-tight">{step.label}</div>
                      {step.optional && (
                        <div className="text-[10px] text-muted leading-tight">Opsional</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3.5 border-t border-line bg-panel shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </div>
  )
}

interface FieldLabelProps {
  label: string
  required?: boolean
  changed?: boolean
  hint?: string
}

/**
 * Consistent form label with optional required asterisk and "Diubah" dirty badge.
 */
export function FieldLabel({ label, required, changed, hint }: FieldLabelProps) {
  return (
    <div className="flex items-center justify-between gap-2 mb-1">
      <span className="text-xs font-semibold text-ink">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
        {hint && <span className="text-[11px] font-normal text-muted ml-1">({hint})</span>}
      </span>
      {changed && (
        <span className="badge badge-soft badge-warning badge-xs font-bold">Diubah</span>
      )}
    </div>
  )
}
