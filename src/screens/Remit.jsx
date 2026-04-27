import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import KycStatusBadge from '../components/KycStatusBadge.jsx'
import QuoteCard from '../components/QuoteCard.jsx'
import { getStoredSession } from '../lib/session.js'
import { getQuote } from '../services/payments/paymentService.js'
import { saveQuote } from '../services/remittanceService.js'
import { trackEvent } from '../utils/analytics.js'

const DELIVERY_METHODS = [
  { value: 'e_wallet', label: 'e-Wallet (eSewa / Khalti)' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'agent_cash_pickup', label: 'Cash Pickup' },
]

export default function Remit() {
  const navigate = useNavigate()
  const session = getStoredSession()

  const [step, setStep] = useState(1) // 1: input, 2: quote, 3: success
  const [amountNpr, setAmountNpr] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [method, setMethod] = useState('')

  const [quote, setQuote] = useState(null)
  const [quoteExpired, setQuoteExpired] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  if (!session?.supabaseUserId) {
    return (
      <ErrorState
        eyebrow="Remit"
        title="Remittance unavailable."
        message="Your session is missing. Login again."
        linkTo="/auth"
        linkLabel="Back to login"
      />
    )
  }

  // Remittance strictly requires verified KYC
  if (session.kycStatus !== 'verified') {
    return (
      <section className="app-panel" aria-labelledby="remit-gate-title">
        <p className="eyebrow">Remit</p>
        <h1 id="remit-gate-title" style={{ fontSize: '1.5rem' }}>
          Verification required
        </h1>
        <div style={{ margin: '16px 0' }}>
          <KycStatusBadge status={session.kycStatus ?? 'unverified'} />
        </div>
        <p className="lede">You must be fully verified to use the remittance service.</p>
        <div className="stack-actions" style={{ marginTop: 28 }}>
          <Link className="primary-link primary-link-block" to="/kyc">
            Check KYC Status
          </Link>
          <Link className="secondary-link secondary-link-block" to="/home">
            Back to home
          </Link>
        </div>
      </section>
    )
  }

  const parsedAmount = parseInt(amountNpr, 10)
  const canGetQuote =
    parsedAmount > 0 && recipientName && recipientPhone && method && status !== 'loading'
  const canConfirm = quote && !quoteExpired && status !== 'saving'

  async function handleGetQuote(e) {
    e.preventDefault()
    setError('')
    setStatus('loading')

    try {
      const q = await getQuote(parsedAmount, method)
      setQuote(q)
      setQuoteExpired(false)
      setStep(2)
      setStatus('idle')
    } catch (err) {
      setError(err.message || 'Failed to get quote.')
      setStatus('idle')
    }
  }

  async function handleConfirm() {
    setError('')
    setStatus('saving')

    try {
      await saveQuote(session.supabaseUserId, {
        amountNpr: quote.amountNpr,
        recipientName,
        recipientPhone,
        method,
        feeNpr: quote.feeNpr,
        fxRate: quote.fxRate,
        provider: quote.provider,
        lockedUntil: quote.lockedUntil,
      })

      trackEvent('remittance_simulated', {
        session,
        properties: { amount_npr: quote.amountNpr, method },
      })

      setStep(3)
      setStatus('idle')
    } catch (err) {
      setError(err.message || 'Could not save the quote.')
      setStatus('idle')
    }
  }

  return (
    <section className="app-panel" aria-labelledby="remit-title">
      <p className="eyebrow">Remit (V2)</p>
      <h1 id="remit-title">
        {step === 1
          ? 'Send Money to Nepal'
          : step === 2
            ? 'Review Quote'
            : 'Simulation Complete'}
      </h1>

      <p className="lede" style={{ marginBottom: 20 }}>
        {step === 1
          ? 'Simulation until partner API is live.'
          : step === 2
            ? 'Your FX rate is locked. Please confirm before the timer expires.'
            : 'Quote saved successfully! No real money was moved.'}
      </p>

      {step === 1 && (
        <form className="auth-form" onSubmit={handleGetQuote}>
          <label className="field-label" htmlFor="remit-amount">
            Amount (NPR)
          </label>
          <input
            id="remit-amount"
            className="text-input"
            inputMode="numeric"
            placeholder="10000"
            value={amountNpr}
            onChange={(e) => setAmountNpr(e.target.value.replace(/\D/g, ''))}
          />

          <label className="field-label" htmlFor="recipient-name">
            Recipient Name
          </label>
          <input
            id="recipient-name"
            className="text-input"
            placeholder="Jane Doe"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />

          <label className="field-label" htmlFor="recipient-phone">
            Recipient Phone
          </label>
          <input
            id="recipient-phone"
            className="text-input"
            inputMode="tel"
            placeholder="98XXXXXXXX"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ''))}
          />

          <label className="field-label" htmlFor="delivery-method">
            Delivery Method
          </label>
          <select
            id="delivery-method"
            className="select-input"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="">Select delivery method</option>
            {DELIVERY_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button" type="submit" disabled={!canGetQuote}>
            {status === 'loading' ? 'Getting Quote...' : 'Get Quote'}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="auth-form">
          <QuoteCard quote={quote} onExpire={() => setQuoteExpired(true)} />

          {quoteExpired && (
            <p className="form-error" role="alert" style={{ marginBottom: 16 }}>
              Quote expired. Please request a new one.
            </p>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="primary-button"
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {status === 'saving' ? 'Processing...' : 'Confirm Remittance'}
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setStep(1)
              setQuote(null)
              setQuoteExpired(false)
            }}
          >
            {quoteExpired ? 'Refresh Quote' : 'Cancel'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="auth-form">
          <div
            className="summary-card"
            style={{ textAlign: 'center', padding: '30px 15px' }}
          >
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 15 }}>
              ✅
            </span>
            <p className="summary-line">Your remittance quote has been saved.</p>
            <p className="form-note" style={{ marginTop: 10 }}>
              (Mock Provider Simulation)
            </p>
          </div>
          <Link className="primary-link primary-link-block" to="/home">
            Back to Dashboard
          </Link>
        </div>
      )}
    </section>
  )
}
