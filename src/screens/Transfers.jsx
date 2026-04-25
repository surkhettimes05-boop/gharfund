import { useCallback, useEffect, useMemo, useState } from 'react'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatsBar from '../components/StatsBar.jsx'
import TransferRow from '../components/TransferRow.jsx'
import { getStoredSession } from '../lib/session.js'
import { getUserTransfers } from '../services/transferService.js'
import { groupTransfersByMonth } from '../utils/date.js'
import { calculateTransferStats } from '../utils/money.js'

export default function Transfers() {
  const session = getStoredSession()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [transfers, setTransfers] = useState([])

  const loadTransfers = useCallback(async () => {
    if (!session?.supabaseUserId) {
      setError('Your session is missing. Login again.')
      setStatus('error')
      return
    }

    try {
      setStatus('loading')
      setError('')
      const rows = await getUserTransfers(session.supabaseUserId)
      setTransfers(rows)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message || 'Could not load transfer history.')
      setStatus('error')
    }
  }, [session?.supabaseUserId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTransfers()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadTransfers])

  const stats = useMemo(() => calculateTransferStats(transfers), [transfers])
  const groupedTransfers = useMemo(() => groupTransfersByMonth(transfers), [transfers])

  if (status === 'loading') {
    return <LoadingState eyebrow="Transfers" title="Loading transfer history..." />
  }

  if (status === 'error') {
    return (
      <ErrorState
        eyebrow="Transfers"
        title="Transfer history unavailable."
        message={error}
        onRetry={loadTransfers}
        retryLabel="Reload transfers"
      />
    )
  }

  if (!transfers.length) {
    return (
      <EmptyState
        eyebrow="Transfers"
        title="No transfers yet. Log your first one!"
        actionTo="/log-transfer"
        actionLabel="Log transfer"
      />
    )
  }

  return (
    <section className="app-panel" aria-labelledby="transfers-title">
      <p className="eyebrow">Transfers</p>
      <h1 id="transfers-title">Transfer history</h1>

      <StatsBar stats={stats} />

      <div className="transfer-history-list">
        {groupedTransfers.map((group) => (
          <section key={group.monthKey} className="transfer-month-group">
            <h2 className="transfer-month-heading">{group.label}</h2>
            <div className="transfer-month-items">
              {group.items.map((transfer) => (
                <TransferRow key={transfer.id} transfer={transfer} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
