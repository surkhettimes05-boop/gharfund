export default function StreakHero({ currentStreak, motivationalCopy }) {
  const isZero = currentStreak === 0

  return (
    <div className="dashboard-card streak-hero-card">
      <p className="streak-hero-number">{isZero ? '🔥 0' : `🔥 ${currentStreak}`}</p>
      <p className="streak-hero-label">Months consistent</p>
      <p className="card-copy">
        {isZero ? '🌱 Start your streak — log a transfer this month' : motivationalCopy}
      </p>
    </div>
  )
}
