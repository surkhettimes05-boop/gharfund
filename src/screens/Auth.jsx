import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createRecaptchaVerifier,
  getFreshFirebaseIdToken,
  isValidNepalPhone,
  normalizeNepalPhone,
  sendPhoneOtp,
} from '../lib/firebase.js'
import { storeSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'
import { identifyUserForAnalytics, trackEvent } from '../utils/analytics.js'

function getAuthErrorMessage(error) {
  const code = error?.code || ''

  if (code.includes('invalid-phone-number')) {
    return 'Enter a valid Nepal mobile number.'
  }

  if (code.includes('too-many-requests')) {
    return 'Too many attempts. Try again later.'
  }

  if (code.includes('invalid-verification-code')) {
    return 'Wrong OTP. Check the code and try again.'
  }

  if (code.includes('captcha')) {
    return 'reCAPTCHA failed. Refresh and try again.'
  }

  return error?.message || 'Authentication failed. Try again.'
}

function getSupabaseErrorMessage(error) {
  if (!error) {
    return ''
  }

  if (error.message?.toLowerCase().includes('row-level security')) {
    return 'Phone verified, but Supabase rejected the profile write. Enable Supabase Firebase third-party auth and ensure Firebase users receive the authenticated role claim.'
  }

  return error.message || 'Could not create user profile.'
}

async function upsertSupabaseUser(phoneNumber, firebaseUid) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        firebase_uid: firebaseUid,
        phone: phoneNumber,
        name: 'SansarPay User',
        working_location: 'Other',
        language_preference: 'ne',
        reminder_enabled: false,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'phone' },
    )
    .select(
      'id, firebase_uid, phone, name, working_location, language_preference, family_token, is_founder',
    )
    .single()

  if (error) {
    throw new Error(getSupabaseErrorMessage(error))
  }

  return data
}

export default function Auth() {
  const navigate = useNavigate()
  const recaptchaRef = useRef(null)
  const confirmationRef = useRef(null)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const normalizedPhone = useMemo(() => normalizeNepalPhone(phone), [phone])
  const canSendOtp = isValidNepalPhone(phone) && status !== 'sending'
  const canVerifyOtp = otp.length === 6 && status !== 'verifying'

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear()
      recaptchaRef.current = null
    }
  }, [])

  useEffect(() => {
    if (step !== 'otp' || !canVerifyOtp || !confirmationRef.current) {
      return
    }

    verifyOtp(otp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step])

  async function ensureRecaptcha() {
    if (!recaptchaRef.current) {
      recaptchaRef.current = createRecaptchaVerifier('recaptcha-container')
    }

    return recaptchaRef.current
  }

  async function handleSendOtp(event) {
    event.preventDefault()
    setError('')

    if (!isValidNepalPhone(phone)) {
      setError('Enter a valid 10-digit Nepal mobile number.')
      return
    }

    try {
      setStatus('sending')
      const verifier = await ensureRecaptcha()
      confirmationRef.current = await sendPhoneOtp(normalizedPhone, verifier)
      setStep('otp')
      setStatus('idle')
    } catch (sendError) {
      recaptchaRef.current?.clear()
      recaptchaRef.current = null
      setStatus('idle')
      setError(getAuthErrorMessage(sendError))
    }
  }

  async function verifyOtp(code) {
    setError('')

    if (!confirmationRef.current) {
      setError('Request a new OTP before verifying.')
      return
    }

    try {
      setStatus('verifying')
      const credential = await confirmationRef.current.confirm(code)
      await getFreshFirebaseIdToken(true)
      const userProfile = await upsertSupabaseUser(normalizedPhone, credential.user.uid)

      const session = {
        firebaseUid: userProfile.firebase_uid,
        phone: userProfile.phone,
        supabaseUserId: userProfile.id,
        name: userProfile.name,
        workingLocation: userProfile.working_location,
        languagePreference: userProfile.language_preference,
        familyToken: userProfile.family_token,
        isFounder: userProfile.is_founder || false,
        needsOnboarding:
          userProfile.name === 'SansarPay User' || userProfile.working_location === 'Other',
        signedInAt: new Date().toISOString(),
      }

      storeSession(session)
      identifyUserForAnalytics({
        session,
        user_id: userProfile.id,
        working_location: userProfile.working_location,
        language: userProfile.language_preference,
      })
      trackEvent('user_signed_up', {
        session,
        user_id: userProfile.id,
        working_location: userProfile.working_location,
        language: userProfile.language_preference,
      })

      setStatus('idle')
      navigate(session.needsOnboarding ? '/onboarding' : '/', { replace: true })
    } catch (verifyError) {
      setStatus('idle')
      setError(getAuthErrorMessage(verifyError))
    }
  }

  function handleOtpChange(event) {
    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
  }

  return (
    <main className="app-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-xl)',
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 0 24px',
            fontSize: '1.5rem',
            color: '#ffffff',
            boxShadow: 'var(--shadow-md)',
          }}
          aria-hidden="true"
        >
          {'\u2726'}
        </div>
        <p className="eyebrow">Secure login</p>
        <h1 id="auth-title" style={{ fontSize: '1.7rem' }}>
          Verify your Nepal phone number
        </h1>
        <p className="lede">
          Enter the mobile number your family knows. We will send a secure 6-digit code.
        </p>

        {step === 'phone' ? (
          <form className="auth-form" onSubmit={handleSendOtp}>
            <label className="field-label" htmlFor="phone">
              Mobile number
            </label>
            <div className="phone-field">
              <span>+977</span>
              <input
                id="phone"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98XXXXXXXX"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))
                }
              />
            </div>
            <button className="primary-button" type="submit" disabled={!canSendOtp}>
              {status === 'sending' ? 'Sending code...' : 'Send secure code'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
            <label className="field-label" htmlFor="otp">
              Code sent to {normalizedPhone}
            </label>
            <input
              id="otp"
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={otp}
              onChange={handleOtpChange}
            />
            <button
              className="primary-button"
              type="button"
              disabled={!canVerifyOtp}
              onClick={() => verifyOtp(otp)}
            >
              {status === 'verifying' ? 'Verifying...' : 'Verify'}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setOtp('')
                setStep('phone')
                setError('')
              }}
            >
              Change number
            </button>
          </form>
        )}

        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div id="recaptcha-container" />

        <p
          className="form-note"
          style={{
            marginTop: 28,
            textAlign: 'center',
            fontSize: '0.82rem',
            color: 'var(--color-text-muted)',
          }}
        >
          Secured by Firebase Authentication. Your data is encrypted.
        </p>
      </section>
    </main>
  )
}
