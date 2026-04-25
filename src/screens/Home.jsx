import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GoalProgressCard from '../components/cards/GoalProgressCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LastTransferCard from '../components/cards/LastTransferCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { getStoredSession } from '../lib/session.js'
import { getActiveSavingsGoal } from '../services/goalService.js'
import { getLatestConfirmedTransfer, hasTransferThisMonth } from '../services/transferService.js'
import { getCurrentUserProfile, getCurrentUserStreak } from '../services/userService.js'
import { buildFamilyViewShareLink } from '../utils/whatsapp.js'

export default function Home() {
  const session = getStoredSession()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [streak, setStreak] = useState(0)
  const [latestTransfer, setLatestTransfer] = useState(null)
  const [goal, setGoal] = useState(null)

  const loadDashboard = useCallback(async () => {
    if (!session?.supabaseUserId) {
      setError('Your session is missing. Login again.')
      setStatus('error')
      return
    }

    try {
      setStatus('loading')
      setError('')
      const [userProfile, streakRow, transferRow, activeGoal] = await Promise.all([
        getCurrentUserProfile(session.supabaseUserId),
        getCurrentUserStreak(session.supabaseUserId),
        getLatestConfirmedTransfer(session.supabaseUserId),
        getActiveSavingsGoal(session.supabaseUserId),
      ])

      if (!userProfile) {
        setError('Your profile could not be found. Login again.')
        setStatus('error')
        return
      }

      setProfile(userProfile)
      setStreak(streakRow?.current_streak || 0)
      setLatestTransfer(transferRow)
      setGoal(activeGoal)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message || 'Could not load dashboard data.')
      setStatus('error')
    }
  }, [session?.supabaseUserId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadDashboard])

  const streakLabel = streak > 0 ? `🔥 ${streak} months` : '🌱'
  const familyToken = profile?.family_token || ''
  const shareLink = useMemo(
    () => (familyToken ? buildFamilyViewShareLink({ familyToken }) : ''),
    [familyToken],
  )

  if (status === 'loading') {
    return <LoadingState eyebrow="SansarPay" title="Loading your dashboard..." />
  }

  if (status === 'error') {
    return (
      <ErrorState
        eyebrow="SansarPay"
        title="Dashboard unavailable."
        message={error}
        onRetry={loadDashboard}
        retryLabel="Reload dashboard"
      />
    )
  }

  if (!profile) {
    return (
      <EmptyState
        eyebrow="SansarPay"
        title="Profile not ready yet."
        copy="Finish signing in and try reloading your dashboard."
      />
    )
  }

  return (
    <section className="app-panel" aria-labelledby="home-title">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">SansarPay</p>
          <h1 id="home-title">Namaste, {profile?.name || session?.name || 'worker'} 🙏</h1>
        </div>
        <div className="streak-badge">{streakLabel}</div>
      </div>

      <div className="dashboard-grid">
        <LastTransferCard
          transfer={latestTransfer}
          hasTransferThisMonth={hasTransferThisMonth(latestTransfer?.transfer_date)}
        />
        <GoalProgressCard goal={goal} />
      </div>

      <div className="stack-actions">
        <Link className="primary-link primary-link-block" to="/log-transfer">
          + Log Transfer
        </Link>
        <a
          className="secondary-link secondary-link-block"
          href={shareLink || '#'}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!shareLink}
        >
          Share family view link
        </a>
      </div>

      {!latestTransfer && !goal ? (
        <p className="form-note">
          You are all set up. Start by logging your first transfer and your dashboard will begin filling in.
        </p>
      ) : null}
    </section>
  )
}
