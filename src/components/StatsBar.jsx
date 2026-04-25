import { formatNpr } from '../utils/money.js'

export default function StatsBar({ stats }) {
  return (
    <section className="stats-bar" aria-label="Transfer stats">
      <div className="stats-item">
        <p className="stats-label">Total sent</p>
        <p className="stats-value">{formatNpr(stats.totalSent)}</p>
      </div>
      <div className="stats-item">
        <p className="stats-label">This year</p>
        <p className="stats-value">{formatNpr(stats.sentThisYear)}</p>
      </div>
      <div className="stats-item">
        <p className="stats-label">Transfers</p>
        <p className="stats-value">{stats.transferCount}</p>
      </div>
    </section>
  )
}
