interface Props<T extends string> {
  label: string
  value: T
  options: { value: T; text: string }[]
  onChange: (v: T) => void
}

export function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div className="inline-flex shrink-0 bg-pill border border-line rounded-full p-0.5 sm:p-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`border-0 rounded-full cursor-pointer text-[13px] sm:text-[15px] font-medium px-3 py-1.5 sm:px-[22px] sm:py-2 whitespace-nowrap transition-colors ${
            o.value === value ? 'bg-accent text-white shadow-sm' : 'bg-transparent text-muted hover:text-ink'
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.text}
        </button>
      ))}
    </div>
  )
}
