import type { ReactNode } from 'react'

interface AdminFlipCardProps {
  flipped: boolean
  onToggleFlip: () => void
  front: ReactNode
  back: ReactNode
  footerLeft?: ReactNode
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
  heightClass?: string
}

/**
 * 3D flip card for admin CMS content grids, matching student review flashcard animation
 * with a static bottom action bar for one-click Edit and Delete.
 */
export function AdminFlipCard({
  flipped,
  onToggleFlip,
  front,
  back,
  footerLeft,
  onEdit,
  onDelete,
  disabled = false,
  heightClass = 'h-48',
}: AdminFlipCardProps) {
  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden shadow-xs hover:border-accent/40 transition-colors flex flex-col">
      {/* Clickable 3D Flip Body */}
      <button
        type="button"
        onClick={onToggleFlip}
        aria-pressed={flipped}
        className={`relative w-full ${heightClass} text-left cursor-pointer select-none bg-transparent border-0 p-0 [perspective:1200px] focus:outline-none`}
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${
            flipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* Front Face */}
          <div className="absolute inset-0 [backface-visibility:hidden] p-3.5 flex flex-col justify-between bg-panel">
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center overflow-hidden">
              {front}
            </div>
            <div className="flex items-center justify-end gap-1 text-[10px] text-muted/80 pt-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Klik balik</span>
            </div>
          </div>

          {/* Back Face */}
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] p-3.5 flex flex-col justify-between bg-bg/40">
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center text-center">
              {back}
            </div>
            <div className="flex items-center justify-end gap-1 text-[10px] text-muted/80 pt-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Depan</span>
            </div>
          </div>
        </div>
      </button>

      {/* Static Footer Bar (does not flip) */}
      <div className="border-t border-line bg-bg/40 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0 flex items-center gap-1 flex-wrap">{footerLeft}</div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={onEdit}
            className="btn btn-ghost btn-xs text-xs font-semibold text-ink hover:text-accent"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onDelete}
            className="btn btn-ghost btn-xs text-xs font-semibold text-error"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}
