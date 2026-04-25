import { useCallback, useEffect, useMemo, useState } from 'react'
import ConsistencyScore from '../components/ConsistencyScore.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import MonthGrid from '../components/MonthGrid.jsx'
import StreakHero from '../components/StreakHero.jsx'
import { getStoredSession, storeSession } from '../lib/session.js'
import { getStreakScreenData, setTransferReminder } from '../services/streakService.js'
import { formatTransferDate } from '../utils/date.js'
import { formatNpr } from '../utils/money.js'

export default function Streak() {
  const session = getStoredSession()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [screenData, setScreenData] = useState(null)
  const [selectedMonthKey, setSelectedMonthKey] = useState('')
  const [reminderSaving, setReminderSaving] = useState(false)

  const load = useCallback(async () => {
    if (!session?.supabaseUserId) {
      setError('Your session is missing. Login again.')
      setStatus('error')
      return
    }

    try {
      setStatus('loading')
      setError('')
      const data = await getStreakScreenData(session.supabaseUserId)
      setScreenData(data)
      const defaultMonth =
        data.months.find((month) => month.isCurrentMonth)?.monthKey || data.months[0]?.monthKey || ''
      setSelectedMonthKey(defaultMonth)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message || 'Could not load the streak screen.')
      setStatus('error')
    }
  }, [session?.supabaseUserId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [load])

  const selectedMonth = useMemo(
    () => screenData?.months.find((month) => month.monthKey === selectedMonthKey) || null,
    [screenData, selectedMonthKey],
  )

  async function handleReminderToggle(event) {
    const reminderEnabled = event.target.checked

    if (!session?.supabaseUserId || !screenData) {
      return
    }

    try {
      setReminderSaving(true)
      const updatedProfile = await setTransferReminder(session.supabaseUserId, reminderEnabled)
      setScreenData((current) => ({
        ...current,
        profile: updatedProfile,
      }))
      storeSession({
        ...session,
        reminderEnabled: updatedProfile.reminder_enabled,
      })
      setError('')
    } catch (saveError) {
      setError(saveError.message || 'Could not update reminder preference.')
    } finally {
      setReminderSaving(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState eyebrow="Streak" title="Loading streak data." />
  }

  if (status === 'error') {
    return (
      <ErrorState
        eyebrow="Streak"
        title="Could not load this screen."
        message={error}
        onRetry={load}
        retryLabel="Reload streak"
        linkTo="/transfers"
        linkLabel="Back to transfers"
      />
    )
  }

  return (
    <section className="app-panel" aria-labelledby="streak-title">
      <p className="eyebrow">Habit tracking</p>
      <h1 id="streak-title" style={{ fontSize: '1.6rem' }}>Monthly consistency</h1>
      <p className="lede">
        Stay consistent each month and build trust with your family.
      </p>

      <div className="dashboard-grid">
        <StreakHero
          currentStreak={screenData.streak.currentStreak}
          motivationalCopy={screenData.motivationalCopy}
        />
        <MonthGrid
          months={screenData.months}
          selectedMonthKey={selectedMonthKey}
          onSelectMonth={setSelectedMonthKey}
        />
        <ConsistencyScore score={screenData.streak.consistencyScore} />

        <div className="dashboard-card">
          <p className="card-label">Reminder</p>
          <label className="toggle-row" htmlFor="streak-reminder">
            <span>Monthly transfer reminder</span>
            <input
              id="streak-reminder"
              type="checkbox"
              checked={Boolean(screenData.profile.reminder_enabled)}
              onChange={handleReminderToggle}
              disabled={reminderSaving}
            />
          </label>
          {screenData.profile.reminder_enabled ? (
            <p className="card-copy">Reminder set for the 5th of each month</p>
          ) : null}
        </div>

        <div className="dashboard-card">
          <p className="card-label">{selectedMonth?.fullLabel || 'Month detail'}</p>
          {selectedMonth?.transfers.length ? (
            <div className="month-detail-list">
              {selectedMonth.transfers.map((transfer) => (
                <div key={transfer.id} className="summary-card">
                  <p className="summary-line">
                    <strong>{formatNpr(transfer.amount_npr)}</strong>
                  </p>
                  <p className="summary-line">{formatTransferDate(transfer.transfer_date)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="card-copy">
              {selectedMonth?.status === 'pending'
                ? 'Current month is still open. Log a transfer to keep the streak alive.'
                : 'No confirmed transfer for this month.'}
            </p>
          )}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
    </section>
  )
}
