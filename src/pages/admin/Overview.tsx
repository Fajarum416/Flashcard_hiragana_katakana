import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <h2 className="text-xl font-bold m-0">Dasbor Admin</h2>
        <Link
          to="/admin/users"
          className="border-0 rounded-full bg-pill hover:bg-pill-on text-ink font-semibold text-[13px] px-4 py-2 no-underline cursor-pointer inline-block transition-all"
        >
          Lihat Daftar Pengguna →
        </Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-[30px]">
        <div className="bg-panel border border-line rounded-xl p-4">
          <small className="text-muted block text-xs mb-1">Total Pengguna</small>
          <span className="text-[32px] font-semibold">{data.total_users}</span>
        </div>
        <div className="bg-panel border border-line rounded-xl p-4">
          <small className="text-muted block text-xs mb-1">Pengguna Aktif Harian (DAU 24j)</small>
          <span className="text-[32px] font-semibold text-accent">{data.dau}</span>
        </div>
        <div className="bg-panel border border-line rounded-xl p-4">
          <small className="text-muted block text-xs mb-1">Pengguna Aktif Mingguan (WAU 7h)</small>
          <span className="text-[32px] font-semibold text-ok">{data.wau}</span>
        </div>
      </div>

      <div className="bg-panel border border-line rounded-xl p-5">
        <h3 className="m-0 mb-4 text-base font-semibold">Huruf Paling Sering Salah (Top 10 Kesalahan Global)</h3>
        {data.top_mistakes.length === 0 ? (
          <p className="text-muted text-[13px]">Belum ada data kesalahan yang tercatat.</p>
        ) : (
          <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Aksara / Huruf</th>
                  <th>ID Kartu</th>
                  <th>Jumlah Salah</th>
                  <th>Jumlah Benar</th>
                  <th>Rasio Salah</th>
                </tr>
              </thead>
              <tbody>
                {data.top_mistakes.map((m, idx) => {
                  const [sc, char] = m.kana_id.split(':')
                  const total = m.wrong + m.correct
                  const pct = total > 0 ? Math.round((m.wrong / total) * 100) : 0
                  return (
                    <tr key={m.kana_id}>
                      <th>{idx + 1}</th>
                      <td>
                        <strong className="jp text-xl mr-2">{char}</strong>
                        <span className="text-muted text-xs capitalize">({sc})</span>
                      </td>
                      <td className="text-muted">{m.kana_id}</td>
                      <td className="text-bad font-semibold">{m.wrong}</td>
                      <td className="text-ok">{m.correct}</td>
                      <td>{pct}%</td>
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
