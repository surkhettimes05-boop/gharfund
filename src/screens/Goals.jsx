import { useCallback, useEffect, useMemo, useState } from 'react'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import CommitmentComparison from '../components/CommitmentComparison.jsx'
import GoalProgress from '../components/GoalProgress.jsx'
import MilestoneBanner from '../components/MilestoneBanner.jsx'
import MonthlySavingsChart from '../components/MonthlySavingsChart.jsx'
import { getStoredSession } from '../lib/session.js'
import { getActiveSavingsGoal, updateSavingsGoal } from '../services/goalService.js'
import {
  calculateSavingsDetail,
  getSavingsEntriesForGoal,
} from '../services/savingsService.js'
import { trackEvent } from '../utils/analytics.js'
import { getGoalEmoji } from '../utils/money.js'
import { buildGoalMilestoneShareLink } from '../utils/whatsapp.js'

function getMilestone(progressPercent) {
  if (progressPercent >= 100) {
    return 100
  }

  if (progressPercent >= 75) {
    return 75
  }

  if (progressPercent >= 50) {
    return 50
  }

  if (progressPercent >= 25) {
    return 25
  }

  return null
}

export default function Goals() {
  const session = getStoredSession()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [goal, setGoal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [targetAmount, setTargetAmount] = useState('')
  const [monthlyCommitment, setMonthlyCommitment] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')

  const loadGoalDetail = useCallback(async () => {
    if (!session?.supabaseUserId) {
      setError('Your session is missing. Login again.')
      setStatus('error')
      return
    }

    try {
      setStatus('loading')
      setError('')
      const activeGoal = await getActiveSavingsGoal(session.supabaseUserId)

      if (!activeGoal) {
        setGoal(null)
        setDetail(null)
        setStatus('ready')
        return
      }

      const savingsEntries = await getSavingsEntriesForGoal(activeGoal.id)
      const computedDetail = calculateSavingsDetail(activeGoal, savingsEntries)

      setGoal(activeGoal)
      setDetail(computedDetail)
      setTargetAmount(String(activeGoal.target_amount_npr))
      setMonthlyCommitment(String(activeGoal.monthly_commitment_npr))
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message || 'Could not load goal details.')
      setStatus('error')
    }
  }, [session?.supabaseUserId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadGoalDetail()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadGoalDetail])

  const milestone = useMemo(
    () => getMilestone(detail?.progressPercent || 0),
    [detail?.progressPercent],
  )
  const milestoneShareLink = useMemo(
    () =>
      goal && milestone
        ? buildGoalMilestoneShareLink({
            goalName: goal.goal_name,
            milestonePercent: milestone,
            familyToken: session?.familyToken || '',
          })
        : '',
    [goal, milestone, session?.familyToken],
  )

  async function handleSaveEdit(event) {
    event.preventDefault()

    const parsedTargetAmount = Number.parseInt(targetAmount, 10)
    const parsedMonthlyCommitment = Number.parseInt(monthlyCommitment, 10)

    if (!goal?.id || parsedTargetAmount <= 0 || parsedMonthlyCommitment <= 0) {
      setError('Enter valid amounts before saving.')
      return
    }

    try {
      setSaveStatus('saving')
      const updatedGoal = await updateSavingsGoal(goal.id, {
        target_amount_npr: parsedTargetAmount,
        monthly_commitment_npr: parsedMonthlyCommitment,
      })
      const savingsEntries = await getSavingsEntriesForGoal(updatedGoal.id)
      const computedDetail = calculateSavingsDetail(updatedGoal, savingsEntries)

      setGoal(updatedGoal)
      setDetail(computedDetail)
      setShowEdit(false)
      setSaveStatus('idle')
      setError('')
    } catch (saveError) {
      setSaveStatus('idle')
      setError(saveError.message || 'Could not update your goal.')
    }
  }

  function handleMilestoneShare() {
    if (!goal || !milestone) {
      return
    }

    trackEvent('milestone_shared', {
      session,
      properties: {
        goal_id: goal.id,
        goal_name: goal.goal_name,
        milestone_percent: milestone,
      },
    })
  }

  if (status === 'loading') {
    return <LoadingState eyebrow="Goals" title="Loading your goal..." />
  }

  if (status === 'error') {
    return (
      <ErrorState
        eyebrow="Goals"
        title="Goal detail unavailable."
        message={error}
        onRetry={loadGoalDetail}
        retryLabel="Reload goal"
      />
    )
  }

  if (!goal || !detail) {
    return (
      <EmptyState
        eyebrow="Goals"
        title="No active goal yet."
        copy="Set your first savings goal to start tracking commitment and progress."
        actionTo="/goals/create"
        actionLabel="Set savings goal"
      />
    )
  }

  return (
    <section className="app-panel" aria-labelledby="goals-title">
      <p className="eyebrow">Goals</p>
      <h1 id="goals-title">Goal detail</h1>

      <GoalProgress
        emoji={getGoalEmoji(goal.goal_type)}
        goalName={goal.goal_name}
        savedAmount={detail.totalSaved}
        targetAmount={goal.target_amount_npr}
        progressPercent={detail.progressPercent}
      />

      <CommitmentComparison
        committedAmount={detail.currentMonthCommitted}
        actualAmount={detail.currentMonthActual}
        delta={detail.currentMonthDelta}
        monthsRemaining={detail.monthsRemaining}
      />

      <MonthlySavingsChart items={detail.sixMonthHistory} />

      <MilestoneBanner
        milestone={milestone}
        shareLink={milestoneShareLink}
        onShare={handleMilestoneShare}
      />

      <button className="primary-button" type="button" onClick={() => setShowEdit(true)}>
        Edit goal
      </button>

      {showEdit ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-goal-title">
          <div className="modal-panel">
            <h2 id="edit-goal-title" className="settings-section-title">Edit goal</h2>
            <form className="auth-form" onSubmit={handleSaveEdit}>
              <label className="field-label" htmlFor="edit-target-amount">
                Target amount (NPR)
              </label>
              <input
                id="edit-target-amount"
                className="otp-input text-input"
                inputMode="numeric"
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value.replace(/\D/g, ''))}
              />

              <label className="field-label" htmlFor="edit-monthly-commitment">
                Monthly commitment (NPR)
              </label>
              <input
                id="edit-monthly-commitment"
                className="otp-input text-input"
                inputMode="numeric"
                value={monthlyCommitment}
                onChange={(event) =>
                  setMonthlyCommitment(event.target.value.replace(/\D/g, ''))
                }
              />

              <button className="primary-button" type="submit" disabled={saveStatus === 'saving'}>
                {saveStatus === 'saving' ? 'Saving...' : 'Save'}
              </button>
              <button className="text-button" type="button" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
    </section>
  )
}
