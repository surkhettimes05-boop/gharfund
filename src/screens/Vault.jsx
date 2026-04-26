import { useEffect, useState } from 'react'
import { getStoredSession } from '../lib/session.js'
import {
  getOrCreateVault,
  requestWithdrawal,
  getUserWithdrawalRequests,
} from '../services/vaultService.js'
import { formatNpr, parsePositiveInteger } from '../utils/money.js'
import { trackEvent } from '../utils/analytics.js'

export default function Vault() {
  const session = getStoredSession()
  const [vault, setVault] = useState(null)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalReason, setWithdrawalReason] = useState('')
  const [requests, setRequests] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const parsedAmount = parsePositiveInteger(withdrawalAmount)

  useEffect(() => {
    async function loadVault() {
      if (!session?.supabaseUserId) return
      try {
        const vaultData = await getOrCreateVault(session.supabaseUserId)
        setVault(vaultData)

        const requestsData = await getUserWithdrawalRequests(session.supabaseUserId)
        setRequests(requestsData)
      } catch (e) {
        setError('Could not load vault.')
      }
    }
    loadVault()
  }, [session?.supabaseUserId])

  async function handleRequestWithdrawal(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid withdrawal amount.')
      return
    }

    if (!withdrawalReason.trim()) {
      setError('Enter a reason for withdrawal.')
      return
    }

    if (vault.balance < parsedAmount) {
      setError('Insufficient vault balance.')
      return
    }

    setStatus('requesting')
    try {
      const request = await requestWithdrawal(
        session.supabaseUserId,
        parsedAmount,
        withdrawalReason,
      )
      trackEvent('withdrawal_requested', {
        session,
        properties: {
          amount_npr: parsedAmount,
          reason: withdrawalReason,
        },
      })
      setSuccess(`Withdrawal request submitted for ${formatNpr(parsedAmount)}.`)
      setWithdrawalAmount('')
      setWithdrawalReason('')
      setStatus('idle')

      // Reload requests
      const updated = await getUserWithdrawalRequests(session.supabaseUserId)
      setRequests(updated)

      // Reload vault
      const vaultData = await getOrCreateVault(session.supabaseUserId)
      setVault(vaultData)
    } catch (e) {
      setError(e.message || 'Could not request withdrawal.')
      setStatus('idle')
    }
  }

  if (!vault) {
    return (
      <section className="app-panel" aria-labelledby="vault-title">
        <h1 id="vault-title">Vault</h1>
        <p className="lede">Loading...</p>
      </section>
    )
  }

  return (
    <section className="app-panel" aria-labelledby="vault-title">
      <p className="eyebrow">Vault</p>
      <h1 id="vault-title">Your Savings Vault</h1>
      <p className="lede">Manage your locked savings and request withdrawals.</p>

      <div className="summary-card">
        <p className="summary-line">
          Available Balance: <strong>{formatNpr(vault.balance)}</strong>
        </p>
        <p className="summary-line">
          Locked Savings: <strong>{formatNpr(vault.locked_amount)}</strong>
        </p>
        <p className="summary-line">
          Total: <strong>{formatNpr(vault.balance + vault.locked_amount)}</strong>
        </p>
      </div>

      <form className="auth-form" onSubmit={handleRequestWithdrawal}>
        <p className="form-label">Request Withdrawal</p>

        <label className="field-label">Amount (NPR)</label>
        <input
          className="otp-input text-input"
          inputMode="numeric"
          placeholder="5000"
          value={withdrawalAmount}
          onChange={(e) => setWithdrawalAmount(e.target.value.replace(/\D/g, ''))}
        />

        <label className="field-label">Reason</label>
        <textarea
          className="select-input"
          placeholder="Why do you need this withdrawal?"
          value={withdrawalReason}
          onChange={(e) => setWithdrawalReason(e.target.value)}
          rows="3"
        />

        <button className="primary-button" type="submit" disabled={status === 'requesting'}>
          {status === 'requesting' ? 'Requesting...' : 'Request Withdrawal'}
        </button>
      </form>

      {requests.length > 0 && (
        <div className="summary-card">
          <p className="form-label">Recent Requests</p>
          {requests.map((req) => (
            <div key={req.id} className="summary-line">
              <p>
                {formatNpr(req.amount_npr)} - <strong>{req.status}</strong>
              </p>
              <p className="form-note">{req.reason}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && <p className="form-note">{success}</p>}
    </section>
  )
}
