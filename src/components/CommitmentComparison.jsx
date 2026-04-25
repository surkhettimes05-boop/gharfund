import { formatNpr } from '../utils/money.js'

export default function CommitmentComparison({
  committedAmount,
  actualAmount,
  delta,
  monthsRemaining,
}) {
  let deltaLabel = 'On track'

  if (delta > 0) {
    deltaLabel = `Ahead by ${formatNpr(delta)}`
  } else if (delta < 0) {
    deltaLabel = `Behind by ${formatNpr(Math.abs(delta))}`
  }

  return (
    <section className="dashboard-card" aria-labelledby="commitment-title">
      <p className="card-label" id="commitment-title">This month</p>
      <div className="comparison-grid">
        <div>
          <p className="stats-label">Committed</p>
          <p className="stats-value">{formatNpr(committedAmount)}</p>
        </div>
        <div>
          <p className="stats-label">Actually saved</p>
          <p className="stats-value">{formatNpr(actualAmount)}</p>
        </div>
      </div>
      <p className="card-copy">{deltaLabel}</p>
      <p className="card-copy">
        {monthsRemaining !== null
          ? `${monthsRemaining} month${monthsRemaining === 1 ? '' : 's'} remaining at current pace`
          : 'Months remaining unavailable'}
      </p>
    </section>
  )
}
