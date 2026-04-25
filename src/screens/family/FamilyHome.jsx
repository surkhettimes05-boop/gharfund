import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ErrorState from '../../components/ErrorState.jsx'
import LoadingState from '../../components/LoadingState.jsx'
import { acknowledgeLatestFamilyTransfer, getFamilyHome } from '../../services/familyService.js'
import { trackEvent, trackFeedbackClicked } from '../../utils/analytics.js'
import { formatTransferDate } from '../../utils/date.js'
import { formatNpr } from '../../utils/money.js'
import { buildFounderFeedbackLink } from '../../utils/whatsapp.js'

export default function FamilyHome() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading')
  const [ackStatus, setAckStatus] = useState('idle')
  const [error, setError] = useState('')
  const [familyData, setFamilyData] = useState(null)
  const hasTrackedOpenRef = useRef(false)

  const loadFamilyHome = useCallback(async () => {
    if (!token) {
      setError('यो पारिवारिक लिंक मिलेन।')
      setStatus('error')
      return
    }

    try {
      setStatus('loading')
      setError('')
      const data = await getFamilyHome(token)

      if (!data) {
        setError('यो पारिवारिक लिंक भेटिएन।')
        setStatus('error')
        return
      }

      setFamilyData(data)
      if (!hasTrackedOpenRef.current) {
        trackEvent('family_view_opened', {
          language: 'ne',
          properties: {
            worker_name: data.worker_name,
          },
        })
        hasTrackedOpenRef.current = true
      }
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message || 'परिवार पेज खोल्न सकिएन।')
      setStatus('error')
    }
  }, [token])

  useEffect(() => {
    async function runLoad() {
      await loadFamilyHome()
    }

    void runLoad()
  }, [loadFamilyHome])

  const goalProgress = useMemo(() => {
    if (!familyData?.active_goal_target_amount_npr) {
      return 0
    }

    return Math.min(
      100,
      Math.round(
        ((familyData.active_goal_saved_amount_npr || 0) / familyData.active_goal_target_amount_npr) * 100,
      ),
    )
  }, [familyData])
  const feedbackLink = useMemo(() => buildFounderFeedbackLink(), [])

  async function handleAcknowledge() {
    if (!token || !familyData?.last_transfer_id) {
      return
    }

    try {
      setAckStatus('saving')
      const data = await acknowledgeLatestFamilyTransfer(token)

      setFamilyData((current) => ({
        ...current,
        last_transfer_acknowledged: true,
        last_transfer_acknowledged_at: data?.acknowledged_at || new Date().toISOString(),
        view_count: data?.view_count ?? current.view_count,
        last_viewed_at: data?.last_viewed_at ?? current.last_viewed_at,
      }))
      trackEvent('family_acknowledged', {
        language: 'ne',
        properties: {
          transfer_id: familyData.last_transfer_id,
          worker_name: familyData.worker_name,
        },
      })
      setAckStatus('idle')
    } catch (ackError) {
      setAckStatus('idle')
      setError(ackError.message || 'रकम प्राप्त भएको पुष्टि गर्न सकिएन।')
    }
  }

  function handleFeedbackClick() {
    trackFeedbackClicked('family_acknowledged', {
      language: 'ne',
      properties: {
        worker_name: familyData?.worker_name,
      },
    })
  }

  if (status === 'loading') {
    return <LoadingState variant="family" eyebrow="परिवार" title="लोड हुँदैछ..." shell panelClassName="family-panel" />
  }

  if (status === 'error') {
    return (
      <ErrorState
        eyebrow="परिवार"
        title="पेज उपलब्ध छैन।"
        message={error}
        onRetry={loadFamilyHome}
        retryLabel="फेरि प्रयास गर्नुहोस्"
        shell
        panelClassName="family-panel"
      />
    )
  }

  return (
    <main className="app-shell">
      <section className="family-panel" aria-labelledby="family-home-title">
        <p className="eyebrow">परिवार</p>
        <h1 id="family-home-title">{familyData.worker_name} को अपडेट</h1>

        <div className="summary-card">
          <p className="summary-line">पछिल्लो पठाइएको रकम</p>
          {familyData.last_transfer_id ? (
            <>
              <p className="summary-line">
                <strong>{formatNpr(familyData.last_transfer_amount_npr)}</strong>
              </p>
              <p className="summary-line">{formatTransferDate(familyData.last_transfer_date)}</p>
            </>
          ) : (
            <p className="summary-line">अहिलेसम्म रकम पठाइएको छैन।</p>
          )}
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
            ? 'प्राप्त भएको पुष्टि भइसकेको छ'
            : ackStatus === 'saving'
              ? 'पुष्टि गर्दै...'
              : 'प्राप्त भयो'}
        </button>

        {familyData.last_transfer_acknowledged && feedbackLink ? (
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

        <div className="summary-card">
          <p className="summary-line">बचत लक्ष्य प्रगति</p>
          {familyData.active_goal_id ? (
            <>
              <p className="summary-line">
                <strong>{familyData.active_goal_name}</strong>
              </p>
              <div className="progress-track" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${goalProgress}%` }} />
              </div>
              <p className="summary-line">
                {formatNpr(familyData.active_goal_saved_amount_npr)} /{' '}
                {formatNpr(familyData.active_goal_target_amount_npr)}
              </p>
            </>
          ) : (
            <p className="summary-line">सक्रिय बचत लक्ष्य छैन।</p>
          )}
        </div>

        <div className="stack-actions">
          <Link className="secondary-link secondary-link-block" to={`/family/${token}/history`}>
            रकम इतिहास हेर्नुहोस्
          </Link>
          <Link className="secondary-link secondary-link-block" to={`/family/${token}/goal`}>
            लक्ष्य प्रगति हेर्नुहोस्
          </Link>
        </div>

        <p className="form-note">
          यो लिंक {familyData.view_count} पटक खोलिएको छ।
        </p>
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </main>
  )
}
