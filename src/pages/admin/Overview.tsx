import { useEffect, useState } from 'react'
import { fetchOverview, type Overview } from '../../lib/admin'

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOverview()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="text-muted text-[13px] text-center py-10">Memuat ringkasan admin...</p>
  if (error) return <p className="text-bad text-center py-10">Kesalahan: {error}</p>
  if (!data) return null

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-ink m-0">Ringkasan Admin</h2>
        <p className="text-[11px] sm:text-xs md:text-sm leading-snug text-muted mt-0.5 m-0">
          Pantau jumlah pengguna aktif dan daftar huruf yang paling sering salah.
        </p>
      </div>

      <div className="stats stats-horizontal shadow-sm w-full grid grid-cols-3 bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="stat px-2.5 py-2.5 sm:px-4 sm:py-3.5 md:px-6 md:py-5 min-w-0">
          <div className="stat-figure hidden sm:flex w-10 h-10 md:w-12 md:h-12 rounded-xl bg-pill border border-line text-ink items-center justify-center">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <div className="stat-title text-muted text-[10px] sm:text-xs md:text-sm truncate">
            <span className="sm:hidden">Pengguna</span>
            <span className="hidden sm:inline">Total Pengguna</span>
          </div>
          <div className="stat-value text-ink text-lg sm:text-2xl md:text-3xl font-black tabular-nums">{data.total_users}</div>
          <div className="stat-desc text-muted text-[11px] md:text-xs hidden sm:block">Akun terdaftar</div>
        </div>

        <div className="stat px-2.5 py-2.5 sm:px-4 sm:py-3.5 md:px-6 md:py-5 min-w-0">
          <div className="stat-figure hidden sm:flex w-10 h-10 md:w-12 md:h-12 rounded-xl bg-accent/15 text-accent items-center justify-center">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          </div>
          <div className="stat-title text-accent text-[10px] sm:text-xs md:text-sm truncate">
            <span className="sm:hidden">DAU 24j</span>
            <span className="hidden sm:inline">Aktif Harian (DAU 24j)</span>
          </div>
          <div className="stat-value text-accent text-lg sm:text-2xl md:text-3xl font-black tabular-nums">{data.dau}</div>
          <div className="stat-desc text-muted text-[11px] md:text-xs hidden sm:block">24 jam terakhir</div>
        </div>

        <div className="stat px-2.5 py-2.5 sm:px-4 sm:py-3.5 md:px-6 md:py-5 min-w-0">
          <div className="stat-figure hidden sm:flex w-10 h-10 md:w-12 md:h-12 rounded-xl bg-ok/15 text-ok items-center justify-center">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </div>
          <div className="stat-title text-ok text-[10px] sm:text-xs md:text-sm truncate">
            <span className="sm:hidden">WAU 7h</span>
            <span className="hidden sm:inline">Aktif Mingguan (WAU 7h)</span>
          </div>
          <div className="stat-value text-ok text-lg sm:text-2xl md:text-3xl font-black tabular-nums">{data.wau}</div>
          <div className="stat-desc text-muted text-[11px] md:text-xs hidden sm:block">7 hari terakhir</div>
        </div>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3 md:mb-4">
          <h3 className="m-0 text-sm sm:text-base md:text-lg font-semibold text-ink">
            Huruf Paling Sering Salah (Top 10 Kesalahan Global)
          </h3>
          <span className="badge badge-soft badge-neutral badge-xs md:badge-sm font-semibold">
            {data.top_mistakes.length} item
          </span>
        </div>
        {data.top_mistakes.length === 0 ? (
          <p className="text-muted text-xs md:text-sm">Belum ada data kesalahan yang tercatat.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-base-content/5 bg-base-100">
            <table className="table table-xs sm:table-sm md:table-md">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Aksara / Huruf</th>
                  <th>ID Kartu</th>
                  <th>Salah</th>
                  <th>Benar</th>
                  <th>Rasio Salah</th>
                </tr>
              </thead>
              <tbody>
                {data.top_mistakes.map((m, idx) => {
                  const [sc, char] = m.kana_id.split(':')
                  const total = m.wrong + m.correct
                  const pct = total > 0 ? Math.round((m.wrong / total) * 100) : 0
                  const badgeClass =
                    pct >= 60 ? 'badge-error' : pct >= 35 ? 'badge-warning' : 'badge-neutral'
                  return (
                    <tr key={m.kana_id} className="hover:bg-pill/30">
                      <th className="tabular-nums text-muted">{idx + 1}</th>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-pill border border-line flex items-center justify-center jp text-base sm:text-lg font-semibold text-ink shrink-0">
                            {char}
                          </span>
                          <span className="text-[11px] font-medium text-muted capitalize">{sc}</span>
                        </div>
                      </td>
                      <td className="text-muted text-[11px] font-mono">{m.kana_id}</td>
                      <td className="text-bad font-bold tabular-nums">{m.wrong}</td>
                      <td className="text-ok font-semibold tabular-nums">{m.correct}</td>
                      <td>
                        <span className={`badge badge-soft badge-xs sm:badge-sm font-bold tabular-nums ${badgeClass}`}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
