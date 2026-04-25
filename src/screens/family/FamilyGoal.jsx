import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState.jsx'
import ErrorState from '../../components/ErrorState.jsx'
import LoadingState from '../../components/LoadingState.jsx'
import { getFamilyGoalDetail } from '../../services/familyService.js'
import { formatNpr, getGoalEmoji } from '../../utils/money.js'

function getMotivationalMessage(progressPercent) {
  if (progressPercent >= 100) {
    return 'लक्ष्य पूरा भयो। अब अर्को सपना बनाउन सकिन्छ।'
  }

  if (progressPercent >= 75) {
    return 'अब धेरै बाँकी छैन। निरन्तर बचत गर्दै जानुहोस्।'
  }

  if (progressPercent >= 50) {
    return 'आधा बाटो पूरा भयो। राम्रो प्रगति छ।'
  }

  if (progressPercent >= 25) {
    return 'सुरुवात राम्रो छ। यस्तै अघि बढ्नुहोस्।'
  }

  return 'सानो बचतले पनि ठूलो लक्ष्यतिर लैजान्छ।'
}

export default function FamilyGoal() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [goalDetail, setGoalDetail] = useState(null)

  const loadGoalDetail = useCallback(async () => {
    if (!token) {
      setError('यो पारिवारिक लिंक मिलेन।')
      setStatus('error')
      return
    }

    try {
      setStatus('loading')
      setError('')
      const data = await getFamilyGoalDetail(token)
      setGoalDetail(data)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message || 'लक्ष्य विवरण खोल्न सकिएन।')
      setStatus('error')
    }
  }, [token])

  useEffect(() => {
    async function runLoad() {
      await loadGoalDetail()
    }

    void runLoad()
  }, [loadGoalDetail])

  const progressPercent = useMemo(() => {
    if (!goalDetail?.target_amount_npr) {
      return 0
    }

    return Math.min(
      100,
      Math.round(((goalDetail.saved_amount_npr || 0) / goalDetail.target_amount_npr) * 100),
    )
  }, [goalDetail])

  if (status === 'loading') {
    return <LoadingState variant="family" eyebrow="लक्ष्य" title="लोड हुँदैछ..." shell panelClassName="family-panel" />
  }

  if (status === 'error') {
    return (
      <ErrorState
        eyebrow="लक्ष्य"
        title="लक्ष्य उपलब्ध छैन।"
        message={error}
        onRetry={loadGoalDetail}
        retryLabel="फेरि प्रयास गर्नुहोस्"
        shell
        panelClassName="family-panel"
      />
    )
  }

  if (!goalDetail?.goal_id) {
    return (
      <EmptyState
        eyebrow="लक्ष्य"
        title="अहिलेसम्म सक्रिय बचत लक्ष्य छैन।"
        shell
        panelClassName="family-panel"
        actionTo={`/family/${token}`}
        actionLabel="मुख्य पेजमा फर्कनुहोस्"
      />
    )
  }

  return (
    <main className="app-shell">
      <section className="family-panel" aria-labelledby="family-goal-title">
        <p className="eyebrow">लक्ष्य</p>
        <h1 id="family-goal-title">{goalDetail.worker_name || 'परिवार'} को बचत लक्ष्य</h1>

        <div className="summary-card">
          <p className="summary-line">
            <strong>
              {getGoalEmoji(goalDetail.goal_type)} {goalDetail.goal_name}
            </strong>
          </p>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="summary-line">
            {formatNpr(goalDetail.saved_amount_npr)} / {formatNpr(goalDetail.target_amount_npr)}
          </p>
        </div>

        <div className="summary-card">
          <p className="summary-line">{getMotivationalMessage(progressPercent)}</p>
          <p className="summary-line">
            {goalDetail.months_remaining
              ? `${goalDetail.months_remaining} महिना जति बाँकी`
              : 'बाँकी समय अहिले गणना गर्न सकिएको छैन।'}
          </p>
        </div>

        <Link className="secondary-link secondary-link-block" to={`/family/${token}`}>
          मुख्य पेजमा फर्कनुहोस्
        </Link>
      </section>
    </main>
  )
}
