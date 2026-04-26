import { useEffect, useState } from 'react'
import { getStoredSession } from '../lib/session.js'
import { getSansarScoreDetails } from '../services/scoringService.js'
import ErrorState from '../components/ErrorState.jsx'

export default function Score() {
  const session = getStoredSession()
  const [scoreData, setScoreData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadScore() {
      if (!session?.supabaseUserId) {
        setError('Session missing.')
        setLoading(false)
        return
      }

      try {
        const details = await getSansarScoreDetails(session.supabaseUserId)
        setScoreData(details)
        setError('')
      } catch (e) {
        setError(e.message || 'Could not load score.')
      } finally {
        setLoading(false)
      }
    }

    loadScore()
  }, [session?.supabaseUserId])

  if (!session?.supabaseUserId) {
    return (
      <ErrorState
        eyebrow="SansarScore"
        title="Score unavailable."
        message="Your session is missing. Login again."
        linkTo="/auth"
        linkLabel="Back to login"
      />
    )
  }

  if (loading) {
    return (
      <section className="app-panel" aria-labelledby="score-title">
        <h1 id="score-title">SansarScore</h1>
        <p className="lede">Loading...</p>
      </section>
    )
  }

  if (error) {
    return (
      <ErrorState
        eyebrow="SansarScore"
        title="Score unavailable."
        message={error}
        linkTo="/home"
        linkLabel="Back to home"
      />
    )
  }

  const score = scoreData?.score || 0
  const breakdown = scoreData?.breakdown || {}

  // Color score based on value
  const getScoreColor = (s) => {
    if (s >= 80) return '#10b981' // green
    if (s >= 60) return '#f59e0b' // amber
    if (s >= 40) return '#f97316' // orange
    return '#ef4444' // red
  }

  const scoreColor = getScoreColor(score)

  return (
    <section className="app-panel" aria-labelledby="score-title">
      <p className="eyebrow">Credit Scoring</p>
      <h1 id="score-title">Your SansarScore</h1>
      <p className="lede">Rule-based credit score based on your transfer history and consistency.</p>

      <div className="summary-card" style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: scoreColor, marginBottom: '1rem' }}>
          {score.toFixed(1)}
        </div>
        <p className="summary-line" style={{ fontSize: '0.9rem', color: '#666' }}>
          Score Range: 0–100
        </p>
        {score >= 80 && <p className="form-note">Excellent credit score</p>}
        {score >= 60 && score < 80 && <p className="form-note">Good credit score</p>}
        {score >= 40 && score < 60 && <p className="form-note">Fair credit score</p>}
        {score < 40 && <p className="form-error">Low credit score - increase transfers to improve</p>}
      </div>

      <div className="summary-card">
        <p className="form-label">Score Breakdown</p>

        <div className="summary-line">
          <p>Transfer Frequency</p>
          <p>
            <strong>{breakdown.frequency?.toFixed(1) || 0}</strong> / 100
          </p>
        </div>

        <div className="summary-line">
          <p>Transfer Amount</p>
          <p>
            <strong>{breakdown.amount?.toFixed(1) || 0}</strong> / 100
          </p>
        </div>

        <div className="summary-line">
          <p>Activity Duration</p>
          <p>
            <strong>{breakdown.duration?.toFixed(1) || 0}</strong> / 100
          </p>
        </div>

        <div className="summary-line">
          <p>Consistency Score</p>
          <p>
            <strong>{breakdown.consistency?.toFixed(1) || 0}</strong> / 100
          </p>
        </div>

        {breakdown.streakBoost > 0 && (
          <div className="summary-line">
            <p>Active Streak Bonus</p>
            <p>
              <strong>+{breakdown.streakBoost?.toFixed(1) || 0}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="summary-card">
        <p className="form-label">How is SansarScore Calculated?</p>
        <p className="form-note">
          SansarScore is a transparent, rule-based credit score that combines:
        </p>
        <ul style={{ paddingLeft: '1rem', fontSize: '0.9rem', color: '#666' }}>
          <li>Transfer frequency (how often you send)</li>
          <li>Transfer amounts (total value sent)</li>
          <li>Activity duration (months of transfers)</li>
          <li>Consistency score (monthly regularity)</li>
          <li>Active streak bonus (recent consistency)</li>
        </ul>
        <p className="form-note">No machine learning. Fully explainable.</p>
      </div>
    </section>
  )
}
