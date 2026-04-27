import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import KycStatusBadge from '../components/KycStatusBadge.jsx'
import { getStoredSession } from '../lib/session.js'
import { createSavingsEntryForTransfer } from '../services/savingsService.js'
import { recalculateUserStreak } from '../services/streakService.js'
import { createConfirmedTransfer } from '../services/transferService.js'
import { trackEvent, trackFeedbackClicked } from '../utils/analytics.js'
import { formatTransferDate } from '../utils/date.js'
import { formatNpr, parsePositiveInteger } from '../utils/money.js'
import { buildFounderFeedbackLink, buildTransferLoggedLink } from '../utils/whatsapp.js'

// ---------------------------------------------------------------------------
// KYC gate — shown instead of the transfer form when kyc_status ≠ verified
// ---------------------------------------------------------------------------
const KYC_GATE_COPY = {
  unverified: {
    title: 'Verify your identity to send money.',
    body: 'To comply with regulations, you need to complete a one-time identity check before logging a transfer. It takes about 2 minutes.',
    cta: 'Start verification',
  },
  pending: {
    title: 'Identity check in progress.',
    body: 'Your documents are being reviewed. Transfers will be unlocked as soon as your identity is confirmed — usually within 1–2 business days.',
    cta: 'View KYC status',
  },
  rejected: {
    title: 'Identity check was not approved.',
    body: 'Your previous submission could not be verified. Please resubmit your documents to unlock transfers.',
    cta: 'Resubmit documents',
  },
}

function KycGate({ kycStatus }) {
  const copy = KYC_GATE_COPY[kycStatus] ?? KYC_GATE_COPY.unverified

  return (
    <section className="app-panel" aria-labelledby="kyc-gate-title">
      <p className="eyebrow">Log Transfer</p>
      <h1 id="kyc-gate-title" style={{ fontSize: '1.5rem' }}>
        {copy.title}
      </h1>

      <div style={{ margin: '16px 0' }}>
        <KycStatusBadge status={kycStatus} />
      </div>

      <p className="lede">{copy.body}</p>

      <div className="stack-actions" style={{ marginTop: 28 }}>
        <Link className="primary-link primary-link-block" to="/kyc">
          {copy.cta}
        </Link>
        <Link className="secondary-link secondary-link-block" to="/home">
          Back to home
        </Link>
      </div>
    </section>
  )
}

const RECIPIENT_OPTIONS = [
  { value: 'wife', label: 'Wife' },
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'other', label: 'Other' },
]

const METHOD_OPTIONS = [
  { value: 'western_union', label: 'Western Union' },
  { value: 'ime_pay', label: 'IME Pay' },
  { value: 'prabhu_pay', label: 'Prabhu Pay' },
  { value: 'other', label: 'Other' },
]

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function getRecipientLabel(recipientType) {
  return RECIPIENT_OPTIONS.find((option) => option.value === recipientType)?.label || ''
}

function getMethodLabel(method) {
  return METHOD_OPTIONS.find((option) => option.value === method)?.label || ''
}

