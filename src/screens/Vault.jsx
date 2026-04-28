import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { getStoredSession } from '../lib/session.js'
import { getOrCreateVault, getVaultBalance, depositToVault } from '../services/vaultService.js'
import { requestWithdrawal, getUserWithdrawalRequests } from '../services/withdrawalService.js'
import { formatNpr } from '../utils/money.js'

export default function Vault() {
  const session = getStoredSession()
  const [vault, setVault] = useState(null)
  const [withdrawalRequests, setWithdrawalRequests] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  // Withdrawal form state
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalReason, setWithdrawalReason] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadVault() {
      if (!session?.supabaseUserId) {
        setStatus('error')
        setError('Session not found')
        return
      }

      try {
        const vaultData = await getOrCreateVault(session.supabaseUserId)
        const requests = await getUserWithdrawalRequests(session.supabaseUserId)

        if (!cancelled) {
          setVault(vaultData)
          setWithdrawalRequests(requests)
          setStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load vault')
          setStatus('error')
        }
      }
    }

    void loadVault()

    return () => {
      cancelled = true
    }
  }, [session?.supabaseUserId])

  if (!session?.supabaseUserId) {
    return (
      <ErrorState
        eyebrow="Vault"
        title="Session unavailable"
        message="Please log in again."
        linkTo="/auth"
        linkLabel="Back to login"
      />
    )
  }

  if (status === 'loading') {
    return <LoadingState eyebrow="Vault" title="Loading vault..." />
  }

  if (status === 'error' || !vault) {
    return (
      <ErrorState
        eyebrow="Vault"
        title="Failed to load vault"
        message={error}
        linkTo="/home"
        linkLabel="Back to home"
      />
    )
  }

  const available = vault.balance_npr - vault.locked_amount_npr

  async function handleRequestWithdrawal(e) {
    e.preventDefault()
    setError('')
    setStatus('saving')

    try {
      const amount = parseInt(withdrawalAmount, 10)
      if (!amount || amount <= 0) {
        throw new Error('Withdrawal amount must be positive')
      }

      await requestWithdrawal(session.supabaseUserId, amount, withdrawalReason)

      // Reload vault and requests
      const vaultData = await getOrCreateVault(session.supabaseUserId)
      const requests = await getUserWithdrawalRequests(session.supabaseUserId)

      setVault(vaultData)
      setWithdrawalRequests(requests)
      setShowWithdrawalForm(false)
      setWithdrawalAmount('')
      setWithdrawalReason('')
      setStatus('ready')
    } catch (err) {
      setError(err.message || 'Failed to request withdrawal')
      setStatus('ready')
    }
  }

  return (
    <section className="app-panel" aria-labelledby="vault-title">
      <p className="eyebrow">Vault</p>
      <h1 id="vault-title">Your Savings Account</h1>

      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              padding: 12,
              backgroundColor: '#f5f5f5',
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>Total Balance</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatNpr(vault.balance_npr)}</p>
          </div>
          <div
            style={{
              padding: 12,
              backgroundColor: '#f5f5f5',
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>Available</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2e7d32' }}>
              {formatNpr(available)}
            </p>
          </div>
        </div>

        {vault.locked_amount_npr > 0 && (
          <div style={{ padding: 8, backgroundColor: '#fff3e0', borderRadius: 6, textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#f57c00' }}>
              {formatNpr(vault.locked_amount_npr)} locked for pending withdrawal
            </p>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: 12, backgroundColor: '#ffebee', borderRadius: 6, marginBottom: 16 }}>
          <p style={{ color: '#c62828', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {!showWithdrawalForm ? (
        <button
          className="primary-link primary-link-block"
          onClick={() => setShowWithdrawalForm(true)}
          style={{ marginBottom: 16 }}
        >
          Request Withdrawal
        </button>
      ) : (
        <form className="auth-form" onSubmit={handleRequestWithdrawal} style={{ marginBottom: 16 }}>
          <label className="field-label" htmlFor="withdrawal-amount">
            Amount (NPR)
          </label>
          <input
            id="withdrawal-amount"
            className="text-input"
            inputMode="numeric"
            placeholder="10000"
            value={withdrawalAmount}
            onChange={(e) => setWithdrawalAmount(e.target.value.replace(/\D/g, ''))}
            max={available}
          />

          <label className="field-label" htmlFor="withdrawal-reason">
            Reason (optional)
          </label>
          <textarea
            id="withdrawal-reason"
            className="text-input"
            placeholder="Why do you need this withdrawal?"
            value={withdrawalReason}
            onChange={(e) => setWithdrawalReason(e.target.value)}
            rows={3}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="submit"
              className="primary-link"
              disabled={!withdrawalAmount || status === 'saving'}
            >
              {status === 'saving' ? 'Requesting...' : 'Submit Request'}
            </button>
            <button
              type="button"
              className="secondary-link"
              onClick={() => {
                setShowWithdrawalForm(false)
                setWithdrawalAmount('')
                setWithdrawalReason('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 12 }}>Withdrawal Requests</h2>

        {withdrawalRequests.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>
            No withdrawal requests yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {withdrawalRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  padding: 12,
                  border: '1px solid #e0e0e0',
                  borderRadius: 6,
                  backgroundColor: req.status === 'pending' ? '#f9f9f9' : '#f5f5f5',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <p style={{ fontWeight: 'bold' }}>{formatNpr(req.amount_npr)}</p>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      backgroundColor:
                        req.status === 'pending'
                          ? '#fff3e0'
                          : req.status === 'approved'
                            ? '#e8f5e9'
                            : '#ffebee',
                      color:
                        req.status === 'pending'
                          ? '#f57c00'
                          : req.status === 'approved'
                            ? '#2e7d32'
                            : '#c62828',
                    }}
                  >
                    {req.status.toUpperCase()}
                  </span>
                </div>
                {req.reason && <p style={{ fontSize: '0.875rem', color: '#666' }}>{req.reason}</p>}
                <p style={{ fontSize: '0.75rem', color: '#999' }}>
                  {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <Link className="secondary-link secondary-link-block" to="/home">
          Back to Home
        </Link>
      </div>
    </section>
  )
}
