export default function ConsistencyScore({ score }) {
  return (
    <div className="dashboard-card">
      <p className="card-label">Consistency score</p>
      <p className="consistency-score-value">{Math.round(score)}/100</p>
      <p className="card-copy">This score will matter when you need a loan.</p>
    </div>
  )
}
