import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export interface SlidingTabOption<T extends string> {
  value: T
  label: ReactNode
}

interface SlidingTabsProps<T extends string> {
  ariaLabel?: string
  value: T
  options: SlidingTabOption<T>[]
  onChange: (v: T) => void
  className?: string
  indicatorClassName?: string
  buttonClassName?: string
  activeButtonClassName?: string
  inactiveButtonClassName?: string
}

/**
 * Reusable segmented control / tab switcher with a smooth sliding active pill indicator.
 */
export function SlidingTabs<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  className = 'inline-flex shrink-0 bg-pill border border-line rounded-full p-0.5 sm:p-1',
  indicatorClassName = 'bg-accent rounded-full shadow-sm',
  buttonClassName = 'text-[13px] sm:text-[15px] font-medium px-3 py-1.5 sm:px-[22px] sm:py-2 rounded-full',
  activeButtonClassName = 'text-white',
  inactiveButtonClassName = 'text-muted hover:text-ink',
}: SlidingTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<T, HTMLButtonElement>>(new Map())
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const [canAnimate, setCanAnimate] = useState(false)

  const updateIndicator = useCallback(() => {
    const btn = buttonRefs.current.get(value)
    if (!btn) return
    setRect({
      left: btn.offsetLeft,
      top: btn.offsetTop,
      width: btn.offsetWidth,
      height: btn.offsetHeight,
    })
  }, [value])

  useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator, options])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setCanAnimate(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => updateIndicator())
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateIndicator])

  return (
    <div ref={containerRef} className={`relative ${className}`} role="group" aria-label={ariaLabel}>
      {rect && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-0 left-0 ${indicatorClassName} ${
            canAnimate ? 'transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]' : ''
          }`}
          style={{
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
          }}
        />
      )}
      {options.map((o) => {
        const isActive = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              if (el) buttonRefs.current.set(o.value, el)
              else buttonRefs.current.delete(o.value)
            }}
            type="button"
            className={`relative z-10 border-0 bg-transparent cursor-pointer whitespace-nowrap transition-colors duration-200 ${buttonClassName} ${
              isActive ? activeButtonClassName : inactiveButtonClassName
            }`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

interface Props<T extends string> {
  label: string
  value: T
  options: { value: T; text: string }[]
  onChange: (v: T) => void
}

export function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <SlidingTabs
      ariaLabel={label}
      value={value}
      options={options.map((o) => ({ value: o.value, label: o.text }))}
      onChange={onChange}
    />
  )
}
