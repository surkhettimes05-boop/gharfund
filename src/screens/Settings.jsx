import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { signOutFirebaseSession } from '../lib/firebase.js'
import { clearStoredSession, getStoredSession, storeSession } from '../lib/session.js'
import { copyToClipboard } from '../utils/copy.js'
import { identifyUserForAnalytics, trackEvent, trackFeedbackClicked } from '../utils/analytics.js'
import {
  buildFamilyViewShareLink,
  buildFamilyViewUrl,
  buildFounderFeedbackLink,
} from '../utils/whatsapp.js'
import { getCurrentUserProfile, updateCurrentUserProfile } from '../services/userService.js'

const WORK_LOCATIONS = ['Qatar', 'UAE', 'Malaysia', 'Saudi Arabia', 'Other']

export default function Settings() {
  const navigate = useNavigate()
  const session = getStoredSession()
  const [status, setStatus] = useState('loading')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [workingLocation, setWorkingLocation] = useState('Other')
  const [languagePreference, setLanguagePreference] = useState('en')
  const [reminderEnabled, setReminderEnabled] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!session?.supabaseUserId) {
      setError('Your session is missing. Login again.')
      setStatus('error')
      return
    }

    try {
      setStatus('loading')
      setError('')
      const data = await getCurrentUserProfile(session.supabaseUserId)

      if (!data) {
        setError('Your profile could not be found. Login again.')
        setStatus('error')
        return
      }

      setProfile(data)
      setName(data.name)
      setWorkingLocation(data.working_location)
      setLanguagePreference(data.language_preference)
      setReminderEnabled(data.reminder_enabled)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message || 'Could not load your settings.')
      setStatus('error')
    }
  }, [session?.supabaseUserId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadProfile])

  const familyToken = profile?.family_token || ''
  const familyLink = useMemo(() => (familyToken ? buildFamilyViewUrl(familyToken) : ''), [familyToken])
  const familyShareLink = useMemo(
    () => (familyToken ? buildFamilyViewShareLink({ familyToken }) : ''),
    [familyToken],
  )
  const feedbackLink = useMemo(
    () => buildFounderFeedbackLink(),
    [],
  )

  async function handleSignOut() {
    clearStoredSession()

    try {
      await signOutFirebaseSession()
    } catch {
      // Local session reset is enough to route the user out.
    }

    navigate('/auth', { replace: true })
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setCopyStatus('')

    if (!session?.supabaseUserId) {
      setError('Your session is missing. Login again.')
      return
    }

    const trimmedName = name.trim()

    if (!trimmedName || trimmedName.length > 30) {
      setError('Enter a first name up to 30 characters.')
      return
    }

    try {
      setSaveStatus('saving')
      const updatedProfile = await updateCurrentUserProfile(session.supabaseUserId, {
        name: trimmedName,
        working_location: workingLocation,
        language_preference: languagePreference,
        reminder_enabled: reminderEnabled,
      })

      setProfile(updatedProfile)
      const nextSession = {
        ...session,
        name: updatedProfile.name,
        workingLocation: updatedProfile.working_location,
        languagePreference: updatedProfile.language_preference,
        familyToken: updatedProfile.family_token,
        isFounder: updatedProfile.is_founder || false,
      }

      if (profile?.language_preference !== updatedProfile.language_preference) {
        trackEvent('language_changed', {
          session: nextSession,
          user_id: updatedProfile.id,
          working_location: updatedProfile.working_location,
          language: updatedProfile.language_preference,
          properties: {
            from_language: profile?.language_preference || null,
            to_language: updatedProfile.language_preference,
          },
        })
      }

      identifyUserForAnalytics({
        session: nextSession,
        user_id: updatedProfile.id,
        working_location: updatedProfile.working_location,
        language: updatedProfile.language_preference,
      })
      storeSession({
        ...nextSession,
      })
      setSaveStatus('saved')
    } catch (saveError) {
      setError(saveError.message || 'Could not save your settings.')
      setSaveStatus('idle')
    }
  }

  async function handleCopyFamilyLink() {
    if (!familyLink) {
      return
    }

    try {
      await copyToClipboard(familyLink)
      setCopyStatus('Family link copied.')
    } catch {
      setCopyStatus('Could not copy the family link.')
    }
  }

  function handleFeedbackClick() {
    trackFeedbackClicked('settings', { session })
  }

  if (status === 'loading') {
    return <LoadingState eyebrow="Settings" title="Loading settings..." />
  }

  if (status === 'error') {
    return (
      <ErrorState
        eyebrow="Settings"
        title="Settings unavailable."
        message={error}
        onRetry={loadProfile}
        retryLabel="Reload settings"
      />
    )
  }

  return (
    <section className="app-panel" aria-labelledby="settings-title">
      <p className="eyebrow">Settings</p>
      <h1 id="settings-title">Profile and app settings.</h1>

      <form className="settings-form" onSubmit={handleSave}>
        <section className="settings-section">
          <h2 className="settings-section-title">Profile</h2>
          <label className="field-label" htmlFor="settings-name">
            Name
          </label>
          <input
            id="settings-name"
            className="otp-input text-input"
            maxLength={30}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <label className="field-label" htmlFor="settings-phone">
            Phone
          </label>
          <input
            id="settings-phone"
            className="otp-input text-input"
            value={profile?.phone || ''}
            readOnly
          />

          <label className="field-label" htmlFor="settings-location">
            Working location
          </label>
          <select
            id="settings-location"
            className="select-input"
            value={workingLocation}
            onChange={(event) => setWorkingLocation(event.target.value)}
          >
            {WORK_LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Language</h2>
          <div className="segmented-toggle" role="group" aria-label="Language preference">
            <button
              className={`segmented-option${languagePreference === 'en' ? ' segmented-option-active' : ''}`}
              type="button"
              onClick={() => setLanguagePreference('en')}
            >
              English
            </button>
            <button
              className={`segmented-option${languagePreference === 'ne' ? ' segmented-option-active' : ''}`}
              type="button"
              onClick={() => setLanguagePreference('ne')}
            >
              नेपाली
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Family link</h2>
          <div className="summary-card">
            <p className="summary-line settings-link-text">{familyLink || 'Family link unavailable'}</p>
          </div>
          <div className="stack-actions">
            <button
              className="primary-button"
              type="button"
              onClick={handleCopyFamilyLink}
              disabled={!familyLink}
            >
              Copy link
            </button>
            <a
              className={`secondary-link secondary-link-block${familyShareLink ? '' : ' secondary-link-disabled'}`}
              href={familyShareLink || '#'}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!familyShareLink}
            >
              WhatsApp share
            </a>
          </div>
          {copyStatus ? <p className="form-note">{copyStatus}</p> : null}
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Monthly reminder</h2>
          <label className="toggle-row" htmlFor="reminder-enabled">
            <span>Monthly transfer reminder</span>
            <input
              id="reminder-enabled"
              type="checkbox"
              checked={reminderEnabled}
              onChange={(event) => setReminderEnabled(event.target.checked)}
            />
          </label>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">About</h2>
          <div className="summary-card">
            <p className="summary-line">
              <strong>SansarPay v1.0</strong>
            </p>
            <p className="summary-line">Made for Nepali workers</p>
          </div>
          {feedbackLink ? (
            <a
              className="secondary-link secondary-link-block"
              href={feedbackLink}
              target="_blank"
              rel="noreferrer"
              onClick={handleFeedbackClick}
            >
              Send feedback on WhatsApp
            </a>
          ) : (
            <p className="form-note">Feedback WhatsApp link not configured yet.</p>
          )}
        </section>

        <button className="primary-button" type="submit" disabled={saveStatus === 'saving'}>
          {saveStatus === 'saving' ? 'Saving...' : 'Save changes'}
        </button>
        <button className="text-button" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
      {saveStatus === 'saved' ? <p className="form-note">Settings saved.</p> : null}
    </section>
  )
}
