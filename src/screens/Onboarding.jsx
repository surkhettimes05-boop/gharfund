import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getStoredSession, storeSession } from '../lib/session.js'

const WORK_LOCATIONS = ['Qatar', 'UAE', 'Malaysia', 'Saudi Arabia', 'Other']

export default function Onboarding() {
  const navigate = useNavigate()
  const session = getStoredSession()
  const [name, setName] = useState(session?.name === 'SansarPay User' ? '' : session?.name || '')
  const [workingLocation, setWorkingLocation] = useState(
    session?.workingLocation || 'Qatar',
  )
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!session?.firebaseUid || !supabase) {
      setError('Session missing. Login again.')
      return
    }

    const trimmedName = name.trim()

    if (!trimmedName || trimmedName.length > 30) {
      setError('Enter a first name up to 30 characters.')
      return
    }

    try {
      setStatus('saving')
      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          name: trimmedName,
          working_location: workingLocation,
          last_active_at: new Date().toISOString(),
        })
        .eq('firebase_uid', session.firebaseUid)
        .select('id, firebase_uid, phone, name, working_location, language_preference, family_token, is_founder')
        .single()

      if (updateError) {
        throw updateError
      }

      storeSession({
        firebaseUid: data.firebase_uid,
        supabaseUserId: data.id,
        phone: data.phone,
        name: data.name,
        workingLocation: data.working_location,
        languagePreference: data.language_preference,
        familyToken: data.family_token,
        isFounder: data.is_founder || false,
        needsOnboarding: false,
        signedInAt: session.signedInAt,
      })

      navigate('/', { replace: true })
    } catch (saveError) {
      setStatus('idle')
      setError(saveError.message || 'Could not save onboarding details.')
      return
    }

    setStatus('idle')
  }

  return (
    <main className="app-shell">
      <section className="auth-panel" aria-labelledby="onboarding-title">
        <p className="eyebrow">Onboarding</p>
        <h1 id="onboarding-title">Complete your worker profile.</h1>
        <p className="lede">
          This links your verified phone to the corridor and language settings used
          across SansarPay.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="worker-name">
            First name
          </label>
          <input
            id="worker-name"
            className="otp-input text-input"
            maxLength={30}
            placeholder="Ramesh"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <label className="field-label" htmlFor="working-location">
            Working location
          </label>
          <select
            id="working-location"
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

          <button className="primary-button" type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving...' : 'Continue'}
          </button>
        </form>

        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </section>
    </main>
  )
}
