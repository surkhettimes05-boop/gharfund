import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { getStoredSession } from '../lib/session.js'
import {
  assignReferralCode,
  getUserReferralStats,
  getUserReferrals,
} from '../services/referralService.js'
import { formatNpr } from '../utils/money.js'

export default function Referrals() {
  const session = getStoredSession()
  const [stats, setStats] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadReferralData() {
      if (!session?.supabaseUserId) {
        setStatus('error')
        setError('Session not found')
        return
      }

      try {
        // Assign code if needed
        await assignReferralCode(session.supabaseUserId)

        // Get stats and referrals
        const referralStats = await getUserReferralStats(session.supabaseUserId)
        const userReferrals = await getUserReferrals(session.supabaseUserId)

        if (!cancelled) {
          setStats(referralStats)
          setReferrals(userReferrals)
          setStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load referral data')
          setStatus('error')
        }
      }
    }

    void loadReferralData()

    return () => {
      cancelled = true
    }
  }, [session?.supabaseUserId])

  if (!session?.supabaseUserId) {
    return (
      <ErrorState
        eyebrow="Referrals"
        title="Session unavailable"
        message="Please log in again."
        linkTo="/auth"
        linkLabel="Back to login"
      />
    )
  }

  if (status === 'loading') {
    return <LoadingState eyebrow="Referrals" title="Loading your referrals..." />
  }

  if (status === 'error' || !stats) {
    return (
      <ErrorState
        eyebrow="Referrals"
        title="Failed to load referrals"
        message={error}
        linkTo="/home"
        linkLabel="Back to home"
      />
    )
  }

  const referralLink = `${window.location.origin}/auth?referral=${stats.referral_code}`

  function copyToClipboard() {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="app-panel" aria-labelledby="referrals-title">
      <p className="eyebrow">Referrals</p>
      <h1 id="referrals-title">Earn Rewards</h1>

      <p className="lede" style={{ marginBottom: 20 }}>
        Invite friends to join SansarPay and earn {formatNpr(300)} for each successful referral.
      </p>

      {/* Referral Code Section */}
      <div
        style={{
          padding: 16,
          backgroundColor: '#f5f5f5',
          borderRadius: 8,
          marginBottom: 24,
          border: '1px solid #e0e0e0',
        }}
      >
        <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: 8 }}>Your Referral Code</p>
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <input
            type="text"
            value={stats.referral_code}
            readOnly
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: '1.125rem',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          />
          <button
            className="primary-link"
            onClick={copyToClipboard}
            style={{ padding: '8px 12px', minWidth: 'auto' }}
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>

        <div
          style={{
            padding: 12,
            backgroundColor: '#e3f2fd',
            borderRadius: 6,
            borderLeft: '3px solid #1976d2',
          }}
        >
          <p style={{ fontSize: '0.875rem', color: '#1565c0' }}>
            Share this link with friends: <br /> {referralLink}
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 12 }}>Your Referral Stats</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 12,
              border: '1px solid #e0e0e0',
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#666' }}>Total Referrals</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{stats.total_referrals}</p>
          </div>
          <div
            style={{
              padding: 12,
              border: '1px solid #e0e0e0',
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#666' }}>Rewards Earned</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2e7d32' }}>
              {formatNpr(stats.total_rewards)}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginTop: 12,
          }}
        >
          <div
            style={{
              padding: 8,
              backgroundColor: '#fff3e0',
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#f57c00' }}>Pending</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.pending}</p>
          </div>
          <div
            style={{
              padding: 8,
              backgroundColor: '#f3e5f5',
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#6a1b9a' }}>Activated</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.activated}</p>
          </div>
          <div
            style={{
              padding: 8,
              backgroundColor: '#e8f5e9',
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#2e7d32' }}>Rewarded</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.rewarded}</p>
          </div>
        </div>
      </div>

      {/* Referrals List */}
      <div>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 12 }}>Your Referrals</h2>

        {referrals.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>
            No referrals yet. Share your code to get started!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {referrals.map((referral) => (
              <div
                key={referral.id}
                style={{
                  padding: 12,
                  border: '1px solid #e0e0e0',
                  borderRadius: 6,
                  backgroundColor: '#f9f9f9',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <p style={{ fontWeight: 'bold' }}>
                    {referral.users?.name || 'Unknown User'}
                  </p>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      backgroundColor:
                        referral.status === 'pending'
                          ? '#fff3e0'
                          : referral.status === 'activated'
                            ? '#f3e5f5'
                            : '#e8f5e9',
                      color:
                        referral.status === 'pending'
                          ? '#f57c00'
                          : referral.status === 'activated'
                            ? '#6a1b9a'
                            : '#2e7d32',
                    }}
                  >
                    {referral.status.toUpperCase()}
                  </span>
                </div>
                {referral.status === 'rewarded' && (
                  <p style={{ fontSize: '0.875rem', color: '#2e7d32', fontWeight: 'bold' }}>
                    ✓ Earned {formatNpr(referral.reward_amount_npr)}
                  </p>
                )}
                <p style={{ fontSize: '0.75rem', color: '#999' }}>
                  {new Date(referral.created_at).toLocaleDateString()}
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
