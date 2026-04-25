import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { buildFamilyAcknowledgedLink } from '../utils/whatsapp.js'

function formatNpr(amount) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

function formatTransferMethod(method) {
  if (!method) {
    return 'No method recorded'
  }

  return method
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDisplayDate(dateInput) {
  if (!dateInput) {
    return 'No transfer yet'
  }

  return new Intl.DateTimeFormat('en-NP', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateInput}T00:00:00`))
}

export default function FamilyView() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading')
  const [ackStatus, setAckStatus] = useState('idle')
  const [error, setError] = useState('')
  const [familyData, setFamilyData] = useState(null)

  useEffect(() => {
    async function loadFamilyDashboard() {
      if (!token || !supabase) {
        setError('Family link is not configured correctly.')
        setStatus('error')
        return
      }

      try {
        const { data, error: rpcError } = await supabase.rpc('get_family_dashboard', {
          target_token: token,
        })

        if (rpcError) {
          throw rpcError
        }

        const row = Array.isArray(data) ? data[0] : data

        if (!row) {
          setError('This family link is invalid or expired.')
          setStatus('error')
          return
        }

        setFamilyData(row)
        setStatus('ready')
      } catch (loadError) {
        setError(loadError.message || 'Could not load the family dashboard.')
        setStatus('error')
      }
    }

    loadFamilyDashboard()
  }, [token])

  const goalProgress = useMemo(() => {
    if (!familyData?.active_goal_target_amount_npr) {
      return 0
    }

    return Math.min(
      100,
      Math.round(
        ((familyData.active_goal_saved_amount_npr || 0) /
          familyData.active_goal_target_amount_npr) *
          100,
      ),
    )
  }, [familyData])
  const acknowledgementShareLink = useMemo(
    () => (token ? buildFamilyAcknowledgedLink({ familyToken: token }) : ''),
    [token],
  )

  async function handleAcknowledge() {
    if (!token || !supabase || !familyData?.last_transfer_id) {
      return
    }

    try {
      setAckStatus('saving')
      const { data, error: ackError } = await supabase.rpc('acknowledge_family_transfer', {
        target_token: token,
      })

      if (ackError) {
        throw ackError
      }

      const row = Array.isArray(data) ? data[0] : data

      setFamilyData((current) => ({
        ...current,
        last_transfer_acknowledged: true,
        last_transfer_acknowledged_at: row?.acknowledged_at || new Date().toISOString(),
        view_count: row?.view_count ?? current.view_count,
        last_viewed_at: row?.last_viewed_at ?? current.last_viewed_at,
      }))
      setAckStatus('idle')
    } catch (acknowledgeError) {
      setAckStatus('idle')
      setError(acknowledgeError.message || 'Could not acknowledge the transfer.')
    }
  }

  if (status === 'loading') {
    return (
      <main className="app-shell">
        <section className="family-panel">
          <p className="eyebrow">Family View</p>
          <h1>Loading family dashboard...</h1>
        </section>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="app-shell">
        <section className="family-panel">
          <p className="eyebrow">Family View</p>
          <h1>Family dashboard unavailable.</h1>
          <p className="form-error">{error}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="family-panel" aria-labelledby="family-title">
        <p className="eyebrow">Family View</p>
        <h1 id="family-title">{familyData.worker_name}&apos;s SansarPay</h1>

        <div className="summary-card">
          <p className="summary-line">Last transfer</p>
          <p className="summary-line">
            <strong>{formatNpr(familyData.last_transfer_amount_npr)}</strong>
          </p>
          <p className="summary-line">
            {formatDisplayDate(familyData.last_transfer_date)} via{' '}
            {formatTransferMethod(familyData.last_transfer_method)}
          </p>
        </div>

        <button
          className="primary-button"
          type="button"
          disabled={
            ackStatus === 'saving' ||
            !familyData.last_transfer_id ||
            familyData.last_transfer_acknowledged
          }
          onClick={handleAcknowledge}
        >
          {familyData.last_transfer_acknowledged
            ? `Acknowledged on ${formatDisplayDate(
                familyData.last_transfer_acknowledged_at?.slice(0, 10),
              )}`
            : ackStatus === 'saving'
              ? 'Acknowledging...'
              : 'Received'}
        </button>
        {familyData.last_transfer_acknowledged ? (
          <a
            className="secondary-link secondary-link-block"
            href={acknowledgementShareLink || '#'}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!acknowledgementShareLink}
          >
            Share acknowledgment on WhatsApp
          </a>
        ) : null}

        <div className="summary-card">
          <p className="summary-line">Goal progress</p>
          {familyData.active_goal_id ? (
            <>
              <p className="summary-line">
                <strong>{familyData.active_goal_name}</strong>
              </p>
              <div className="progress-track" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${goalProgress}%` }} />
              </div>
              <p className="summary-line">
                {formatNpr(familyData.active_goal_saved_amount_npr)} saved of{' '}
                {formatNpr(familyData.active_goal_target_amount_npr)} target
              </p>
            </>
          ) : (
            <p className="summary-line">No active savings goal yet.</p>
          )}
        </div>

        <p className="form-note">
          Family link opened {familyData.view_count} time
          {familyData.view_count === 1 ? '' : 's'}.
        </p>
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </main>
  )
}