export default function LogTransfer() {
  const navigate = useNavigate()
  const session = getStoredSession()
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [method, setMethod] = useState('')
  const [transferDate, setTransferDate] = useState(getTodayIsoDate())
  const [savedAmount, setSavedAmount] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [goalPromptVisible, setGoalPromptVisible] = useState(false)
  const [savedTransfer, setSavedTransfer] = useState(null)
  const [savedStreak, setSavedStreak] = useState(null)

  const parsedAmount = parsePositiveInteger(amount)
  const parsedSavedAmount = parsePositiveInteger(savedAmount)
  const isValidAmount = parsedAmount !== null
  const isValidDate = transferDate <= getTodayIsoDate()
  const canContinue = isValidAmount && recipient && method && isValidDate
  const canConfirmTransfer = canContinue && status !== 'saving-transfer'
  const canSaveSavings = parsedSavedAmount !== null && status !== 'saving-savings'

  const formattedAmount = useMemo(
    () => formatNpr(parsedAmount ?? 0),
    [parsedAmount],
  )

  const summaryDate = useMemo(() => {
    if (!transferDate) {
      return ''
    }

    return formatTransferDate(transferDate)
  }, [transferDate])
  const transferLoggedShareLink = useMemo(
    () =>
      savedTransfer
        ? buildTransferLoggedLink({
            name: session?.name || '',
            amount: savedTransfer.amount_npr,
            familyToken: session?.familyToken || '',
          })
        : '',
    [savedTransfer, session?.familyToken, session?.name],
  )
  const feedbackLink = useMemo(() => buildFounderFeedbackLink(), [])

  function validateStepOne() {
    if (!session?.supabaseUserId) {
      return 'Your session is missing. Login again.'
    }

    if (!isValidAmount) {
      return 'Enter a valid amount in NPR.'
    }

    if (!recipient) {
      return 'Select who you sent the transfer to.'
    }

    if (!method) {
      return 'Select the transfer method.'
    }

    if (!transferDate || !isValidDate) {
      return 'Transfer date cannot be in the future.'
    }

    return ''
  }

  function buildHomeState(message, streak) {
    return {
      replace: true,
      state: {
        transferSaved: true,
        transferMessage: message,
        streak,
      },
    }
  }

  function navigateHome(message, streak) {
    navigate('/home', buildHomeState(message, streak))
  }

  function handleContinue(event) {
    event.preventDefault()
    const validationError = validateStepOne()

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    trackEvent('transfer_logged', {
      session,
      properties: {
        amount_npr: parsedAmount,
        method,
        recipient_type: recipient,
        transfer_date: transferDate,
      },
    })
    setStep(2)
  }

  if (!session?.supabaseUserId) {
    return (
      <ErrorState
        eyebrow="Log Transfer"
        title="Transfer logging unavailable."
        message="Your session is missing. Login again."
        linkTo="/auth"
        linkLabel="Back to login"
      />
    )
  }

  // KYC gate — block transfer form until identity is verified
  if (session.kycStatus !== 'verified') {
    return <KycGate kycStatus={session.kycStatus ?? 'unverified'} />
  }

  async function handleConfirmTransfer() {
    const validationError = validateStepOne()

    if (validationError) {
      setError(validationError)
      return
    }

    setStatus('saving-transfer')
    setError('')
    setSuccessMessage('')
    setGoalPromptVisible(false)

    try {
      const transfer = await createConfirmedTransfer(session.supabaseUserId, {
        amount_npr: parsedAmount,
        transfer_date: transferDate,
        method,
        recipient_type: recipient,
      })
      trackEvent('transfer_confirmed', {
        session,
        properties: {
          transfer_id: transfer.id,
          amount_npr: transfer.amount_npr,
          method: transfer.method,
          recipient_type: transfer.recipient_type,
          transfer_date: transfer.transfer_date,
        },
      })

      const streak = await recalculateUserStreak(session.supabaseUserId)
      trackEvent('streak_updated', {
        session,
        properties: {
          current_streak: streak.current_streak,
          longest_streak: streak.longest_streak,
          consistency_score: streak.consistency_score,
          last_transfer_month: streak.last_transfer_month,
        },
      })

      setSavedTransfer(transfer)
      setSavedStreak(streak)
      setStatus('idle')
      setStep(3)
      setSuccessMessage(`Transfer saved successfully: ${formatNpr(transfer.amount_npr)}.`)
    } catch (saveError) {
      setStatus('idle')
      setError(saveError.message || 'Could not save the transfer.')
    }
  }

  async function handleSaveSavings() {
    if (!savedTransfer || !savedStreak) {
      setError('Transfer is missing. Log the transfer again.')
      return
    }

    if (!parsedSavedAmount) {
      setError('Enter how much you saved from this transfer.')
      return
    }

    setStatus('saving-savings')
    setError('')
    setGoalPromptVisible(false)

    try {
      const result = await createSavingsEntryForTransfer({
        userId: session.supabaseUserId,
        transferId: savedTransfer.id,
        transferDate,
        amountSavedNpr: parsedSavedAmount,
      })

      setStatus('idle')

      if (result.status === 'no_goal') {
        setGoalPromptVisible(true)
        setSuccessMessage('Transfer saved successfully. Savings was not tracked because no active goal exists yet.')
        return
      }

      if (result.status === 'duplicate') {
        navigateHome(
          `Transfer saved successfully: ${formatNpr(savedTransfer.amount_npr)}. Savings was already linked to this transfer.`,
          savedStreak,
        )
        return
      }

      navigateHome(
        `Transfer saved successfully: ${formatNpr(savedTransfer.amount_npr)}. Saved ${formatNpr(parsedSavedAmount)} toward your goal.`,
        savedStreak,
      )
    } catch (saveError) {
      setStatus('idle')
      setError(saveError.message || 'Could not save the savings entry.')
    }
  }

  function handleSkipSavings() {
    if (!savedTransfer || !savedStreak) {
      setError('Transfer is missing. Log the transfer again.')
      return
    }

    navigateHome(
      `Transfer saved successfully: ${formatNpr(savedTransfer.amount_npr)}.`,
      savedStreak,
    )
  }

  function handleFeedbackClick() {
    trackFeedbackClicked('transfer_logged', { session })
  }

  return (
    <section className="app-panel" aria-labelledby="transfer-title">
      <p className="eyebrow">Log Transfer</p>
      <h1 id="transfer-title">
        {step === 1
          ? 'Enter transfer details.'
          : step === 2
            ? 'Confirm this transfer.'
            : 'Add savings from this transfer.'}
      </h1>
      <p className="lede">
        {step === 1
          ? 'Nothing is saved until you review and confirm the summary.'
          : step === 2
            ? 'Review the summary carefully before saving it to SansarPay.'
            : 'Great! Did you save anything from this transfer?'}
      </p>

      {step === 1 ? (
        <form className="auth-form" onSubmit={handleContinue}>
          <label className="field-label" htmlFor="transfer-amount">
            Amount sent (NPR)
          </label>
          <input
            id="transfer-amount"
            className="otp-input text-input"
            inputMode="numeric"
            placeholder="45000"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))}
          />

          <label className="field-label" htmlFor="transfer-recipient">
            Sending to
          </label>
          <select
            id="transfer-recipient"
            className="select-input"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
          >
            <option value="">Select recipient</option>
            {RECIPIENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="transfer-method">
            Transfer method
          </label>
          <select
            id="transfer-method"
            className="select-input"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          >
            <option value="">Select method</option>
            {METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="transfer-date">
            Transfer date
          </label>
          <input
            id="transfer-date"
            className="select-input"
            type="date"
            max={getTodayIsoDate()}
            value={transferDate}
            onChange={(event) => setTransferDate(event.target.value)}
          />

          <button className="primary-button" type="submit" disabled={!canContinue}>
            Continue to confirmation
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="auth-form">
          <div className="summary-card">
            <p className="summary-line">
              <strong>{formattedAmount}</strong>
            </p>
            <p className="summary-line">
              Sent to <strong>{getRecipientLabel(recipient)}</strong>
            </p>
            <p className="summary-line">
              Via <strong>{getMethodLabel(method)}</strong> on <strong>{summaryDate}</strong>
            </p>
          </div>

          <button
            className="primary-button"
            type="button"
            disabled={!canConfirmTransfer}
            onClick={handleConfirmTransfer}
          >
            {status === 'saving-transfer' ? 'Saving transfer...' : 'Yes, completed'}
          </button>
          <button className="text-button" type="button" onClick={() => setStep(1)}>
            Edit details
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="auth-form">
          <div className="summary-card">
            <p className="summary-line">
              Transfer saved: <strong>{formatNpr(savedTransfer?.amount_npr ?? 0)}</strong>
            </p>
            <p className="summary-line">
              Date <strong>{savedTransfer?.transfer_date ? formatTransferDate(savedTransfer.transfer_date) : summaryDate}</strong>
            </p>
          </div>

          {transferLoggedShareLink ? (
            <a
              className="secondary-link secondary-link-block"
              href={transferLoggedShareLink}
              target="_blank"
              rel="noreferrer"
            >
              Notify on WhatsApp
            </a>
          ) : null}

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

          <label className="field-label" htmlFor="saved-amount">
            Yes, NPR
          </label>
          <input
            id="saved-amount"
            className="otp-input text-input"
            inputMode="numeric"
            placeholder="5000"
            value={savedAmount}
            onChange={(event) => setSavedAmount(event.target.value.replace(/\D/g, ''))}
          />

          <button
            className="primary-button"
            type="button"
            disabled={!canSaveSavings}
            onClick={handleSaveSavings}
          >
            {status === 'saving-savings' ? 'Saving savings...' : 'Save savings'}
          </button>
          <button className="text-button" type="button" onClick={handleSkipSavings}>
            Not this time
          </button>

          {goalPromptVisible ? (
            <div className="summary-card">
              <p className="summary-line">Set a goal to track your savings.</p>
              <Link className="secondary-link secondary-link-block" to="/goals/create">
                Set a goal
              </Link>
              <button className="text-button" type="button" onClick={handleSkipSavings}>
                Continue to Home
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {successMessage ? <p className="form-note">{successMessage}</p> : null}
      <Link className="secondary-link secondary-link-block" to="/transfers">
        Back to dashboard
      </Link>
    </section>
  )
}
