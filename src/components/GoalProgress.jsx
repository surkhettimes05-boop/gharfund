import { formatNpr } from '../utils/money.js'

export default function GoalProgress({ emoji, goalName, savedAmount, targetAmount, progressPercent }) {
  return (
    <section className="dashboard-card" aria-labelledby="goal-progress-title">
      <p className="card-label" id="goal-progress-title">Active goal</p>
      <p className="goal-hero">
        <span className="goal-emoji" aria-hidden="true">{emoji}</span>
        <span>{goalName}</span>
      </p>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <p className="card-copy">
        {formatNpr(savedAmount)} saved of {formatNpr(targetAmount)}
      </p>
    </section>
  )
}
