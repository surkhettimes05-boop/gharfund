import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import { createSavingsGoal } from '../services/goalService.js'
import { getStoredSession } from '../lib/session.js'
import { trackEvent, trackFeedbackClicked } from '../utils/analytics.js'
import { formatNpr } from '../utils/money.js'
import { buildFounderFeedbackLink } from '../utils/whatsapp.js'

const GOAL_OPTIONS = [
  { value: 'house', label: 'House', defaultName: 'House' },
  { value: 'education', label: 'Education', defaultName: 'Education' },
  { value: 'emergency', label: 'Emergency', defaultName: 'Emergency' },
  { value: 'custom', label: 'Custom', defaultName: '' },
]

export default function CreateGoal() {
  const navigate = useNavigate()
  const session = getStoredSession()
  const [step, setStep] = useState(1)
  const [goalType, setGoalType] = useState('house')
  const [goalName, setGoalName] = useState('House')
  const [targetAmount, setTargetAmount] = useState('')
  const [monthlyCommitment, setMonthlyCommitment] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [createdGoal, setCreatedGoal] = useState(null)
  const feedbackLink = useMemo(() => buildFounderFeedbackLink(), [])

  const parsedTargetAmount = Number.parseInt(targetAmount, 10)
  const parsedMonthlyCommitment = Number.parseInt(monthlyCommitment, 10)
  const isValidTargetAmount = Number.isInteger(parsedTargetAmount) && parsedTargetAmount > 0
  const isValidMonthlyCommitment =
    Number.isInteger(parsedMonthlyCommitment) && parsedMonthlyCommitment > 0
  const trimmedGoalName = goalName.trim()
  const isValidGoalName = trimmedGoalName.length > 0 && trimmedGoalName.length <= 30

  const estimatedMonths = useMemo(() => {
    if (!isValidTargetAmount || !isValidMonthlyCommitment) {
      return 0
    }

    return Math.ceil(parsedTargetAmount / parsedMonthlyCommitment)
  }, [isValidMonthlyCommitment, isValidTargetAmount, parsedMonthlyCommitment, parsedTargetAmount])

  function handleGoalTypeChange(event) {
    const nextGoalType = event.target.value
    const selectedGoal = GOAL_OPTIONS.find((goal) => goal.value === nextGoalType)
    setGoalType(nextGoalType)
    setGoalName(selectedGoal?.defaultName || '')
  }

  function validateForm() {
    if (!session?.supabaseUserId) {
      return 'Your session is missing. Login again.'
    }

    if (!isValidGoalName) {
      return 'Enter a goal name up to 30 characters.'
    }

    if (!isValidTargetAmount) {
      return 'Enter a valid target amount in NPR.'
    }

    if (!isValidMonthlyCommitment) {
      return 'Enter a valid monthly commitment in NPR.'
    }

    return ''
  }

  function handleContinue(event) {
    event.preventDefault()
    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setStep(2)
  }

  async function handleCommit() {
    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setStatus('saving')
      setError('')
      const createdGoal = await createSavingsGoal(session.supabaseUserId, {
        goal_type: goalType,
        goal_name: trimmedGoalName,
        target_amount_npr: parsedTargetAmount,
        monthly_commitment_npr: parsedMonthlyCommitment,
      })
      trackEvent('savings_goal_created', {
        session,
        properties: {
          goal_id: createdGoal.id,
          goal_type: goalType,
          goal_name: trimmedGoalName,
          target_amount_npr: parsedTargetAmount,
          monthly_commitment_npr: parsedMonthlyCommitment,
        },
      })
      trackEvent('commitment_made', {
        session,
        properties: {
          goal_id: createdGoal.id,
          goal_type: goalType,
          goal_name: trimmedGoalName,
          monthly_commitment_npr: parsedMonthlyCommitment,
        },
      })
      setCreatedGoal(createdGoal)
      setStatus('idle')
      setStep(3)
    } catch (saveError) {
      setStatus('idle')
      setError(saveError.message || 'Could not save your savings goal.')
    }
  }

  function handleFeedbackClick() {
    trackFeedbackClicked('goal_created', { session })
  }

  if (!session?.supabaseUserId) {
    return (
      <ErrorState
        eyebrow="Savings Goal"
        title="Goal setup unavailable."
        message="Your session is missing. Login again."
        linkTo="/auth"
        linkLabel="Back to login"
      />
    )
  }

  return (
    <section className="app-panel" aria-labelledby="create-goal-title">
      <p className="eyebrow">Savings Goal</p>
      <h1 id="create-goal-title">
        {step === 1
          ? 'Set your savings goal.'
          : step === 2
            ? 'Confirm your commitment.'
            : 'Goal created.'}
      </h1>

      {step === 1 ? (
        <form className="auth-form" onSubmit={handleContinue}>
          <label className="field-label" htmlFor="goal-type">
            Goal type
          </label>
          <select
            id="goal-type"
            className="select-input"
            value={goalType}
            onChange={handleGoalTypeChange}
          >
            {GOAL_OPTIONS.map((goal) => (
              <option key={goal.value} value={goal.value}>
                {goal.label}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="goal-name">
            Goal name
          </label>
          <input
            id="goal-name"
            className="otp-input text-input"
            value={goalName}
            onChange={(event) => setGoalName(event.target.value)}
            readOnly={goalType !== 'custom'}
            maxLength={30}
          />

          <label className="field-label" htmlFor="target-amount">
            Target amount (NPR)
          </label>
          <input
            id="target-amount"
            className="otp-input text-input"
            inputMode="numeric"
            placeholder="500000"
            value={targetAmount}
            onChange={(event) => setTargetAmount(event.target.value.replace(/\D/g, ''))}
          />

          <label className="field-label" htmlFor="monthly-commitment">
            Monthly commitment (NPR)
          </label>
          <input
            id="monthly-commitment"
            className="otp-input text-input"
            inputMode="numeric"
            placeholder="15000"
            value={monthlyCommitment}
            onChange={(event) => setMonthlyCommitment(event.target.value.replace(/\D/g, ''))}
          />

          <div className="summary-card">
            <p className="summary-line">Time to goal</p>
            <p className="summary-line">
              <strong>
                {estimatedMonths > 0
                  ? `${estimatedMonths} month${estimatedMonths === 1 ? '' : 's'}`
                  : 'Enter amounts to calculate'}
              </strong>
            </p>
          </div>

          <button className="primary-button" type="submit">
            Continue
          </button>
        </form>
      ) : step === 2 ? (
        <div className="auth-form">
          <div className="summary-card">
            <p className="summary-line">
              You are committing to save {formatNpr(parsedMonthlyCommitment)} every
              month toward your <strong>{trimmedGoalName}</strong>.
            </p>
            <p className="summary-line">This is your promise to your family.</p>
          </div>

          <button
            className="primary-button"
            type="button"
            disabled={status === 'saving'}
            onClick={handleCommit}
          >
            {status === 'saving' ? 'Saving commitment...' : 'I commit ✓'}
          </button>
          <button className="text-button" type="button" onClick={() => setStep(1)}>
            Change amount
          </button>
        </div>
      ) : (
        <div className="auth-form">
          <div className="summary-card">
            <p className="summary-line">
              Goal saved: <strong>{createdGoal?.goal_name || trimmedGoalName}</strong>
            </p>
            <p className="summary-line">
              Target {formatNpr(createdGoal?.target_amount_npr ?? parsedTargetAmount)}
            </p>
            <p className="summary-line">
              Monthly commitment {formatNpr(createdGoal?.monthly_commitment_npr ?? parsedMonthlyCommitment)}
            </p>
          </div>

          {feedbackLink ? (
            <a
              className="secondary-link secondary-link-block"
              href={feedbackLink}
              target="_blank"
              rel="noreferrer"
              onClick={handleFeedbackClick}
            >
              Send feedback on WhatsApp
            </a>
          ) : null}

          <button className="primary-button" type="button" onClick={() => navigate('/goals', { replace: true })}>
            Continue to goals
          </button>
        </div>
      )}

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <Link className="secondary-link secondary-link-block" to="/goals">
        Back to goals
      </Link>
    </section>
  )
}
