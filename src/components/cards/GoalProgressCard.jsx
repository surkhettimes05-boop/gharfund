function formatNpr(amount) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export default function GoalProgressCard({ goal }) {
  if (!goal) {
    return (
      <section className="dashboard-card dashboard-card-empty" aria-labelledby="goal-progress-title">
        <p className="card-label" id="goal-progress-title">Savings goal</p>
        <p className="card-value">No active goal yet.</p>
        <p className="card-copy">Create a savings goal to track progress here.</p>
      </section>
    )
  }

  return (
    <section className="dashboard-card" aria-labelledby="goal-progress-title">
      <p className="card-label" id="goal-progress-title">Savings goal</p>
      <p className="card-value">{goal.goal_name}</p>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${goal.progress_percent}%` }} />
      </div>
      <p className="card-copy">
        {formatNpr(goal.saved_amount_npr)} saved / {formatNpr(goal.target_amount_npr)}
      </p>
    </section>
  )
}
