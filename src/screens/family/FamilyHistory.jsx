import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState.jsx'
import ErrorState from '../../components/ErrorState.jsx'
import LoadingState from '../../components/LoadingState.jsx'
import { getFamilyHistory } from '../../services/familyService.js'
import { formatTransferDate, formatTransferMethod, getCurrentYear } from '../../utils/date.js'
import { formatNpr } from '../../utils/money.js'

export default function FamilyHistory() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [history, setHistory] = useState(null)

  const loadHistory = useCallback(async () => {
    if (!token) {
      setError('यो पारिवारिक लिंक मिलेन।')
      setStatus('error')
      return
    }

    try {
      setStatus('loading')
      setError('')
      const data = await getFamilyHistory(token)
      setHistory(data)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message || 'इतिहास खोल्न सकिएन।')
      setStatus('error')
    }
  }, [token])

  useEffect(() => {
    async function runLoad() {
      await loadHistory()
    }

    void runLoad()
  }, [loadHistory])

  if (status === 'loading') {
    return <LoadingState variant="family" eyebrow="इतिहास" title="लोड हुँदैछ..." shell panelClassName="family-panel" />
  }

  if (status === 'error') {
    return (
      <ErrorState
        eyebrow="इतिहास"
        title="इतिहास उपलब्ध छैन।"
        message={error}
        onRetry={loadHistory}
        retryLabel="फेरि प्रयास गर्नुहोस्"
        shell
        panelClassName="family-panel"
      />
    )
  }

  if (!history?.transfers?.length) {
    return (
      <EmptyState
        eyebrow="इतिहास"
        title="अहिलेसम्म कुनै रकम इतिहास छैन।"
        shell
        panelClassName="family-panel"
        actionTo={`/family/${token}`}
        actionLabel="मुख्य पेजमा फर्कनुहोस्"
      />
    )
  }

  return (
    <main className="app-shell">
      <section className="family-panel" aria-labelledby="family-history-title">
        <p className="eyebrow">इतिहास</p>
        <h1 id="family-history-title">{history?.workerName || 'परिवार'} को रकम इतिहास</h1>

        <div className="summary-card">
          <p className="summary-line">{getCurrentYear()} सालको जम्मा</p>
          <p className="summary-line">
            <strong>{formatNpr(history?.yearlyTotal || 0)}</strong>
          </p>
        </div>

        <div className="transfer-history-list">
          {history.transfers.map((transfer) => (
            <div key={transfer.transfer_id} className="transfer-row">
              <div className="transfer-row-main">
                <div>
                  <p className="transfer-row-date">{formatTransferDate(transfer.transfer_date)}</p>
                  <p className="transfer-row-amount">{formatNpr(transfer.amount_npr)}</p>
                </div>
                <span className="transfer-method-badge">{formatTransferMethod(transfer.method)}</span>
              </div>
              <div className="transfer-row-meta">
                <span className="transfer-status">
                  <span className="status-dot status-dot-confirmed" aria-hidden="true" />
                  पठाइएको
                </span>
                <span className="transfer-acknowledged">
                  {transfer.acknowledged_by_family ? 'परिवारले पुष्टि गरेको' : 'पुष्टि बाँकी'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Link className="secondary-link secondary-link-block" to={`/family/${token}`}>
          मुख्य पेजमा फर्कनुहोस्
        </Link>
      </section>
    </main>
  )
}
