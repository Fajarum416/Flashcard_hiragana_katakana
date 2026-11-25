/**
 * Pola latar belakang Seigaiha (ombak tradisional Jepang) berbasis SVG <pattern>
 * yang ringan (~1 KB) dan warnanya otomatis mengikuti tema Dark/Light.
 */
function SeigaihaWave({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={100} fill="var(--bg)" stroke="var(--ink)" strokeOpacity={0.08} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={75} fill="none" stroke="var(--ink)" strokeOpacity={0.08} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={50} fill="none" stroke="var(--ink)" strokeOpacity={0.08} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={25} fill="none" stroke="var(--ink)" strokeOpacity={0.08} strokeWidth={1.5} />
    </g>
  )
}

export function BackgroundPattern() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="seigaiha-pattern"
            width="200"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            {/* Baris atas (di belakang) */}
            <SeigaihaWave cx={100} cy={-50} />
            {/* Baris tengah-atas */}
            <SeigaihaWave cx={0} cy={0} />
            <SeigaihaWave cx={200} cy={0} />
            {/* Baris tengah-bawah */}
            <SeigaihaWave cx={100} cy={50} />
            {/* Baris bawah (di depan) */}
            <SeigaihaWave cx={0} cy={100} />
            <SeigaihaWave cx={200} cy={100} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#seigaiha-pattern)" />
      </svg>
    </div>
  )
}
