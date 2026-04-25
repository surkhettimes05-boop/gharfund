import { formatNpr } from '../utils/money.js'

function formatMonthShort(monthKey) {
  return new Intl.DateTimeFormat('en-NP', {
    month: 'short',
  }).format(new Date(`${monthKey}-01T00:00:00`))
}

export default function MonthlySavingsChart({ items }) {
  const maxValue = Math.max(
    1,
    ...items.flatMap((item) => [item.committed, item.actual]),
  )

  return (
    <section className="dashboard-card" aria-labelledby="savings-chart-title">
      <p className="card-label" id="savings-chart-title">6-month history</p>
      <div className="savings-chart">
        {items.map((item) => (
          <div key={item.monthKey} className="savings-chart-group">
            <div className="savings-chart-bars" aria-hidden="true">
              <div
                className="savings-chart-bar savings-chart-bar-commitment"
                style={{ height: `${(item.committed / maxValue) * 100}%` }}
              />
              <div
                className="savings-chart-bar savings-chart-bar-actual"
                style={{ height: `${(item.actual / maxValue) * 100}%` }}
              />
            </div>
            <p className="savings-chart-label">{formatMonthShort(item.monthKey)}</p>
            <p className="savings-chart-copy">
              {formatNpr(item.actual)} / {formatNpr(item.committed)}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
